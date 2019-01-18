import { Workflow } from '@ts-ioc/activities';
import { Asset, AssetActivity, CleanToken, TsCompile, TransformContext } from '@ts-ioc/build';
import { Pack, PackActivity, PackModule } from '@ts-ioc/pack';

const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
// import { rollup } from 'rollup';
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');
const builtins = require('rollup-plugin-node-builtins');

@Asset({
    src: 'lib/**/*.js',
    dest: 'es2015',
    data: {
        name: 'unit-reporter-console.js',
        input: 'lib/index.js'
    },
    sourcemaps: true,
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
                'globby',
                'path',
                'fs',
                'time-stamp', 'chalk', 'pretty-hrtime',
                'process',
                '@ts-ioc/core',
                '@ts-ioc/aop',
                '@ts-ioc/bootstrap',
                '@ts-ioc/platform-server',
                '@ts-ioc/platform-server-logs',
                '@ts-ioc/platform-server-bootstrap',
                '@ts-ioc/unit'
            ],
            globals: {
                'reflect-metadata': 'Reflect',
                'tslib': 'tslib',
                'path': 'path',
                'globby': 'globby',
                'process': 'process',
                'chalk': 'chalk',
                'pretty-hrtime': 'pretty-hrtime',
                'time-stamp': 'time-stamp',
                '@ts-ioc/core': '@ts-ioc/core',
                '@ts-ioc/aop': '@ts-ioc/aop',
                '@ts-ioc/bootstrap': '@ts-ioc/bootstrap',
                '@ts-ioc/platform-server': '@ts-ioc/platform-server',
                '@ts-ioc/platform-server-logs': '@ts-ioc/platform-server-logs',
                '@ts-ioc/platform-server-bootstrap': '@ts-ioc/platform-server-bootstrap',
                '@ts-ioc/unit': '@ts-ioc/unit',
            },
            input: ctx.relativeRoot(ctx.config.data.input)
        }),
        (ctx) => rename(ctx.config.data.name)
    ]
})
export class ConsoleRollup extends AssetActivity {
}

@Pack({
    baseURL: __dirname,
    src: 'src',
    clean: ['lib', 'bundles', 'es2015', 'es2017'],
    test: 'test/**/*.spec.ts',
    assets: {
        es2017: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, tsconfig: './tsconfig.es2017.json', activity: TsCompile },
                { src: 'lib/**/*.js', dest: 'es2017', activity: ConsoleRollup }
            ]
        },
        ts2015: {
            sequence: [
                { clean: 'lib', activity: CleanToken },
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
                ConsoleRollup
            ]
        }
    }
})
export class ConsoleReporterBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.create()
        .use(PackModule)
        .bootstrap(ConsoleReporterBuilder);
}
