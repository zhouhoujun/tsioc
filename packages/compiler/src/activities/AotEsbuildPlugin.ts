import * as fs from 'fs';
import * as ts from 'typescript';
import * as esbuild from 'esbuild';
import { transpileAot, AotTransformOptions } from './AotTransform';

/**
 * esbuild plugin that applies AOT decorator precompilation to every TypeScript
 * module before esbuild parses it.
 */
export function createAotEsbuildPlugin(options: AotTransformOptions = {}): esbuild.Plugin {
    return {
        name: 'tsdi-aot',
        setup(build) {
            build.onLoad({ filter: /\.tsx?$/ }, async args => {
                if (args.path.endsWith('.d.ts')) {
                    return undefined;
                }
                const source = await fs.promises.readFile(args.path, 'utf-8');
                return {
                    contents: transpileAot(args.path, source, {
                        module: ts.ModuleKind.ESNext,
                        ...options
                    }),
                    loader: 'js'
                };
            });
        }
    };
}
