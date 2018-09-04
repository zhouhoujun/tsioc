import { PipeModule, Package, AssetConfigure, AssetActivity, PackageActivity, TsConfigure, CleanConfigure, CleanActivity } from '@taskfr/pipes';
import { TaskContainer } from '@taskfr/platform-server';
import { IActivity } from '@taskfr/core';

const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');


@Package({
    src: 'src',
    clean: 'lib',
    test: (act: IActivity) => act.context.getEnvArgs().test === 'false' ? '' : 'test/**/*.spec.ts',
    assets: {
        ts: { dest: 'lib', annotation: true, uglify: false }
    },
    sequence: [
        <AssetConfigure>{
            src: 'lib/**/*.js',
            dest: 'bundles',
            sourcemaps: true,
            pipes: [
                (ctx) => {
                    return rollup({
                        name: 'aop.umd.js',
                        format: 'umd',
                        sourceMap: true,
                        plugins: [
                            resolve(),
                            commonjs(),
                            rollupSourcemaps()
                        ],
                        external: [
                            'reflect-metadata',
                            'log4js',
                            'tslib',
                            'object-assign',
                            '@ts-ioc/core'
                        ],
                        globals: {
                            'reflect-metadata': 'Reflect',
                            'log4js': 'log4js',
                            '@ts-ioc/core': '@ts-ioc/core'
                        },
                        input: './lib/index.js'
                    })
                },
                () => rename('aop.umd.js')
            ],
            task: AssetActivity
        },
        <AssetConfigure>{
            name: 'zip',
            src: 'bundles/aop.umd.js',
            dest: 'bundles',
            sourcemaps: true,
            uglify: true,
            pipes: [
                () => rename('aop.umd.min.js')
            ],
            task: AssetActivity
        }
    ]
})
export class AopBuilder extends PackageActivity {
}

@Package({
    src: 'src',
    clean: 'esnext',
    assets: {
        ts: <TsConfigure>{ dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json' }
    },
    sequence: [
        <AssetConfigure>{
            src: 'esnext/**/*.js',
            dest: 'es2015',
            sourcemaps: true,
            pipes: [
                (ctx) => {
                    return rollup({
                        name: 'aop.js',
                        format: 'cjs',
                        sourceMap: true,
                        plugins: [
                            resolve(),
                            commonjs(),
                            rollupSourcemaps()
                        ],
                        external: [
                            'reflect-metadata',
                            'log4js',
                            'tslib',
                            'object-assign',
                            '@ts-ioc/core'
                        ],
                        globals: {
                            'reflect-metadata': 'Reflect',
                            'log4js': 'log4js',
                            '@ts-ioc/core': '@ts-ioc/core'
                        },
                        input: './esnext/index.js'
                    })
                },
                () => rename('aop.js')
            ],
            task: AssetActivity
        }
    ]
})
export class AopES2015Builder extends PackageActivity {
}

@Package({
    src: 'src',
    clean: 'esnext',
    assets: {
        ts: <TsConfigure>{ dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2017.json' }
    },
    sequence: [
        <AssetConfigure>{
            src: 'esnext/**/*.js',
            dest: 'es2017',
            sourcemaps: true,
            pipes: [
                (ctx) => {
                    return rollup({
                        name: 'aop.js',
                        format: 'cjs',
                        sourceMap: true,
                        plugins: [
                            resolve(),
                            commonjs(),
                            rollupSourcemaps()
                        ],
                        external: [
                            'reflect-metadata',
                            'log4js',
                            'tslib',
                            'object-assign',
                            '@ts-ioc/core'
                        ],
                        globals: {
                            'reflect-metadata': 'Reflect',
                            'log4js': 'log4js',
                            '@ts-ioc/core': '@ts-ioc/core'
                        },
                        input: './esnext/index.js'
                    })
                },
                () => rename('aop.js')
            ],
            task: AssetActivity
        },
        <CleanConfigure>{
            clean: 'esnext',
            activity: CleanActivity
        }
    ]
})
export class AopES2017Builder extends PackageActivity {
}


TaskContainer.create(__dirname)
    .use(PipeModule)
    .bootstrap(AopBuilder, AopES2015Builder, AopES2017Builder);
