import { Workflow, Task, ActivityTemplate, Activities } from '@tsdi/activities';
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
import { LibPackBuilderOption } from './src/builds';
import { AfterInit } from '@tsdi/boot';

@Task({
    deps: [
        PackModule,
        ServerActivitiesModule
    ],
    baseURL: __dirname,
    template: <LibPackBuilderOption>{
        activity: 'libs',
        tasks: [
            { src: 'src/**/*.ts', clean: ['../../dist/pack/lib'], dist: '../../dist/pack/lib', uglify: false, tsconfig: './tsconfig.json' },
            { input: 'src/index.ts', clean: ['../../dist/pack/fesm5'], outputFile: '../../dist/pack/fesm5/pack.js', format: 'cjs', uglify: false, tsconfig: './tsconfig.json' },
            // { clean: ['../../dist/pack/fesm2015'], dist: '../../dist/pack/fesm2015', format: 'cjs', uglify: true, tsconfig: './tsconfig.es2015.json' }
        ],
        plugins: ctx => [
            resolve(),
            commonjs({
                exclude: ['node_modules/**', '../../node_modules/**']
            }),
            rollupClassAnnotations(),
            ts(),
            builtins(),
            rollupSourcemaps()
        ],
        external: ctx => [
            'reflect-metadata',
            'tslib',
            'process',
            'util',
            'globby', 'path', 'fs', 'events', 'stream', 'child_process',
            '@tsdi/ioc',
            '@tsdi/core',
            '@tsdi/aop',
            '@tsdi/logs',
            '@tsdi/boot',
            '@tsdi/unit',
            '@tsdi/annotations',
            '@tsdi/unit-console',
            '@tsdi/platform-server',
            'uglify',
            'minimist', 'gulp-sourcemaps', 'vinyl-fs', 'del', 'chokidar',
            'gulp-uglify', 'execa', 'gulp-typescript',
            '@tsdi/activities',
            '@tsdi/platform-server-activities',
            'rxjs',
            'rxjs/operators'
        ],
        globals: {
            'reflect-metadata': 'Reflect',
            'tslib': 'tslib',
            'path': 'path',
            'globby': 'globby',
            '@tsdi/ioc': '@tsdi/ioc',
            '@tsdi/core': '@tsdi/core',
            '@tsdi/aop': '@tsdi/aop',
            '@tsdi/boot': '@tsdi/boot',
            '@tsdi/activities': '@tsdi/activities'
        }
    }
})
export class PackBuilder implements AfterInit {

    onAfterInit(): void | Promise<void> {
        console.log('pack build has inited...')
    }

}


// @Task({
//     deps: [
//         PackModule,
//         ServerActivitiesModule
//     ],
//     baseURL: __dirname,
//     template: {
//         activity: 'each',
//         each: [
//             { clean: ['../../dist/pack/lib'], dist: '../../dist/pack/lib', uglify: true, tsconfig: './tsconfig.json' },
//             { clean: ['../../dist/pack/fesm5'], dist: '../../dist/pack/fesm5',  format: 'cjs', uglify: false, tsconfig: './tsconfig.json' },
//             { clean: ['../../dist/pack/fesm2015'], dist: '../../dist/pack/fesm2015', format: 'cjs',  uglify: true, tsconfig: './tsconfig.es2015.json' }
//         ],
//         body: [
//             {
//                 activity: 'if',
//                 condition: ctx => /lib$/.test(ctx.body.dist),
//                 body: <TsBuildOption>{
//                     activity: 'ts',
//                     clean: ctx => ctx.body.clean,
//                     src: 'src/**/*.ts',
//                     test: 'test/**/*.ts',
//                     uglify: ctx => ctx.body.uglify,
//                     dist: ctx => ctx.body.dist,
//                     annotation: true,
//                     sourcemaps: './sourcemaps',
//                     jsValuePipe: true,
//                     tsconfig: ctx => ctx.body.tsconfig
//                 }
//             },
//             {
//                 activity: Activities.else,
//                 body: <RollupOption>{
//                     activity: 'rollup',
//                     input: ctx => ctx.body.input || 'src/index.ts',
//                     plugins: ctx => [
//                         resolve(),
//                         // {
//                         //     resolveId(id) {
//                         //         if (/^\./.test(id)) {
//                         //             return id;
//                         //         }
//                         //         return null;
//                         //     }
//                         // },
//                         commonjs({
//                             exclude: ['node_modules/**', '../../node_modules/**']
//                         }),
//                         rollupClassAnnotations(),
//                         ts(),
//                         builtins(),
//                         rollupSourcemaps()
//                     ],
//                     external: ctx => [
//                         'reflect-metadata',
//                         'tslib',
//                         'process',
//                         'util',
//                         'globby', 'path', 'fs', 'events', 'stream', 'child_process',
//                         '@tsdi/ioc',
//                         '@tsdi/core',
//                         '@tsdi/aop',
//                         '@tsdi/logs',
//                         '@tsdi/boot',
//                         '@tsdi/unit',
//                         '@tsdi/annotations',
//                         '@tsdi/unit-console',
//                         '@tsdi/platform-server',
//                         'uglify',
//                         'minimist', 'gulp-sourcemaps', 'vinyl-fs', 'del', 'chokidar',
//                         'gulp-uglify', 'execa', 'gulp-typescript',
//                         '@tsdi/activities',
//                         '@tsdi/platform-server-activities',
//                         'rxjs',
//                         'rxjs/operators'
//                     ],
//                     output: ctx => {
//                         return {
//                             format: ctx.body.format || 'umd',
//                             file: `${ctx.body.dist}/pack.js`,
//                             globals: {
//                                 'reflect-metadata': 'Reflect',
//                                 'tslib': 'tslib',
//                                 'path': 'path',
//                                 'globby': 'globby',
//                                 '@tsdi/ioc': '@tsdi/ioc',
//                                 '@tsdi/core': '@tsdi/core',
//                                 '@tsdi/aop': '@tsdi/aop',
//                                 '@tsdi/boot': '@tsdi/boot',
//                                 '@tsdi/activities': '@tsdi/activities'
//                             }
//                         }
//                     }
//                 }
//             }
//         ]
//     }
// })
// export class PackBuilder {
// }

if (process.cwd() === __dirname) {
    Workflow.run(PackBuilder);
}
