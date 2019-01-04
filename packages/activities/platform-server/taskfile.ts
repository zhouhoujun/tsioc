import { PackModule, Pack, PackActivity } from '@taskfr/pack';
import { Workflow } from '@taskfr/core';
import { CleanToken, AssetActivity, Asset, TsCompile, TransformContext } from '@taskfr/build';

const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
// import { rollup } from 'rollup';
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');
const builtins = require('rollup-plugin-node-builtins');

@Asset({
    src: 'lib/**/*.js',
    sourcemaps: true,
    dest: 'es2015',
    data: {
        name: 'platform-server.js',
        input: 'lib/index.js'
    },
    pipes: [
        (ctx: TransformContext) => rollup({
            name: ctx.config.data.name,
            format: 'umd',
            sourceMap: true,
            plugins: [
                resolve(),
                commonjs({
                    exclude: ['node_modules/**', '../../node_modules/**']
                }),
                // builtins(),
                rollupSourcemaps()
            ],
            external: [
                'reflect-metadata',
                'tslib',
                'log4js',
                'globby', 'path', 'fs', 'time-stamp', 'chalk', 'pretty-hrtime',
                '@ts-ioc/core',
                '@ts-ioc/aop',
                '@ts-ioc/logs',
                '@ts-ioc/bootstrap',
                '@ts-ioc/platform-server',
                '@ts-ioc/platform-server/bootstrap',
                '@taskfr/core'
            ],
            globals: {
                'reflect-metadata': 'Reflect',
                'log4js': 'log4js',
                'tslib': 'tslib',
                'chalk': 'chalk',
                'pretty-hrtime': 'pretty-hrtime',
                'time-stamp': 'time-stamp',
                '@ts-ioc/core': '@ts-ioc/core',
                '@ts-ioc/aop': '@ts-ioc/aop',
                '@ts-ioc/logs': '@ts-ioc/logs',
                '@ts-ioc/annotations': '@ts-ioc/annotations',
                '@ts-ioc/bootstrap': '@ts-ioc/bootstrap',
                '@ts-ioc/platform-server': '@ts-ioc/platform-server',
                '@ts-ioc/platform-server/bootstrap': '@ts-ioc/platform-server/bootstrap',
                '@taskfr/core': '@taskfr/core',
                '@taskfr/platform-server': '@taskfr/platform-server'
            },
            input: ctx.relativeRoot(ctx.config.data.input)
        }),
        (ctx) => rename(ctx.config.data.name)
    ],
})
export class RollupTs extends AssetActivity {
}

@Pack({
    baseURL: __dirname,
    src: 'src',
    clean: 'lib',
    test: 'test/**/*.spec.ts',
    assets: {
        ts2015: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
                RollupTs
            ]
        },
        ts2017: {
            sequence: [
                { clean: 'esnext', activity: CleanToken },
                { src: 'src/**/*.ts', dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2017.json', activity: TsCompile },
                { src: 'esnext/**/*.js', dest: 'es2017', data: { name: 'platform-server.js', input: 'esnext/index.js' }, activity: RollupTs },
                { clean: 'esnext', activity: CleanToken }
            ]
        }
    }
})
export class PfServerBuilder extends PackActivity {
}

if (process.cwd() === __dirname) {
    Workflow.create()
        .use(PackModule)
        .bootstrap(PfServerBuilder);
}
