import { PipeModule, Package, AssetConfigure, AssetActivity, IPipeContext, ShellTaskConfig, PackageActivity, CleanConfigure, CleanActivity, TsConfigure } from '@taskfr/pipes';
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
            dest: 'bundles',
            sourcemaps: true,
            pipes: [
                (ctx) => {
                    return rollup({
                        name: 'platform-browser.umd.js',
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
                            '@ts-ioc/aop'
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
                () => rename('platform-browser.umd.js')
            ],
            task: AssetActivity
        },
        <AssetConfigure>{
            name: 'zip',
            src: 'bundles/platform-browser.umd.js',
            dest: 'bundles',
            sourcemaps: true,
            uglify: true,
            pipes: [
                () => rename('platform-browser.umd.min.js')
            ],
            task: AssetActivity
        },
        <ShellTaskConfig>{
            shell: (ctx: IPipeContext) => {
                // let envArgs = ctx.getEnvArgs();
                return `cd bootstrap & tkf`
            },
            activity: 'shell'
        }
    ]
})
export class PfBrowserBuilder extends PackageActivity {
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
                        name: 'platform-browser.js',
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
                            '@ts-ioc/aop'
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
                () => rename('platform-browser.js')
            ],
            task: AssetActivity
        }
    ]
})
export class PfBrowserES2015Builder extends PackageActivity {
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
                        name: 'platform-browser.js',
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
                            '@ts-ioc/aop'
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
                () => rename('platform-browser.js')
            ],
            task: AssetActivity
        },
        <CleanConfigure>{
            clean: 'esnext',
            activity: CleanActivity
        }
    ]
})
export class PfBrowserES2017Builder extends PackageActivity {
}

TaskContainer.create(__dirname)
    .use(PipeModule)
    .bootstrap(PfBrowserBuilder, PfBrowserES2015Builder, PfBrowserES2017Builder);
