import { Pack } from '@ts-ioc/pack';
import { Asset, AssetActivity, TsCompile, TransformContext } from '@ts-ioc/build';
const rename = require('gulp-rename');
const rollup = require('gulp-rollup');
const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
// const builtins = require('rollup-plugin-node-builtins');


@Asset({
    src: 'lib/**/*.js',
    sourcemaps: true,
    data: {
        name: 'activities.umd.js',
        input: 'lib/index.js',
        format: 'umd'
    },
    pipes: [
        (ctx: TransformContext) => rollup({
            name: ctx.config.data.name,
            format: ctx.config.data.format || 'umd',
            sourceMap: true,
            plugins: [
                resolve(),
                commonjs(),
                // builtins(),
                rollupSourcemaps()
            ],
            external: [
                'reflect-metadata',
                'tslib',
                'events',
                '@ts-ioc/core',
                '@ts-ioc/aop',
                '@ts-ioc/logs',
                '@ts-ioc/boot',
                'gulp-sourcemaps',
                'gulp-typescript',
                'rxjs',
                'rxjs/operators'
            ],
            globals: {
                'reflect-metadata': 'Reflect',
                'tslib': 'tslib',
                'rxjs': 'rxjs',
                'rxjs/operators': 'rxjs/operators',
                '@ts-ioc/core': '@ts-ioc/core',
                '@ts-ioc/aop': '@ts-ioc/aop',
                '@ts-ioc/logs': '@ts-ioc/logs',
                '@ts-ioc/boot': '@ts-ioc/boot'
            },
            input: ctx.relativeRoot(ctx.config.data.input)
        }),
        (ctx) => rename(ctx.config.data.name)
    ],
    dest: 'bundles'
})
export class RollupTs {
}

@Pack({
    baseURL: __dirname,
    clean: ['lib', 'bundles', 'fesm5', 'es2015', 'fesm2015'],
    test: 'test/**/*.spec.ts',
    assets: {
        ts: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, activity: TsCompile },
                RollupTs,
                {
                    name: 'zip',
                    src: 'bundles/activities.umd.js',
                    uglify: true,
                    pipes: [
                        () => rename('activities.umd.min.js'),
                    ],
                    dest: 'bundles',
                    task: AssetActivity
                },
                {
                    src: 'lib/**/*.js', dest: 'fesm5',
                    data: {
                        name: 'activities.js',
                        input: 'lib/index.js',
                        format: 'cjs'
                    },
                    activity: RollupTs
                }
            ]
        },
        ts2015: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'es2015', tds: false, annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
                {
                    src: 'es2015/**/*.js',
                    dest: 'fesm2015',
                    data: {
                        name: 'activities.js',
                        input: 'es2015/index.js',
                        format: 'cjs'
                    },
                    activity: RollupTs
                }
            ]
        }
    }
})
export class ActivitiesBuilder {
}


// if (process.cwd() === __dirname) {
//     Workflow.create()
//         .use(PackModule)
//         .bootstrap(ActivitiesBuilder);
// }
