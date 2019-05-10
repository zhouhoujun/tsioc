import { Workflow, Task, ActivityTemplate } from '@tsdi/activities';
import { PackModule, PackTemplates, RollupOption } from '@tsdi/pack';
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

// @Asset({
//     src: 'lib/**/*.js',
//     sourcemaps: true,
//     dest: 'fesm5',
//     data: {
//         name: 'pack.js',
//         input: 'lib/index.js'
//     },
//     pipes: [
//         (ctx: TransformContext) => rollup({
//             name: ctx.config.data.name,
//             format: 'cjs',
//             sourceMap: true,
//             plugins: [
//                 resolve(),
//                 commonjs({
//                     exclude: ['node_modules/**', '../../node_modules/**']
//                 }),
//                 // builtins(),
//                 rollupSourcemaps()
//             ],
//             external: [
//                 'reflect-metadata',
//                 'tslib',
//                 'globby', 'path', 'fs', 'events', 'stream', 'child_process',
//                 '@tsdi/core',
//                 '@tsdi/aop',
//                 '@tsdi/logs',
//                 '@tsdi/boot',
//                 '@tsdi/pipes',
//                 '@tsdi/platform-server',
//                 'minimist', 'gulp-sourcemaps', 'vinyl-fs', 'del', 'chokidar',
//                 'gulp-uglify', 'execa', '@tsdi/annotations', 'gulp-typescript',
//                 '@tsdi/activities',
//                 '@tsdi/platform-server-activities',
//                 '@tsdi/build',
//                 'rxjs',
//                 'rxjs/operators'
//             ],
//             globals: {
//                 'reflect-metadata': 'Reflect',
//                 'tslib': 'tslib',
//                 'path': 'path',
//                 '@tsdi/core': '@tsdi/core',
//                 '@tsdi/aop': '@tsdi/aop',
//                 '@tsdi/boot': '@tsdi/boot',
//                 '@tsdi/activities': '@tsdi/activities',
//                 '@tsdi/build': '@tsdi/build'
//             },
//             input: ctx.relativeRoot(ctx.config.data.input)
//         }),
//         (ctx) => rename(ctx.config.data.name)
//     ],
// })
// export class RollupTs extends AssetActivity {
// }

@Task({
    imports: [
        ServerActivitiesModule,
        PackModule
    ],
    baseURL: __dirname,
    template: {
        activity: 'each',
        each: [
            { clean: ['lib', 'fesm5'], dist: 'lib', uglify: false, tsconfig: './tsconfig.es2017.json' },
            { clean: ['es2015', 'fesm2015'], dist: 'es2015', uglify: true, tsconfig: './tsconfig.es2015.json' }
        ],
        body: [
            // <TsBuildOption>{
            //     activity: 'ts',
            //     // clean: ['lib', 'bundles', 'fesm5', 'es2015', 'fesm2015'],
            //     src: 'src/**/*.ts',
            //     annotation: true,
            //     tsconfig: ctx => ctx.body.tsconfig,
            //     uglify: ctx => ctx.body.uglify,
            //     dist: ctx => ctx.body.dist,
            //     clean: ctx => ctx.body.clean
            // },
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
                            commonjs({
                                exclude: ['node_modules/**', '../../node_modules/**']
                            }),
                            rollupClassAnnotations(),
                            ts(),
                            // builtins(),
                            rollupSourcemaps()
                        ],
                        output: {
                            file: `${ctx.body.dist}/pack.js`
                        },
                        external: [
                            'reflect-metadata',
                            'tslib',
                            'globby', 'path', 'fs', 'events', 'stream', 'child_process',
                            '@tsdi/core',
                            '@tsdi/aop',
                            '@tsdi/logs',
                            '@tsdi/boot',
                            '@tsdi/pipes',
                            '@tsdi/platform-server',
                            'minimist', 'gulp-sourcemaps', 'vinyl-fs', 'del', 'chokidar',
                            'gulp-uglify', 'execa', '@tsdi/annotations', 'gulp-typescript',
                            '@tsdi/activities',
                            '@tsdi/platform-server-activities',
                            '@tsdi/build',
                            'rxjs',
                            'rxjs/operators'
                        ],
                        globals: {
                            'reflect-metadata': 'Reflect',
                            'tslib': 'tslib',
                            'path': 'path',
                            '@tsdi/core': '@tsdi/core',
                            '@tsdi/aop': '@tsdi/aop',
                            '@tsdi/boot': '@tsdi/boot',
                            '@tsdi/activities': '@tsdi/activities',
                            '@tsdi/build': '@tsdi/build'
                        },
                    }
                }

            }
        ]
        // watch: true,
        // assets: {
        //     ts: {
        //         sequence: [
        //             { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, tsconfig: './tsconfig.es2017.json', activity: TsCompile },
        //             RollupTs
        //         ]
        //     },
        //     ts2015: {
        //         sequence: [
        //             { src: 'src/**/*.ts', dest: 'es2015', tds: false, annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
        //             {
        //                 src: 'es2015/**/*.js',
        //                 dest: 'fesm2015',
        //                 data: {
        //                     name: 'pack.js',
        //                     input: 'es2015/index.js'
        //                 }, activity: RollupTs
        //             }
        //         ]
        //     }
        // }
    }
})
export class PackBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(PackBuilder);
}
