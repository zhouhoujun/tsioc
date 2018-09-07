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
                        name: 'bootstrap.umd.js',
                        format: 'umd',
                        sourceMap: true,
                        plugins: [
                            resolve(),
                            commonjs(),
                            rollupSourcemaps()
                        ],
                        external: [
                            'reflect-metadata',
                            'events',
                            'tslib',
                            'object-assign',
                            'log4js',
                            '@ts-ioc/core',
                            '@ts-ioc/aop'
                        ],
                        globals: {
                            'reflect-metadata': 'Reflect'
                        },
                        input: './lib/index.js'
                    })
                },
                () => rename('bootstrap.umd.js')
            ],
            activity: AssetActivity
        },
        <AssetConfigure>{
            name: 'zip',
            src: 'bundles/bootstrap.umd.js',
            dest: 'bundles',
            sourcemaps: true,
            uglify: true,
            pipes: [
                () => rename('bootstrap.umd.min.js')
            ],
            activity: AssetActivity
        }
    ]
})
export class BootBuilder extends PackageActivity {
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
                        name: 'bootstrap.js',
                        format: 'umd',
                        sourceMap: true,
                        plugins: [
                            resolve(),
                            commonjs(),
                            rollupSourcemaps()
                        ],
                        external: [
                            'reflect-metadata',
                            'events',
                            'tslib',
                            'object-assign',
                            'log4js',
                            '@ts-ioc/core',
                            '@ts-ioc/aop'
                        ],
                        globals: {
                            'reflect-metadata': 'Reflect'
                        },
                        input: './esnext/index.js'
                    })
                },
                () => rename('bootstrap.js')
            ],
            task: AssetActivity
        }
    ]
})
export class BootES2015Builder extends PackageActivity {
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
                        name: 'bootstrap.js',
                        format: 'umd',
                        sourceMap: true,
                        plugins: [
                            resolve(),
                            commonjs(),
                            rollupSourcemaps()
                        ],
                        external: [
                            'reflect-metadata',
                            'events',
                            'tslib',
                            'object-assign',
                            'log4js',
                            '@ts-ioc/core',
                            '@ts-ioc/aop'
                        ],
                        globals: {
                            'reflect-metadata': 'Reflect'
                        },
                        input: './esnext/index.js'
                    })
                },
                () => rename('bootstrap.js')
            ],
            task: AssetActivity
        },
        <CleanConfigure>{
            clean: 'esnext',
            activity: CleanActivity
        }
    ]
})
export class BootES2017Builder extends PackageActivity {
}


TaskContainer.create(__dirname)
    .use(PipeModule)
    .bootstrap(BootBuilder, BootES2015Builder, BootES2017Builder);
