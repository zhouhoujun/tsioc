import * as ts from 'typescript'
import * as through from 'through2';
import { createFilter } from '@rollup/pluginutils';
import { Plugin } from 'rollup';


const tsChkExp = /\.ts$/;
const replEmpty = /\s*$/;
const repl$ = /\'\$\'/gi;
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
    contents = contents.replace(repl$, '"$"');
    let sourceFile = ts.createSourceFile('cache.source.ts', contents, ts.ScriptTarget.Latest, true);
    let eachChild = (node: ts.Node, annations?: any) => {
        if (ts.isClassDeclaration(node)) {

            let className = node.name.text;
            annations = {
                name: className,
                abstract: node.modifiers.some(s => s.getText() === 'abstract')
            };

            let oldclass = node.getText();
            if ((node.decorators && node.decorators.length) || (node.getChildren()?.some(n => n.decorators && n.decorators.length))) {
                annations.params = {};
                ts.forEachChild(node, (nd) => eachChild(nd, annations));
            }

            let classAnnations = `
                    static ƿAnn(): any {
                        return ${JSON.stringify(annations)};
                    }
               `;
            let end = oldclass.replace(replEmpty, '').length - 1;
            contents = contents.replace(oldclass, oldclass.substring(0, end) + classAnnations + oldclass.substring(end));

        } else if (ts.isConstructorDeclaration(node)) {
            if (annations && node.parameters.length) {
                let paramNames = node.parameters.map(param => {
                    return param.name.getText();
                });
                annations.params[constructorName] = paramNames;
            }
        } else if (ts.isMethodDeclaration(node)) {
            if (annations && node.parameters.length) {
                let paramNames = node.parameters.map(param => {
                    return param.name.getText();
                });
                let method = node.name.getText();
                annations.params[method] = paramNames;
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
                } catch (err) {
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
