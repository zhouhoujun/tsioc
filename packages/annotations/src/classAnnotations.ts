import * as ts from 'typescript'
import * as through from 'through2';
import { createFilter } from '@rollup/pluginutils';
import { Plugin } from 'rollup';


const tsChkExp = /\.ts$/;
const replEmpty = /\s*$/;
const constructorName = 'constructor';
/**
 * attach class Annotations before typescript ts compile.
 *
 * @export
 * @param {string} [annotationField='classAnnations']
 * @returns
 */
export function classAnnotations() {
    return through.obj(function (file, encoding, callback) {
        if (file.isNull()) {
            return callback(null, file)
        }

        if (file.isStream()) {
            return callback('doesn\'t support Streams')
        }

        let contents: string = file.contents.toString('utf8');
        contents = iocAnnotations(contents);
        file.contents = Buffer.from(contents);
        callback(null, file)
    })
}

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
                        name: param.name.getText()
                    };
                });
                annations.methods[constructorName] = paramNames;
            }
        } else if (ts.isMethodDeclaration(node)) {
            if (annations && ts.canHaveDecorators(node) && ts.getDecorators(node)?.length && node.parameters.length) {
                const params = node.parameters.map(param => {
                    return {
                        type: param.type?.getText(),
                        name: param.name.getText()
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

export interface AnnOptions {
    include?: string | string[];
    exclude?: string | string[];
}

/**
 * rollup class Annotations for ioc.
 *
 * @export
 * @param {*} options
 * @returns
 */
export function rollupClassAnnotations(options?: AnnOptions): Plugin {
    options = options || {};
    const filter = createFilter(options.include, options.exclude);
    return {
        name: 'classAnnations',
        transform(code, id) {
            if (!filter(id) && !tsChkExp.test(id)) {
                return null
            }
            return new Promise((resolve) => {
                try {
                    resolve({
                        code: iocAnnotations(code),
                        map: null
                    });
                } catch (err: any) {
                    // istanbul ignore else
                    if ('position' in err && this.error) {
                        this.error(err.message, err.position)
                    } else {
                        throw err
                    }
                }
            });
        },
    }
}
