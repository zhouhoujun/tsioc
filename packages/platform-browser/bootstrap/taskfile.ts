import { PipeModule, Package, AssetConfigure, AssetActivity } from '@taskfr/pipes';
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
        ts: { dest: 'lib', annotation: true, uglify: true }
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
export class PfBrowserBootBuilder {
}


TaskContainer.create(__dirname)
    .use(PipeModule)
    .bootstrap(PfBrowserBootBuilder);
