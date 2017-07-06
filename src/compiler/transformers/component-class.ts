import { Diagnostic, ModuleFiles, ModuleFileMeta } from '../interfaces';
import { getComponentDecoratorData } from './component-decorator';
import { getListenDecoratorMeta } from './listen-decorator';
import { getMethodDecoratorMeta } from './method-decorator';
import { getPropDecoratorMeta } from './prop-decorator';
import { getPropChangeDecoratorMeta } from './prop-change-decorator';
import { getStateDecoratorMeta } from './state-decorator';
import * as ts from 'typescript';


export function componentClass(moduleFiles: ModuleFiles, diagnostics: Diagnostic[]): ts.TransformerFactory<ts.SourceFile> {

  return (transformContext) => {

    function visitClass(moduleFile: ModuleFileMeta, classNode: ts.ClassDeclaration) {
      const cmpMeta = getComponentDecoratorData(moduleFile, diagnostics, classNode);

      if (cmpMeta) {
        if (moduleFile.cmpMeta) {
          diagnostics.push({
            msg: `Cannot have multiple @Components in the same source file`,
            type: 'error',
            filePath: moduleFile.tsFilePath
          });
          return classNode;
        }

        moduleFile.cmpMeta = cmpMeta;
        moduleFile.hasCmpClass = true;
        moduleFile.cmpClassName = classNode.name.getText().trim();

        getMethodDecoratorMeta(moduleFile, classNode);
        getStateDecoratorMeta(moduleFile, classNode);
        getPropDecoratorMeta(moduleFile, diagnostics, classNode);
        getListenDecoratorMeta(moduleFile, diagnostics, classNode);
        getPropChangeDecoratorMeta(moduleFile, classNode);

        return removeClassDecorator(classNode);

      } else if (!moduleFile.cmpMeta) {
        moduleFile.hasCmpClass = false;
      }

      return classNode;
    }


    function visit(fileMeta: ModuleFileMeta, node: ts.Node): ts.VisitResult<ts.Node> {
      switch (node.kind) {

        case ts.SyntaxKind.ClassDeclaration:
          return visitClass(fileMeta, node as ts.ClassDeclaration);

        default:
          return ts.visitEachChild(node, (node) => {
            return visit(fileMeta, node);
          }, transformContext);
      }
    }


    return (tsSourceFile) => {
      const moduleFile = moduleFiles[tsSourceFile.fileName];
      if (moduleFile && moduleFile.hasCmpClass) {
        return visit(moduleFile, tsSourceFile) as ts.SourceFile;
      }

      return tsSourceFile;
    };
  };

}


function removeClassDecorator(classNode: ts.ClassDeclaration) {
  return ts.createClassDeclaration(
      undefined!, // <-- that's what's removing the decorator

      // everything else should be the same
      classNode.modifiers!,
      classNode.name!,
      classNode.typeParameters!,
      classNode.heritageClauses!,
      classNode.members);
}
