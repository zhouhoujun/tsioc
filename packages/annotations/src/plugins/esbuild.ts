import * as esbuild from 'esbuild';
import * as fs from 'fs';
import { iocAnnotations, tsChkExp } from '../classAnnotations';

export const classAnnotations = {
    name: 'classAnnations',
    setup(build: esbuild.PluginBuild) {
        // Load ".ts" files and return an array of words
        build.onLoad({ filter: tsChkExp }, async (args) => {
            const contents = await fs.promises.readFile(args.path, 'utf8')
            return {
                contents: iocAnnotations(contents),
                loader: 'ts',
            }
        })
    },
}
