import { PipeModule, Package, AssetConfigure, AssetActivity } from '@taskfr/pipes';
import { TaskContainer } from '@taskfr/platform-server';

const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');
const builtins = require('rollup-plugin-node-builtins');

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
                        name: 'core.umd.js',
                        format: 'umd',
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
            uglify: true,
            pipes: [
                () => rename('core.umd.min.js')
            ],
            task: AssetActivity
        }
    ]
})
export class CoreBuilder {
}

TaskContainer.create(__dirname)
    .use(PipeModule)
    .bootstrap(CoreBuilder);
