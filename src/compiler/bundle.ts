import { ATTR_DASH_CASE, ATTR_LOWER_CASE } from '../util/constants';
import { bundleModules } from './bundle-modules';
import { BuildConfig, BundleResults, BundlerConfig } from './interfaces';
import { bundleStyles } from './bundle-styles';
import { generateComponentRegistry } from './bundle-registry';
import { WorkerManager } from './worker-manager';


export function bundle(buildConfig: BuildConfig, bundlerConfig: BundlerConfig, workerManager: WorkerManager) {
  // within MAIN thread
  const logger = buildConfig.logger;
  const timeSpan = logger.createTimeSpan(`bundle started`);

  const bundleResults: BundleResults = {
    filesToWrite: {},
    diagnostics: [],
    componentRegistry: []
  };

  logger.debug(`bundle, src: ${buildConfig.src}`);
  logger.debug(`bundle, dest: ${buildConfig.dest}`);

  return Promise.resolve().then(() => {
    validateBundlerConfig(bundlerConfig);

    // kick off style and module bundling at the same time
    return Promise.all([
      bundleStyles(buildConfig, workerManager, bundlerConfig.manifest),
      bundleModules(buildConfig, workerManager, bundlerConfig.manifest)
    ]);

  }).then(results => {
    // both styles and modules are done bundling
    const styleResults = results[0];
    if (styleResults.diagnostics) {
      bundleResults.diagnostics = bundleResults.diagnostics.concat(styleResults.diagnostics);
    }
    if (styleResults.filesToWrite) {
      Object.assign(bundleResults.filesToWrite, styleResults.filesToWrite);
    }

    const moduleResults = results[1];
    if (moduleResults.diagnostics && moduleResults.diagnostics.length) {
      bundleResults.diagnostics = bundleResults.diagnostics.concat(moduleResults.diagnostics);
    }
    if (moduleResults.filesToWrite) {
      Object.assign(bundleResults.filesToWrite, moduleResults.filesToWrite);
    }

    bundleResults.componentRegistry = generateComponentRegistry(buildConfig, bundlerConfig, styleResults, moduleResults, bundleResults.filesToWrite);

  })
  .catch(err => {
    bundleResults.diagnostics.push({
      msg: err.toString(),
      type: 'error',
      stack: err.stack
    });

  })
  .then(() => {
    timeSpan.finish('bundle, done');
    return bundleResults;
  });
}


function validateBundlerConfig(bundlerConfig: BundlerConfig) {
  bundlerConfig.attrCase = normalizeAttrCase(bundlerConfig.attrCase);

  if (!bundlerConfig.manifest) {
    throw new Error('config.manifest required');
  }
  if (!bundlerConfig.manifest.bundles) {
    throw new Error('config.manifest.bundles required');
  }
  if (!bundlerConfig.manifest.components) {
    throw new Error('config.manifest.components required');
  }

  // sort by tag name and ensure they're lower case
  bundlerConfig.manifest.bundles.forEach(b => {
    b.components = b.components.sort().map(c => c.toLowerCase().trim());
  });

  bundlerConfig.manifest.components.forEach(c => {
    c.tagNameMeta = c.tagNameMeta.toLowerCase().trim();
  });
}


function normalizeAttrCase(attrCase: any) {
  if (attrCase === ATTR_LOWER_CASE || attrCase === ATTR_DASH_CASE) {
    // already using a valid attr case value
    return attrCase;
  }

  if (typeof attrCase === 'string') {
    if (attrCase.trim().toLowerCase() === 'dash') {
      return ATTR_DASH_CASE;
    }

    if (attrCase.trim().toLowerCase() === 'lower') {
      return ATTR_LOWER_CASE;
    }
  }

  // default to use dash-case for attributes
  return ATTR_DASH_CASE;
}
