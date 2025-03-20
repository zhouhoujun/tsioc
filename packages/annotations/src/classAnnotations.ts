import * as ts from 'typescript'



export const tsChkExp = /^(?!.*\.d\.ts$).*\.ts$/;
const replEmpty = /\s*$/;
const constructorName = 'constructor';


export function iocAnnotations(contents: string): string {
    // fix typescript '$' bug when create source file.
    // contents = contents.replace(repl$, '"$"');
    const sourceFile = ts.createSourceFile('cache.source.ts', contents, ts.ScriptTarget.Latest, true);
    const eachChild = (node: ts.Node, annations?: any) => {
        if (ts.isClassDeclaration(node)) {

            const className = node.name!.text;
            annations = {
                name: className,
                type: node.name,
                abstract: node.modifiers?.some(s => s.getText() === 'abstract')
            };

            const oldclass = node.getText();

            if ((ts.canHaveDecorators(node) && ts.getDecorators(node)?.length) || (node.getChildren()?.some(n => ts.canHaveDecorators(n) && ts.getDecorators(n)?.length))) {
                annations.methods = {};
                ts.forEachChild(node, (nd) => eachChild(nd, annations));
            }

            const classAnnations = `
                    static ƿAnn(): any {
                        return ƿAnn_${className};
                    }
               `;
            const ann = `
                const ƿAnn_${className} = ${JSON.stringify(annations)}
            `;
            const end = oldclass.replace(replEmpty, '').length - 1;
            contents = contents.replace(oldclass, oldclass.substring(0, end) + classAnnations + oldclass.substring(end) + ann);

        } else if (ts.isConstructorDeclaration(node)) {
            if (annations && node.parameters.length) {
                const paramNames = node.parameters.map(param => {
                    return {
                        type: param.type?.getText(),
                        name: param.name.getText(),
                        nullable: param.modifiers?.some(s => s.getText() === '?')
                    };
                });
                annations.methods[constructorName] = paramNames;
            }
        } else if (ts.isMethodDeclaration(node)) {
            if (annations && ts.canHaveDecorators(node) && ts.getDecorators(node)?.length && node.parameters.length) {
                const params = node.parameters.map(param => {
                    return {
                        type: param.type?.getText(),
                        name: param.name.getText(),
                        nullable: param.modifiers?.some(s => s.getText() === '?')
                    }
                });
                const method = node.name.getText();
                const returnType = node.type?.getText();
                annations.methods[method] = { params, returnType };
            }
        }
    }

    ts.forEachChild(sourceFile, eachChild);
    return contents;

}


