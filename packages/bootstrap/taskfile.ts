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
                        name: 'bootstrap.umd.js',
                        format: 'umd',
                        plugins: [
                            resolve(),
                            commonjs(),
                            // globals(),
                            // builtins(),
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
            uglify: true,
            pipes: [
                () => rename('bootstrap.umd.min.js')
            ],
            activity: AssetActivity
        }
    ]
})
export class BootBuilder {
}


TaskContainer.create(__dirname)
    .use(PipeModule)
    .bootstrap(BootBuilder);
