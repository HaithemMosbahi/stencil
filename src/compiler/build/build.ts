import { BuildConfig, BuildResults, LoggerTimeSpan } from '../../util/interfaces';
import { bundle } from '../bundle/bundle';
import { catchError, getBuildContext, resetBuildContext } from '../util';
import { cleanDiagnostics } from '../../util/logger/logger-util';
import { compileSrcDir } from './compile';
import { generateHtmlDiagnostics } from '../../util/logger/generate-html-diagnostics';
import { generateProjectFiles } from '../project/generate-project-files';
import { generateProjectManifest } from '../manifest/generate-manifest';
import { optimizeIndexHtml } from './optimize-index-html';
import { setupWatcher } from './watch';
import { validateBuildConfig } from './validation';
import { writeBuildFiles } from './write-build';


export function build(config: BuildConfig, context?: any) {
  // create a timespan of the build process
  let timeSpan: LoggerTimeSpan;

  // create the build context if it doesn't exist
  // the buid context is the same object used for all builds and rebuilds
  // ctx is where stuff is cached for fast in-memory lookups later
  const ctx = getBuildContext(context);

  // reset the build context, this is important for rebuilds
  resetBuildContext(ctx);

  // create the build results that get returned
  const buildResults: BuildResults = {
    files: [],
    diagnostics: [],
    manifest: {},
    changedFiles: ctx.isRebuild ? ctx.changedFiles : null
  };

  // begin the build
  return Promise.resolve().then(() => {
    // validate the build config
    validateBuildConfig(config);

    // keep track of how long the entire build process takes
    timeSpan = config.logger.createTimeSpan(`${ctx.isRebuild ? 'rebuild' : 'build'}, ${config.devMode ? 'dev' : 'prod'} mode, started`);

  }).then(() => {
    // async scan the src directory for ts files
    // then transpile them all in one go
    return compileSrcDir(config, ctx);

  }).then(compileResults => {
    // generation the project manifest from the compiled results
    // and from all the dependent collections
    return generateProjectManifest(config, ctx, compileResults.moduleFiles);

  }).then(() => {
    // bundle modules and styles into separate files phase
    return bundle(config, ctx);

  }).then(() => {
    // generate the project files, such as app.js, app.core.js
    return generateProjectFiles(config, ctx);

  }).then(() => {
    // optimize index.html
    return optimizeIndexHtml(config, ctx);

  }).then(() => {
    // write all the files and copy asset files
    return writeBuildFiles(config, ctx, buildResults);

  }).then(() => {
    // setup watcher if need be
    return setupWatcher(config, ctx);

  }).catch(err => {
    // catch all phase
    catchError(ctx.diagnostics, err);

  }).then(() => {
    // finalize phase
    if (config) {
      // check for config cuz it could have been undefined
      buildResults.diagnostics = cleanDiagnostics(ctx.diagnostics);
      config.logger.printDiagnostics(buildResults.diagnostics);
      generateHtmlDiagnostics(config, buildResults.diagnostics);
    }

    if (timeSpan) {
      // create a nice pretty message stating what happend
      let buildText = ctx.isRebuild ? 'rebuild' : 'build';
      let buildStatus = 'finished';
      let watchText = config.watch ? ', watching for changes...' : '';
      let statusColor = 'green';

      if (ctx.diagnostics.some(d => d.level === 'error')) {
        buildStatus = 'failed';
        statusColor = 'red';
      }

      timeSpan.finish(`${buildText} ${buildStatus}${watchText}`, statusColor, true, true);
    }

    if (typeof ctx.onFinish === 'function') {
      // fire off any provided onFinish fn every time the build finishes
      ctx.onFinish(buildResults);
    }

    // remember if the last build had an error or not
    // this is useful if the next build should do a full build or not
    ctx.lastBuildHadError = (ctx.diagnostics.some(d => d.level === 'error'));

    // return what we've learned today
    return buildResults;
  });
}
