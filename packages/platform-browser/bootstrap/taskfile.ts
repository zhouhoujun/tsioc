import { PipeModule, Package, AssetConfigure, AssetActivity, CleanConfigure, CleanActivity, PackageActivity, TsConfigure } from '@taskfr/pipes';
import { TaskContainer } from '@taskfr/platform-server';

const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
// import { rollup } from 'rollup';
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');


@Package({
    src: 'src',
    clean: 'lib',
    test: 'test/**/*.spec.ts',
    assets: {
        ts: { dest: 'lib', annotation: true, uglify: false }
    },
    sequence: [
        <AssetConfigure>{
            src: 'lib/**/*.js',
            dest: '../bundles',
            pipes: [
                (ctx) => {
                    return rollup({
                        name: 'platform-browser-bootstrap.umd.js',
                        format: 'umd',
                        sourceMap: true,
                        plugins: [
                            resolve(),
                            commonjs(),
                            rollupSourcemaps()
                        ],
                        external: [
                            'reflect-metadata',
                            'tslib',
                            'object-assign',
                            'log4js',
                            '@ts-ioc/core',
                            '@ts-ioc/aop',
                            '@ts-ioc/bootstrap',
                            '@ts-ioc/platform-browser'

                        ],
                        globals: {
                            'reflect-metadata': 'Reflect',
                            'log4js': 'log4js',
                            '@ts-ioc/core': '@ts-ioc/core',
                            '@ts-ioc/aop': '@ts-ioc/aop'
                        },
                        input: './lib/index.js'
                    })
                },
                () => rename('platform-browser-bootstrap.umd.js')
            ],
            task: AssetActivity
        },
        <AssetConfigure>{
            name: 'zip',
            src: '../bundles/platform-browser-bootstrap.umd.js',
            dest: '../bundles',
            uglify: true,
            pipes: [
                () => rename('platform-browser-bootstrap.umd.min.js')
            ],
            task: AssetActivity
        }
    ]
})
export class PfBrowserBootBuilder  extends PackageActivity {
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
            dest: '../es2015',
            sourcemaps: true,
            pipes: [
                (ctx) => {
                    return rollup({
                        name: 'platform-browser-bootstrap.js',
                        format: 'cjs',
                        sourceMap: true,
                        plugins: [
                            resolve(),
                            commonjs(),
                            rollupSourcemaps()
                        ],
                        external: [
                            'reflect-metadata',
                            'tslib',
                            'object-assign',
                            'log4js',
                            '@ts-ioc/core',
                            '@ts-ioc/aop',
                            '@ts-ioc/bootstrap',
                            '@ts-ioc/platform-browser'

                        ],
                        globals: {
                            'reflect-metadata': 'Reflect',
                            'log4js': 'log4js',
                            '@ts-ioc/core': '@ts-ioc/core',
                            '@ts-ioc/aop': '@ts-ioc/aop'
                        },
                        input: './esnext/index.js'
                    })
                },
                () => rename('platform-browser-bootstrap.js')
            ],
            task: AssetActivity
        }
    ]
})
export class PfBrowserBootES2015Builder extends PackageActivity {
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
            dest: '../es2017',
            sourcemaps: true,
            pipes: [
                (ctx) => {
                    return rollup({
                        name: 'platform-browser-bootstrap.js',
                        format: 'cjs',
                        sourceMap: true,
                        plugins: [
                            resolve(),
                            commonjs(),
                            rollupSourcemaps()
                        ],
                        external: [
                            'reflect-metadata',
                            'tslib',
                            'object-assign',
                            'log4js',
                            '@ts-ioc/core',
                            '@ts-ioc/aop',
                            '@ts-ioc/bootstrap',
                            '@ts-ioc/platform-browser'

                        ],
                        globals: {
                            'reflect-metadata': 'Reflect',
                            'log4js': 'log4js',
                            '@ts-ioc/core': '@ts-ioc/core',
                            '@ts-ioc/aop': '@ts-ioc/aop'
                        },
                        input: './esnext/index.js'
                    })
                },
                () => rename('platform-browser-bootstrap.js')
            ],
            task: AssetActivity
        },
        <CleanConfigure>{
            clean: 'esnext',
            activity: CleanActivity
        }
    ]
})
export class PfBrowserBootES2017Builder extends PackageActivity {
}



TaskContainer.create(__dirname)
    .use(PipeModule)
    .bootstrap(PfBrowserBootBuilder, PfBrowserBootES2015Builder, PfBrowserBootES2017Builder);
