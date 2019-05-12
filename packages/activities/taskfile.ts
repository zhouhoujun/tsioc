import { PackModule, TsBuildOption } from '@tsdi/pack';
import { Task, Workflow } from './src';
const rename = require('gulp-rename');
const rollup = require('gulp-rollup');
const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
// const builtins = require('rollup-plugin-node-builtins');

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
export class ActivityBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.run(ActivityBuilder);
}



// @Asset({
//     src: 'lib/**/*.js',
//     sourcemaps: true,
//     data: {
//         name: 'activities.umd.js',
//         input: 'lib/index.js',
//         format: 'umd'
//     },
//     pipes: [
//         (ctx: TransformContext) => rollup({
//             name: ctx.config.data.name,
//             format: ctx.config.data.format || 'umd',
//             sourceMap: true,
//             plugins: [
//                 resolve(),
//                 commonjs(),
//                 // builtins(),
//                 rollupSourcemaps()
//             ],
//             external: [
//                 'reflect-metadata',
//                 'tslib',
//                 'events',
//                 '@tsdi/core',
//                 '@tsdi/aop',
//                 '@tsdi/logs',
//                 '@tsdi/boot',
//                 'gulp-sourcemaps',
//                 'gulp-typescript',
//                 'rxjs',
//                 'rxjs/operators'
//             ],
//             globals: {
//                 'reflect-metadata': 'Reflect',
//                 'tslib': 'tslib',
//                 'rxjs': 'rxjs',
//                 'rxjs/operators': 'rxjs/operators',
//                 '@tsdi/core': '@tsdi/core',
//                 '@tsdi/aop': '@tsdi/aop',
//                 '@tsdi/logs': '@tsdi/logs',
//                 '@tsdi/boot': '@tsdi/boot'
//             },
//             input: ctx.relativeRoot(ctx.config.data.input)
//         }),
//         (ctx) => rename(ctx.config.data.name)
//     ],
//     dest: 'bundles'
// })
// export class RollupTs {
// }

// @Pack({
//     baseURL: __dirname,
//     clean: ['lib', 'bundles', 'fesm5', 'es2015', 'fesm2015'],
//     test: 'test/**/*.spec.ts',
//     assets: {
//         ts: {
//             sequence: [
//                 { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, activity: TsCompile },
//                 RollupTs,
//                 {
//                     name: 'zip',
//                     src: 'bundles/activities.umd.js',
//                     uglify: true,
//                     pipes: [
//                         () => rename('activities.umd.min.js'),
//                     ],
//                     dest: 'bundles',
//                     task: AssetActivity
//                 },
//                 {
//                     src: 'lib/**/*.js', dest: 'fesm5',
//                     data: {
//                         name: 'activities.js',
//                         input: 'lib/index.js',
//                         format: 'cjs'
//                     },
//                     activity: RollupTs
//                 }
//             ]
//         },
//         ts2015: {
//             sequence: [
//                 { src: 'src/**/*.ts', dest: 'es2015', tds: false, annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
//                 {
//                     src: 'es2015/**/*.js',
//                     dest: 'fesm2015',
//                     data: {
//                         name: 'activities.js',
//                         input: 'es2015/index.js',
//                         format: 'cjs'
//                     },
//                     activity: RollupTs
//                 }
//             ]
//         }
//     }
// })
// export class ActivitiesBuilder {
// }


// if (process.cwd() === __dirname) {
//     Workflow.create()
//         .use(PackModule)
//         .bootstrap(ActivitiesBuilder);
// }
