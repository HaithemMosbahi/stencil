import { HYDRATED_CSS } from '../util/constants';
import { BuildContext, BuildConfig, ComponentMeta, Manifest, Bundle, StylesResults } from './interfaces';
import { formatCssBundleFileName, generateBundleId } from '../util/data-serialize';
import { isCssSourceFile, isSassSourceFile, generateBanner, normalizePath, readFile } from './util';


export function bundleStyles(buildConfig: BuildConfig, ctx: BuildContext, userManifest: Manifest) {
  // create main style results object
  const stylesResults: StylesResults = {
    bundles: {},
    diagnostics: []
  };

  // do bundling if this is not a change build
  // or it's a change build that has either changed sass or css
  const doBundling = (!ctx.isChangeBuild || ctx.changeHasCss || ctx.changeHasSass);

  const timeSpan = buildConfig.logger.createTimeSpan(`bundle styles started`, !doBundling);

  // go through each bundle the user wants created
  // and create css files for each mode for each bundle
  return Promise.all(userManifest.bundles.map(userBundle => {
    return generateBundleCss(buildConfig, ctx, userManifest, userBundle, stylesResults);
  }))
  .catch(err => {
    stylesResults.diagnostics.push({
      msg: err.toString(),
      type: 'error',
      stack: err.stack
    });

  })
  .then(() => {
    timeSpan.finish('bundle styles finished');
    return stylesResults;
  });
}


function generateBundleCss(buildConfig: BuildConfig, ctx: BuildContext, userManifest: Manifest, userBundle: Bundle, stylesResults: StylesResults) {
  // multiple modes can be on each component
  // and multiple components can be in each bundle
  // create css files with the common modes for the bundle's components

  // collect only the component meta data this bundle needs
  const bundleComponentMeta = userBundle.components.sort().map(userBundleComponentTag => {
    const foundComponentMeta = userManifest.components.find(manifestComponent => (
      manifestComponent.tagNameMeta === userBundleComponentTag
    ));

    if (!foundComponentMeta) {
      stylesResults.diagnostics = stylesResults.diagnostics || [];
      stylesResults.diagnostics.push({
        msg: `Component tag "${userBundleComponentTag.toLowerCase()}" is defined in a bundle but no matching component was found with this tag within this project or its collections.`,
        type: 'error'
      });
    }
    return foundComponentMeta;
  }).filter(c => c);

  // figure out all of the possible modes this bundle has
  let bundleModes: string[] = [];
  bundleComponentMeta
    .filter(cmpMeta => cmpMeta.styleMeta)
    .forEach(cmpMeta => {
      Object.keys(cmpMeta.styleMeta).forEach(modeName => {
        if (bundleModes.indexOf(modeName) === -1) {
          bundleModes.push(modeName);
        }
      });
  });
  bundleModes = bundleModes.sort();

  // go through each mode this bundle has
  // and create a css file for this each mode in this bundle
  return Promise.all(bundleModes.map(modeName => {
    return generateModeCss(buildConfig, ctx, bundleComponentMeta, userBundle, modeName, stylesResults);

  })).catch(err => {
    stylesResults.diagnostics.push({
      msg: err.toString(),
      type: 'error',
      stack: err.stack
    });

  }).then(() => {
    return stylesResults;
  });
}


function generateModeCss(
  buildConfig: BuildConfig,
  ctx: BuildContext,
  bundleComponentMeta: ComponentMeta[],
  userBundle: Bundle,
  modeName: string,
  stylesResults: StylesResults
) {
  // within WORKER thread
  // loop through each component in this bundle
  // and create a css file for all the same modes
  const sys = buildConfig.sys;

  return Promise.all(bundleComponentMeta.map(cmpMeta => {
    return generateComponentModeStyles(buildConfig, ctx, cmpMeta, modeName, stylesResults);

  })).then(styleBundles => {
    const writeFile = styleBundles.some(s => s.writeFile);
    const styleContents = styleBundles.map(s => s.content);

    // tack on the visibility css to each component tag selector
    styleContents.push(appendVisibilityCss(bundleComponentMeta));

    // let's join all bundled component mode css together
    let styleContent = styleContents.join('\n\n').trim();

    // generate a unique internal id for this bundle (this isn't the hashed bundle id)
    const bundleId = generateBundleId(userBundle.components);

    // we've built up some css content for this mode
    // ensure we've got some good objects before we start assigning stuff
    const stylesResult = stylesResults.bundles[bundleId] = stylesResults.bundles[bundleId] || {};

    if (buildConfig.minifyCss) {
      // minify css
      const minifyCssResults = sys.minifyCss(styleContent);
      minifyCssResults.diagnostics.forEach(d => {
        stylesResults.diagnostics.push(d);
      });

      if (minifyCssResults.output) {
        styleContent = minifyCssResults.output;
      }
    }

    if (buildConfig.hashFileNames) {
      // create style id from hashing the content
      stylesResult[modeName] = sys.generateContentHash(styleContent, buildConfig.hashedFileNameLength);

    } else {
      // create style id from list of component tags in this file
      stylesResult[modeName] = (userBundle.components.sort().join('.')).toLowerCase();

      if (modeName !== '$') {
        // prefix with the mode name if it's not the default mode
        stylesResult[modeName] = modeName + '.' + stylesResult[modeName];
      }

      if (stylesResult[modeName].length > 50) {
        // can get a lil too long, so let's simmer down
        stylesResult[modeName] = stylesResult[modeName].substr(0, 50);
      }
    }

    if (writeFile) {
      // create the file name and path of where the bundle will be saved
      const styleFileName = formatCssBundleFileName(stylesResult[modeName]);
      const styleFilePath = sys.path.join(
        buildConfig.buildDest,
        buildConfig.namespace.toLowerCase(),
        styleFileName
      );

      ctx.styleBundleCount++;

      ctx.filesToWrite[styleFilePath] = generateBanner(buildConfig) + styleContent;
    }
  });
}


function generateComponentModeStyles(
  buildConfig: BuildConfig,
  ctx: BuildContext,
  cmpMeta: ComponentMeta,
  modeName: string,
  stylesResults: StylesResults
) {
  const modeStyleMeta = cmpMeta.styleMeta[modeName];

  const promises: Promise<StyleBundleDetails>[] = [];

  // used to remember the exact order the user wants
  // sass render and file reads are async so it could mess with the order
  const styleCollection: StyleCollection = {};

  if (modeStyleMeta) {
    if (modeStyleMeta.styleUrls) {
      modeStyleMeta.styleUrls.forEach(styleUrl => {
        styleUrl = normalizePath(styleUrl);

        styleCollection[styleUrl] = '';

        if (isSassSourceFile(styleUrl)) {
          // sass file needs to be compiled
          promises.push(compileScssFile(buildConfig, ctx, cmpMeta, styleUrl, styleCollection, stylesResults));

        } else if (isCssSourceFile(styleUrl)) {
          // plain ol' css file
          promises.push(readCssFile(buildConfig, ctx, styleUrl, styleCollection, stylesResults));

        } else {
          // idk
          stylesResults.diagnostics.push({
            msg: `style url "${styleUrl}" on component "${cmpMeta.tagNameMeta.toLowerCase()}" is not a supported file type`,
            type: 'error'
          });
        }
      });
    }

    if (typeof modeStyleMeta.styleStr === 'string' && modeStyleMeta.styleStr.trim().length) {
      // plain styles as a string
      styleCollection['styleStr'] = modeStyleMeta.styleStr.trim();
    }
  }

  return Promise.all(promises).then(results => {
    // we've loaded everything, let's join them together
    // using the style collection object as a way to keep the same order
    const styleBundleDetails: StyleBundleDetails = {
      content: Object.keys(styleCollection)
                .map(key => styleCollection[key])
                .join('\n\n').trim(),
      writeFile: results.some(r => r.writeFile)
    };
    return styleBundleDetails;
  });
}


function compileScssFile(buildConfig: BuildConfig, ctx: BuildContext, cmpMeta: ComponentMeta, styleUrl: string, styleCollection: StyleCollection, stylesResults: StylesResults): Promise<StyleBundleDetails> {
  const styleBundleDetails: StyleBundleDetails = {};
  const sys = buildConfig.sys;
  const scssFilePath = normalizePath(sys.path.join(buildConfig.src, styleUrl));

  if (ctx.isChangeBuild && !ctx.changeHasSass) {
    // if this is a change build, but there wasn't specifically a sass file change
    // however we may still need to build sass if its typescript module changed

    // loop through all the changed typescript filename and see if there are corresponding js filenames
    // if there are no filenames that match then let's not run sass
    // yes...there could be two files that have the same filename in different directories
    // but worst case scenario is that both of them run sass, which isn't a performance problem
    const distFileName = sys.path.basename(cmpMeta.componentUrl, '.js');
    const hasChangedFileName = ctx.changedFiles.some(f => {
      const changedFileName = sys.path.basename(f);
      return (changedFileName === distFileName + '.ts' || changedFileName === distFileName + '.tsx');
    });

    if (!hasChangedFileName && ctx.styleSassOutputs[scssFilePath]) {
      // don't bother running sass on this, none of the changed files have the same filename
      // use the cached version
      styleCollection[styleUrl] = ctx.styleSassOutputs[scssFilePath];
      styleBundleDetails.content = ctx.styleSassOutputs[scssFilePath];
      styleBundleDetails.writeFile = false;
      return Promise.resolve(styleBundleDetails);
    }
  }

  return new Promise(resolve => {
    const sassConfig = {
      file: scssFilePath,
      outputStyle: buildConfig.devMode ? 'expanded' : 'compressed',
    };

    sys.sass.render(sassConfig, (err, result) => {
      if (err) {
        stylesResults.diagnostics.push({
          filePath: scssFilePath,
          msg: `${err}`,
          type: 'error',
          stack: err.stack
        });

      } else {

        styleBundleDetails.content = result.css.toString().trim();
        styleCollection[styleUrl] = styleBundleDetails.content;
        styleBundleDetails.writeFile = true;

        ctx.sassBuildCount++;

        // cache for later
        ctx.styleSassOutputs[scssFilePath] = styleBundleDetails.content;
      }
      resolve(styleBundleDetails);
    });
  });
}


function readCssFile(buildConfig: BuildConfig, ctx: BuildContext, styleUrl: string, styleCollection: StyleCollection, stylesResults: StylesResults) {
  const styleBundleDetails: StyleBundleDetails = {};

  if (ctx.isChangeBuild && !ctx.changeHasCss) {
    // if this is a change build, but there were no sass changes then don't bother
    styleBundleDetails.writeFile = false;
    return Promise.resolve(styleBundleDetails);
  }

  // this is just a plain css file
  // only open it up for its content
  const sys = buildConfig.sys;

  const cssFilePath = normalizePath(sys.path.join(buildConfig.src, styleUrl));

  return readFile(sys, cssFilePath).then(cssText => {
    cssText = cssText.toString().trim();

    styleCollection[styleUrl] = cssText;
    styleBundleDetails.content = cssText;
    styleBundleDetails.writeFile = true;

  }).catch(err => {
    stylesResults.diagnostics.push({
      filePath: cssFilePath,
      msg: `Error opening file. ${err}`,
      type: 'error',
      stack: err.stack
    });

  }).then(() => {
    return styleBundleDetails;
  });
}


function appendVisibilityCss(bundleComponentMeta: ComponentMeta[]) {
  // always tack this css to each component tag css
  const selector = bundleComponentMeta.map(c => {
    return `${c.tagNameMeta}.${HYDRATED_CSS}`;
  }).join(',\n');

  return `${selector} {\n  visibility: inherit;\n}`;
}


interface StyleBundleDetails {
  content?: string;
  writeFile?: boolean;
}


interface StyleCollection {
  [styleKey: string]: string;
}

