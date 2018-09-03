import { PipeModule, Package, AssetConfigure, AssetActivity, TsConfigure, CleanConfigure, CleanActivity, PackageActivity } from '@taskfr/pipes';
import { TaskContainer } from '@taskfr/platform-server';

const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');
// const builtins = require('rollup-plugin-node-builtins');

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
                        name: 'core.umd.js',
                        format: 'umd',
                        sourceMap: true,
                        plugins: [
                            resolve(),
                            commonjs(),
                            // builtins()
                            rollupSourcemaps()
                        ],
                        external: [
                            'reflect-metadata',
                            'tslib',
                            'log4js'
                        ],
                        globals: {
                            'reflect-metadata': 'Reflect'
                        },
                        input: './lib/index.js'
                    })
                },
                () => rename('core.umd.js')
            ],
            task: AssetActivity
        },
        <AssetConfigure>{
            name: 'zip',
            src: 'bundles/core.umd.js',
            dest: 'bundles',
            sourcemaps: true,
            uglify: true,
            pipes: [
                () => rename('core.umd.min.js')
            ],
            task: AssetActivity
        }
    ]
})
export class CoreBuilder extends PackageActivity {
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
                        name: 'core.js',
                        format: 'cjs',
                        sourceMap: true,
                        plugins: [
                            resolve(),
                            commonjs(),
                            // builtins()
                            rollupSourcemaps()
                        ],
                        external: [
                            'reflect-metadata',
                            'tslib',
                            'log4js'
                        ],
                        globals: {
                            'reflect-metadata': 'Reflect'
                        },
                        input: './esnext/index.js'
                    })
                },
                () => rename('core.js')
            ],
            task: AssetActivity
        },
        <CleanConfigure>{
            clean: 'esnext',
            activity: CleanActivity
        }
    ]
})
export class CoreES2015Builder extends PackageActivity {
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
                        name: 'core.js',
                        format: 'cjs',
                        sourceMap: true,
                        plugins: [
                            resolve(),
                            commonjs(),
                            // builtins()
                            rollupSourcemaps()
                        ],
                        external: [
                            'reflect-metadata',
                            'tslib',
                            'log4js'
                        ],
                        globals: {
                            'reflect-metadata': 'Reflect'
                        },
                        input: './esnext/index.js'
                    })
                },
                () => rename('core.js')
            ],
            task: AssetActivity
        },
        <CleanConfigure>{
            clean: 'esnext',
            activity: CleanActivity
        }
    ]
})
export class CoreES2017Builder extends PackageActivity {
}

let tkc = TaskContainer.create(__dirname)
    .use(PipeModule)
    .bootstrap(CoreBuilder, CoreES2015Builder, CoreES2017Builder);
