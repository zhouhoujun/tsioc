import { PipeModule, Package, AssetConfigure, AssetActivity } from '@taskfr/pipes';
import { TaskContainer } from '@taskfr/platform-server';

const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
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
            dest: 'bundles',
            pipes: [
                (ctx) => {
                    return rollup({
                        name: 'aop.umd.js',
                        format: 'umd',
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
            uglify: true,
            pipes: [
                () => rename('aop.umd.min.js')
            ],
            task: AssetActivity
        }
    ]
})
export class AopBuilder {
}


TaskContainer.create(__dirname)
    .use(PipeModule)
    .bootstrap(AopBuilder);
