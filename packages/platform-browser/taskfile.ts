import { AssetActivity, CleanToken, TsCompile, Asset, INodeActivityContext, TransformContext } from '@ts-ioc/build';
import { Workflow } from '@ts-ioc/activities';
import { Pack, PackActivity, PackModule } from '@ts-ioc/pack';
const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
// import { rollup } from 'rollup';
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');

@Asset({
    src: 'lib/**/*.js',
    dest: 'bundles',
    data: {
        name: 'platform-browser.umd.js',
        input: 'lib/index.js',
        format: 'umd'
    },
    sourcemaps: true,
    pipes: [
        (ctx: TransformContext) => rollup({
            name: ctx.config.data.name,
            format: ctx.config.data.format || 'umd',
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
                '@ts-ioc/core',
                '@ts-ioc/aop'
            ],
            globals: {
                'reflect-metadata': 'Reflect',
                'tslib': 'tslib',
                'core-js': 'core-js',
                '@ts-ioc/core': '@ts-ioc/core',
                '@ts-ioc/aop': '@ts-ioc/aop'
            },
            input: ctx.relativeRoot(ctx.config.data.input)
        }),
        (ctx) => rename(ctx.config.data.name)
    ]
})
export class PfBrowserRollup extends AssetActivity {
}


@Pack({
    baseURL: __dirname,
    src: 'src',
    clean: ['lib', 'bundles', 'fesm5', 'es2015', 'fesm2015'],
    test: 'test/**/*.spec.ts',
    assets: {
        ts: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, activity: TsCompile },
                PfBrowserRollup,
                {
                    name: 'zip',
                    src: 'bundles/platform-browser.umd.js',
                    dest: 'bundles',
                    sourcemaps: true,
                    uglify: true,
                    pipes: [
                        () => rename('platform-browser.umd.min.js')
                    ],
                    task: AssetActivity
                },
                {
                    src: 'lib/**/*.js', dest: 'fesm5',
                    data: {
                        name: 'platform-browser.js',
                        input: 'lib/index.js',
                        format: 'cjs'
                    },
                    activity: PfBrowserRollup
                }
            ]
        },
        ts2015: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'es2015', tds: false, annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
                {
                    src: 'es2015/**/*.js',
                    dest: 'fesm2015',
                    data: {
                        name: 'platform-browser.js',
                        input: './es2015/index.js',
                        format: 'cjs'
                    }, activity: PfBrowserRollup
                }
            ]
        }
    }
})
export class PfBrowserBuilder extends PackActivity {
}

if (process.cwd() === __dirname) {
    Workflow.create()
        .use(PackModule)
        .bootstrap(PfBrowserBuilder);
}
