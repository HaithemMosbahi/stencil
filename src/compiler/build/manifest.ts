import { BuildConfig, BuildContext, Bundle, Collection, CompileResults, Manifest } from '../interfaces';
import { COLLECTION_MANIFEST_FILE_NAME } from '../../util/constants';
import { normalizePath, readFile } from '../util';
import { validateDependentCollection, validateUserBundles } from './validation';
import { parseDependentManifest, serializeProjectManifest } from './manifest-data';


export function loadDependentManifests(config: BuildConfig) {
  return Promise.all(config.collections.map(userInput => {
    const dependentCollection = validateDependentCollection(userInput);
    return loadDependentManifest(config, dependentCollection);
  }));
}


function loadDependentManifest(config: BuildConfig, dependentCollection: Collection) {
  const sys = config.sys;

  const dependentManifestFilePath = sys.resolveModule(config.rootDir, dependentCollection.name);
  const dependentManifestDir = sys.path.dirname(dependentManifestFilePath);

  return readFile(sys, dependentManifestFilePath).then(dependentManifestJson => {
    const dependentManifest = parseDependentManifest(config, dependentManifestDir, dependentManifestJson);

    return processDependentManifest(config.bundles, dependentCollection, dependentManifest);
  });
}


export function processDependentManifest(bundles: Bundle[], dependentCollection: Collection, dependentManifest: Manifest) {
  if (dependentCollection.includeBundledOnly) {
    // what was imported included every component this collection has
    // however, the user only want to include specific components
    // which are seen within their own bundles
    // loop through this manifest an take out components which are not
    // seen in the user's list of bundled components
    dependentManifest.components = dependentManifest.components.filter(c => {
      return bundles.some(b => b.components.indexOf(c.tagNameMeta) > -1);
    });
  }

  return dependentManifest;
}


export function mergeManifests(manifestPriorityList: Manifest[]): Manifest {
  const removedComponents: string[] = [];

  const m = manifestPriorityList.reduce((allData, collectionManifest) => {
    allData.collectionGlobals = allData.collectionGlobals || [];

    const bundles = (collectionManifest.bundles || []).map(bundle => {
        const components = (bundle.components || []).filter(tag => removedComponents.indexOf(tag) === -1);

        components.forEach(tag => removedComponents.push(tag));

        return {
          ...bundle,
          components
        };
      })
      .filter((bundle: Bundle) => bundle.components.length !== 0);

    return {
      components: allData.components.concat(collectionManifest.components),
      bundles: allData.bundles.concat(bundles),
      collectionGlobals: allData.collectionGlobals.concat(collectionManifest.collectionGlobals || [])
    };
  }, <Manifest>{ components: [], bundles: []});

  return m;
}


export function generateManifest(config: BuildConfig, compileResults: CompileResults) {
  // validate we're good to go
  validateUserBundles(config.bundles);

  // create the single manifest we're going to fill up with data
  const manifest: Manifest = {
    components: [],
    componentModulesFiles: [],
    bundles: []
  };

  // get all of the filenames of the compiled files
  const fileNames = Object.keys(compileResults.moduleFiles);

  // loop through the compiled files and fill up the manifest w/ serialized component data
  fileNames.forEach(fileName => {
    const moduleFile = compileResults.moduleFiles[fileName];

    if (!moduleFile.cmpMeta || !moduleFile.cmpMeta.tagNameMeta) {
      // this isn't a component, let's not add it to the manifest
      return;
    }

    const includeComponent = config.bundles.some(b => {
      return b.components.some(c => c === moduleFile.cmpMeta.tagNameMeta);
    });

    if (!includeComponent) {
      // looks like we shouldn't include this component
      // cuz it wasn't in any of the build config's bundles
      return;
    }

    // awesome, good to go, let's add it to the manifest's components
    manifest.components.push(moduleFile.cmpMeta);
    manifest.componentModulesFiles.push(moduleFile);
  });

  return manifest;
}


export function writeManifest(config: BuildConfig, ctx: BuildContext, manifest: Manifest) {
  // if we're also generating the collection, then we want to
  if (!config.generateCollection) return;

  // get the absolute path to the directory where the manifest will be saved
  const manifestDir = normalizePath(config.collectionDir);

  // create an absolute path to the actual manifest json file
  const manifestFilePath = normalizePath(config.sys.path.join(manifestDir, COLLECTION_MANIFEST_FILE_NAME));

  config.logger.debug(`manifest, serializeProjectManifest: ${manifestFilePath}`);

  // serialize the manifest into a json string and
  // add it to the list of files we need to write when we're ready
  ctx.filesToWrite[manifestFilePath] = serializeProjectManifest(config, manifestDir, manifest);
}
