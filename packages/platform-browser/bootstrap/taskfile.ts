import { Workflow } from '@taskfr/core';
import { Asset, AssetActivity, CleanToken, TsCompile } from '@taskfr/build';
import { Pack, PackActivity, PackModule } from '@taskfr/pack';

const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
// import { rollup } from 'rollup';
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');

@Asset({
    src: 'lib/**/*.js',
    dest: '../bundles',
    data: {
        name: 'platform-browser-bootstrap.umd.js',
        input: 'lib/index.js'
    },
    sourcemaps: true,
    pipes: [
        (ctx) => {
            return rollup({
                name: ctx.config.data.name,
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
                    'core-js',
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
                input: ctx.config.data.input
            })
        },
        (act) => rename(act.config.data.name)
    ]
})
export class BootRollup extends AssetActivity {
}

@Pack({
    src: 'src',
    clean: 'lib',
    test: 'test/**/*.spec.ts',
    assets: {
        ts: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, activity: TsCompile },
                BootRollup,
                {
                    name: 'zip',
                    src: '../bundles/platform-browser-bootstrap.umd.js',
                    dest: '../bundles',
                    sourcemaps: true,
                    uglify: true,
                    pipes: [
                        () => rename('platform-browser-bootstrap.umd.min.js')
                    ],
                    task: AssetActivity
                }
            ]
        },
        ts2015: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
                { src: 'esnext/**/*.js', dest: '../es2015', data: { name: 'platform-browser-bootstrap.js', input: './esnext/index.js' }, activity: BootRollup }
            ]
        },
        es2017: {
            sequence: [
                { clean: 'esnext', activity: CleanToken },
                { src: 'src/**/*.ts', dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2017.json', activity: TsCompile },
                { src: 'esnext/**/*.js', dest: '../es2017', data: { name: 'platform-browser-bootstrap.js', input: './esnext/index.js' }, activity: BootRollup },
                { clean: 'esnext', activity: CleanToken }
            ]
        }
    }
})
export class PfBrowserBootBuilder extends PackActivity {
}

Workflow.create(__dirname)
    .use(PackModule)
    .bootstrap(PfBrowserBootBuilder);
