import { Pack, PackActivity, PackModule } from '@ts-ioc/pack';
import { Workflow } from '@ts-ioc/activities';
import { CleanActivity, Asset, AssetActivity, TsCompile, TransformContext } from '@ts-ioc/build';
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
        input: 'lib/index.js'
    },
    pipes: [
        (ctx: TransformContext) => rollup({
            name: ctx.config.data.name,
            format: 'umd',
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
                '@ts-ioc/bootstrap',
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
                '@ts-ioc/bootstrap': '@ts-ioc/bootstrap'
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
    clean: ['lib', 'bundles', 'es2015', 'es2017'],
    test: 'test/**/*.spec.ts',
    assets: {
        ts: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, activity: TsCompile },
                RollupTs,
                {
                    name: 'zip',
                    src: 'bundles/core.umd.js',
                    uglify: true,
                    pipes: [
                        () => rename('core.umd.min.js'),
                    ],
                    dest: 'bundles',
                    task: AssetActivity
                }
            ]
        },
        ts2015: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
                {
                    src: 'esnext/**/*.js', dest: 'es2015',
                    data: {
                        name: 'activities.js',
                        input: 'esnext/index.js'
                    },
                    activity: RollupTs
                }
            ]
        },
        ts2017: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
                {
                    src: 'esnext/**/*.js',
                    dest: 'es2017',
                    data: {
                        name: 'activities.js',
                        input: 'esnext/index.js'
                    },
                    activity: RollupTs
                },
                { clean: 'esnext', activity: CleanActivity }
            ]
        }
    }
})
export class ActivitiesBuilder {
}


if (process.cwd() === __dirname) {
    Workflow.create()
        .use(PackModule)
        .bootstrap(ActivitiesBuilder);
}
