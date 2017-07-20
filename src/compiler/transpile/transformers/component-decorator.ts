import { BuildConfig, ComponentMeta, ComponentOptions, Diagnostic, ModuleFileMeta } from '../../interfaces';
import { buildError, catchError } from '../../util';
import { normalizeAssetsDir } from '../../component-plugins/assets-plugin';
import { normalizeStyles } from './normalize-styles';
import { validateTag } from '../../build/validation';
import * as ts from 'typescript';


export function getComponentDecoratorData(config: BuildConfig, moduleFile: ModuleFileMeta, diagnostics: Diagnostic[], classNode: ts.ClassDeclaration) {
  let metaData: ComponentMeta = null;

  if (!classNode.decorators) {
    return metaData;
  }

  let isComponent = false;

  classNode.decorators.forEach(decorator => {

    decorator.forEachChild(decoratorChild => {

      decoratorChild.forEachChild(componentChild => {

        if (componentChild.getText().trim() === 'Component') {
          isComponent = true;

        } else if (isComponent) {
          metaData = parseComponentMetaData(config, moduleFile, diagnostics, componentChild.getText());
        }

      });

    });
  });

  return metaData;
}


function parseComponentMetaData(config: BuildConfig, moduleFile: ModuleFileMeta, diagnostics: Diagnostic[], text: string): ComponentMeta {
  let cmpMeta: ComponentMeta = null;

  try {
    const fnStr = `return ${text};`;

    // parse user component options
    const userOpts: ComponentOptions = new Function(fnStr)();

    // convert user component options from user into component meta
    cmpMeta = {};

    // normalize user data
    normalizeTag(moduleFile, diagnostics, userOpts, cmpMeta, text);
    normalizeStyles(config, userOpts, moduleFile, cmpMeta);
    normalizeAssetsDir(config, userOpts, moduleFile, cmpMeta);
    normalizeHost(userOpts, cmpMeta);
    normalizeShadow(userOpts, cmpMeta);

  } catch (e) {
    // derp
    const d = catchError(diagnostics, e);
    d.absFilePath = moduleFile.tsFilePath;
    d.messageText = `${e}: ${text}`;
  }

  return cmpMeta;
}


function normalizeTag(moduleFile: ModuleFileMeta, diagnostics: Diagnostic[], userOpts: ComponentOptions, cmpMeta: ComponentMeta, orgText: string) {

  if ((<any>userOpts).selector) {
    const d = buildError(diagnostics);
    d.messageText = `Please use "tag" instead of "selector" in component decorator: ${(<any>userOpts).selector}`;
    d.absFilePath = moduleFile.tsFilePath;

    cmpMeta.tagNameMeta = (<any>userOpts).selector;
  }

  if (!userOpts.tag || userOpts.tag.trim() === '') {
    throw new Error(`tag missing in component decorator: ${orgText}`);
  }

  cmpMeta.tagNameMeta = validateTag(userOpts.tag, moduleFile.tsFilePath);
}


function normalizeShadow(userOpts: ComponentOptions, cmpMeta: ComponentMeta) {
  const rawShadowValue: any = userOpts.shadow;

  // default to NOT use shadow dom
  cmpMeta.isShadowMeta = false;

  // try to figure out a best guess depending on the value they put in
  if (rawShadowValue !== undefined) {
    if (typeof rawShadowValue === 'string') {
      if (rawShadowValue.toLowerCase().trim() === 'true') {
        cmpMeta.isShadowMeta = true;
      }

    } else {
      // ensure it's a boolean
      cmpMeta.isShadowMeta = !!rawShadowValue;
    }
  }
}


function normalizeHost(userOpts: ComponentOptions, cmpMeta: ComponentMeta) {
  cmpMeta.hostMeta = userOpts.host || {};
}
