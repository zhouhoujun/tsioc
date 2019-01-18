import { PackModule, Pack, PackActivity } from '@ts-ioc/pack';
import { Workflow } from '@ts-ioc/activities';
import { Asset, CleanActivity, CleanToken, AssetActivity, TsCompile, TransformContext } from '@ts-ioc/build';
const rename = require('gulp-rename');
const rollup = require('gulp-rollup');
const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
const builtins = require('rollup-plugin-node-builtins');


@Asset({
    src: 'lib/**/*.js',
    sourcemaps: true,
    data: {
        name: 'platform-browser-activities.umd.js',
        input: 'lib/index.js'
    },
    pipes: [
        (ctx: TransformContext) => rollup({
            name: ctx.config.data.name,
            format: 'umd',
            sourceMap: true,
            plugins: [
                resolve(),
                commonjs(),
                builtins(),
                rollupSourcemaps()
            ],
            external: [
                'reflect-metadata',
                'tslib',
                '@ts-ioc/core',
                '@ts-ioc/aop',
                '@ts-ioc/logs',
                '@ts-ioc/bootstrap',
                '@ts-ioc/platform-browser',
                '@ts-ioc/platform-browser-bootstrap',
                '@ts-ioc/activities'
            ],
            globals: {
                'reflect-metadata': 'Reflect',
                'tslib': 'tslib',
                '@ts-ioc/core': '@ts-ioc/core',
                '@ts-ioc/aop': '@ts-ioc/aop',
                '@ts-ioc/logs': '@ts-ioc/logs',
                '@ts-ioc/annotations': '@ts-ioc/annotations',
                '@ts-ioc/bootstrap': '@ts-ioc/bootstrap',
                '@ts-ioc/platform-browser': '@ts-ioc/platform-browser',
                '@ts-ioc/platform-browser-bootstrap': '@ts-ioc/platform-browser-bootstrap',
                '@ts-ioc/activities': '@ts-ioc/activities'
            },
            input: ctx.relativeRoot(ctx.config.data.input)
        }),
        (ctx) => rename(ctx.config.data.name)
    ],
    dest: 'bundles'
})
export class RollupTs extends AssetActivity {
}

@Pack({
    baseURL: __dirname,
    src: 'src',
    clean: ['lib', 'bundles', 'es2015', 'es2017'],
    assets: {
        ts2017: {
            sequence: [
                { clean: 'lib', activity: CleanToken },
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, tsconfig: './tsconfig.es2017.json', activity: TsCompile },
                { dest: 'es2017', activity: RollupTs }
            ]
        },
        ts2015: {
            sequence: [
                { clean: 'lib', activity: CleanToken },
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
                { dest: 'es2015', activity: RollupTs }
            ]
        }
    }
})
export class ActPfBrowserBuilder extends PackActivity {
}

if (process.cwd() === __dirname) {
    Workflow.create()
        .use(PackModule)
        .bootstrap(ActPfBrowserBuilder);
}
