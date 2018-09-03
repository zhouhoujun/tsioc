import { PipeModule, Package, AssetConfigure, AssetActivity } from '@taskfr/pipes';
import { TaskContainer } from '@taskfr/platform-server';

// import 'development-tool-node';
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
            dest: 'bundles',
            pipes: [
                (ctx) => {
                    return rollup({
                        name: 'logs.umd.js',
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
                () => rename('logs.umd.js')
            ],
            task: AssetActivity
        },
        <AssetConfigure>{
            name: 'zip',
            src: 'bundles/logs.umd.js',
            dest: 'bundles',
            uglify: true,
            pipes: [
                () => rename('logs.umd.min.js')
            ],
            task: AssetActivity
        }
    ]
})
export class LogsBuilder {
}

TaskContainer.create(__dirname)
    .use(PipeModule)
    .bootstrap(LogsBuilder);
