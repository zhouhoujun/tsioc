import { PackModule, TsBuildOption } from '@tsdi/pack';
import { Workflow, Task } from '@tsdi/activities';
const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');

import { ServerActivitiesModule } from '@tsdi/platform-server-activities';


@Task({
    deps: [
        PackModule,
        ServerActivitiesModule
    ],
    baseURL: __dirname,
    template: {
        activity: 'each',
        each: [
            { clean: ['../../dist/core/lib'], dist: '../../dist/core/lib', uglify: true, tsconfig: './tsconfig.json' },
            // { clean: ['../../dist/core/fesm5'], dist: '../../dist/core/fesm5', uglify: false, tsconfig: './tsconfig.es2017.json' },
            // { clean: ['../../dist/core/fesm2015'], dist: '../../dist/core/fesm2015', uglify: true, tsconfig: './tsconfig.es2015.json' }
        ],
        body: [
            <TsBuildOption>{
                activity: 'ts',
                // clean: ['lib', 'bundles', 'fesm5', 'es2015', 'fesm2015'],
                src: 'src/**/*.ts',
                test: 'test/**/*.ts',
                annotation: true,
                sourcemaps: './sourcemaps',
                jsValuePipe: true,
                tsconfig: ctx => ctx.body.tsconfig,
                uglify: ctx => ctx.body.uglify,
                dist: ctx => ctx.body.dist,
                clean: ctx => ctx.body.clean
            },
            // <RollupOption>{
            //     activity: 'rollup',
            //     // annoation: true,
            //     // ts: ctx => {
            //     //     return {
            //     //         tsconfig: ctx.body.tsconfig
            //     //     }
            //     // },
            //     options: ctx => {
            //         return {
            //             input: 'src/index.ts',
            //             plugins: [
            //                 resolve(),
            //                 // {
            //                 //     resolveId(id) {
            //                 //         if (/^\./.test(id)) {
            //                 //             return id;
            //                 //         }
            //                 //         return null;
            //                 //     }
            //                 // },
            //                 // commonjs({
            //                 //     exclude: ['node_modules/**', '../../node_modules/**']
            //                 // }),
            //                 rollupClassAnnotations(),
            //                 ts(),
            //                 builtins(),
            //                 rollupSourcemaps()
            //             ],
            //             output: {
            //                 file: `${ctx.body.dist}/pack.js`
            //             },
            //             external: [
            //                 'reflect-metadata',
            //                 'tslib',
            //                 'globby', 'path', 'fs', 'events', 'stream', 'child_process',
            //                 '@tsdi/ioc',
            //                 '@tsdi/core',
            //                 '@tsdi/aop',
            //                 '@tsdi/logs',
            //                 '@tsdi/boot',
            //                 '@tsdi/unit',
            //                 '@tsdi/platform-server',
            //                 'minimist', 'gulp-sourcemaps', 'vinyl-fs', 'del', 'chokidar',
            //                 'gulp-uglify', 'execa', '@tsdi/annotations', 'gulp-typescript',
            //                 '@tsdi/activities',
            //                 '@tsdi/platform-server-activities',
            //                 'rxjs',
            //                 'rxjs/operators'
            //             ],
            //             globals: {
            //                 'reflect-metadata': 'Reflect',
            //                 'tslib': 'tslib',
            //                 'path': 'path',
            //                 '@tsdi/ioc': '@tsdi/ioc',
            //                 '@tsdi/core': '@tsdi/core',
            //                 '@tsdi/aop': '@tsdi/aop',
            //                 '@tsdi/boot': '@tsdi/boot',
            //                 '@tsdi/activities': '@tsdi/activities'
            //             },
            //         }
            //     }

            // }
        ]
    }
})
export class CoreBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(CoreBuilder);
}

// @Asset({
//     src: 'lib/**/*.js',
//     dest: 'bundles',
//     data: {
//         name: 'core.umd.js',
//         input: 'lib/index.js',
//         format: 'umd'
//     },
//     sourcemaps: true,
//     pipes: [
//         (ctx: TransformContext) => rollup({
//             name: ctx.config.data.name,
//             format: ctx.config.data.format || 'umd',
//             sourceMap: true,
//             plugins: [
//                 resolve(),
//                 commonjs(),
//                 rollupSourcemaps()
//             ],
//             external: [
//                 'reflect-metadata',
//                 'tslib',
//                 '@tsdi/core'
//             ],
//             globals: {
//                 'reflect-metadata': 'Reflect',
//                 'tslib': 'tslib',
//                 '@tsdi/core': '@tsdi/core'
//             },
//             input: ctx.relativeRoot(ctx.config.data.input)
//         }),
//         (ctx) => rename(ctx.config.data.name)
//     ]
// })
// export class CoreRollup {
// }

// @Pack({
//     baseURL: __dirname,
//     clean: ['lib', 'bundles', 'fesm5', 'es2015', 'fesm2015'],
//     test: (ctx) => ctx.getEnvArgs().test === 'false' ? '' : 'test/**/*.spec.ts',
//     assets: {
//         ts: {
//             sequence: [
//                 { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, activity: TsCompile },
//                 CoreRollup,
//                 {
//                     name: 'zip',
//                     src: 'bundles/core.umd.js',
//                     dest: 'bundles',
//                     sourcemaps: true,
//                     uglify: true,
//                     pipes: [
//                         () => rename('core.umd.min.js')
//                     ],
//                     task: AssetActivity
//                 },
//                 {
//                     src: 'lib/**/*.js', dest: 'fesm5',
//                     data: {
//                         name: 'core.js',
//                         input: 'lib/index.js',
//                         format: 'cjs'
//                     },
//                     activity: CoreRollup
//                 }
//             ]
//         },
//         ts2015: {
//             sequence: [
//                 { src: 'src/**/*.ts', dest: 'es2015', tds: false, annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
//                 {
//                     src: 'es2015/**/*.js', dest: 'fesm2015',
//                     data: {
//                         name: 'core.js',
//                         input: './es2015/index.js',
//                         format: 'cjs'
//                     }, activity: CoreRollup
//                 }
//             ]
//         }
//     }
// })
// export class CoreBuilder {
// }

// if (process.cwd() === __dirname) {
//     Workflow.create()
//         .use(PackModule)
//         .bootstrap(CoreBuilder);
// }
