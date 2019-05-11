import { Workflow, Task, ActivityTemplate } from '@tsdi/activities';
import { PackModule, PackTemplates, RollupOption, TsBuildOption } from '@tsdi/pack';
const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
// import { rollup } from 'rollup';
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');
const builtins = require('rollup-plugin-node-builtins');
import { ServerActivitiesModule } from '@tsdi/platform-server-activities';
import { rollupClassAnnotations } from '@tsdi/annotations';
// const ts = require('rollup-plugin-typescript2');
import * as ts from 'rollup-plugin-typescript';

@Task({
    deps: [
        PackModule
    ],
    imports: [
        ServerActivitiesModule
    ],
    baseURL: __dirname,
    template: {
        activity: 'each',
        each: [
            { clean: ['../../dist/pack/fesm5'], dist: '../../dist/pack/fesm5', uglify: false, tsconfig: './tsconfig.es2017.json' },
            { clean: ['../../dist/pack/fesm2015'], dist: '../../dist/pack/fesm2015', uglify: true, tsconfig: './tsconfig.es2015.json' }
        ],
        body: [
            <TsBuildOption>{
                activity: 'ts',
                // clean: ['lib', 'bundles', 'fesm5', 'es2015', 'fesm2015'],
                src: 'src/**/*.ts',
                annotation: true,
                tsconfig: ctx => ctx.body.tsconfig,
                uglify: ctx => ctx.body.uglify,
                dist: ctx => ctx.body.dist,
                clean: ctx => ctx.body.clean
            },
            <RollupOption>{
                activity: 'rollup',
                // annoation: true,
                // ts: ctx => {
                //     return {
                //         tsconfig: ctx.body.tsconfig
                //     }
                // },
                options: ctx => {
                    return {
                        input: 'src/index.ts',
                        plugins: [
                            resolve(),
                            // {
                            //     resolveId(id) {
                            //         if (/^\./.test(id)) {
                            //             return id;
                            //         }
                            //         return null;
                            //     }
                            // },
                            // commonjs({
                            //     exclude: ['node_modules/**', '../../node_modules/**']
                            // }),
                            rollupClassAnnotations(),
                            ts(),
                            builtins(),
                            rollupSourcemaps()
                        ],
                        output: {
                            file: `${ctx.body.dist}/pack.js`
                        },
                        external: [
                            'reflect-metadata',
                            'tslib',
                            'globby', 'path', 'fs', 'events', 'stream', 'child_process',
                            '@tsdi/ioc',
                            '@tsdi/core',
                            '@tsdi/aop',
                            '@tsdi/logs',
                            '@tsdi/boot',
                            '@tsdi/unit',
                            '@tsdi/platform-server',
                            'minimist', 'gulp-sourcemaps', 'vinyl-fs', 'del', 'chokidar',
                            'gulp-uglify', 'execa', '@tsdi/annotations', 'gulp-typescript',
                            '@tsdi/activities',
                            '@tsdi/platform-server-activities',
                            'rxjs',
                            'rxjs/operators'
                        ],
                        globals: {
                            'reflect-metadata': 'Reflect',
                            'tslib': 'tslib',
                            'path': 'path',
                            '@tsdi/ioc': '@tsdi/ioc',
                            '@tsdi/core': '@tsdi/core',
                            '@tsdi/aop': '@tsdi/aop',
                            '@tsdi/boot': '@tsdi/boot',
                            '@tsdi/activities': '@tsdi/activities'
                        },
                    }
                }

            }
        ]
    }
})
export class PackBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(PackBuilder);
}
