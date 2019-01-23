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
    dest: 'fesm5',
    data: {
        name: 'unit-reporter-console.js',
        input: 'lib/index.js'
    },
    sourcemaps: true,
    pipes: [
        (ctx: TransformContext) => rollup({
            name: ctx.config.data.name,
            format: 'cjs',
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
    test: 'test/**/*.spec.ts',
    clean: ['lib', 'bundles', 'fesm5', 'es2015', 'fesm2015'],
    assets: {
        ts: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, tsconfig: './tsconfig.json', activity: TsCompile },
                ConsoleRollup
            ]
        },
        ts2015: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'es2015', tds: false, annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
                {
                    src: 'es2015/**/*.js',
                    dest: 'fesm2015',
                    data: {
                        name: 'unit-reporter-console.js',
                        input: './es2015/index.js'
                    },
                    activity: ConsoleRollup
                }
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
