import { BuildConfig, LoadComponentRegistry } from '../../util/interfaces';
import { LOADER_NAME, APP_NAMESPACE_REGEX } from '../../util/constants';
import { generatePreamble } from '../util';
import { getAppPublicPath } from './app-core';


export function generateLoader(
  config: BuildConfig,
  projectCoreFileName: string,
  projectCoreEs5FileName: string,
  componentRegistry: LoadComponentRegistry[]
) {
  const sys = config.sys;

  let staticName = LOADER_NAME;
  if (config.devMode) {
    staticName += '.dev';
  }
  staticName += '.js';

  const publicPath = getAppPublicPath(config);

  return sys.getClientCoreFile({ staticName: staticName }).then(stencilLoaderContent => {
    // replace the default loader with the project's namespace and components

    stencilLoaderContent = injectProjectIntoLoader(
      config,
      projectCoreFileName,
      projectCoreEs5FileName,
      publicPath,
      componentRegistry,
      stencilLoaderContent
    );

    // concat the projects loader code
    const projectCode: string[] = [
      generatePreamble(config),
      stencilLoaderContent
    ];

    return projectCode.join('');
  });
}


export function injectProjectIntoLoader(
  config: BuildConfig,
  projectCoreFileName: string,
  projectCoreEs5FileName: string,
  publicPath: string,
  componentRegistry: LoadComponentRegistry[],
  stencilLoaderContent: string
) {
  let componentRegistryStr = JSON.stringify(componentRegistry);

  const projectCoreUrl = publicPath + '/' + projectCoreFileName;
  const projectCoreEs5Url = publicPath + '/' + projectCoreEs5FileName;

  stencilLoaderContent = stencilLoaderContent.replace(
    APP_NAMESPACE_REGEX,
    `"${config.namespace}","${projectCoreUrl}","${projectCoreEs5Url}",${componentRegistryStr}`
  );

  if (config.minifyJs) {
    const minifyJsResults = config.sys.minifyJs(stencilLoaderContent);
    minifyJsResults.diagnostics.forEach(d => {
      config.logger[d.level](d.messageText);
    });
    if (!minifyJsResults.diagnostics.length) {
      stencilLoaderContent = minifyJsResults.output;
    }
  }

  return stencilLoaderContent;
}
