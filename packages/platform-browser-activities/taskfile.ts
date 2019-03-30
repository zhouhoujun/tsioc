import { PackModule, Pack, PackActivity } from '@tsdi/pack';
import { Workflow } from '@tsdi/activities';
import { Asset, CleanActivity, CleanToken, AssetActivity, TsCompile, TransformContext } from '@tsdi/build';
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
        input: 'lib/index.js',
        format: 'umd'
    },
    pipes: [
        (ctx: TransformContext) => rollup({
            name: ctx.config.data.name,
            format: ctx.config.data.format || 'umd',
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
                '@tsdi/core',
                '@tsdi/aop',
                '@tsdi/logs',
                '@tsdi/boot',
                '@tsdi/platform-browser',
                '@tsdi/platform-browser-boot',
                '@tsdi/activities'
            ],
            globals: {
                'reflect-metadata': 'Reflect',
                'tslib': 'tslib',
                '@tsdi/core': '@tsdi/core',
                '@tsdi/aop': '@tsdi/aop',
                '@tsdi/logs': '@tsdi/logs',
                '@tsdi/annotations': '@tsdi/annotations',
                '@tsdi/boot': '@tsdi/boot',
                '@tsdi/platform-browser': '@tsdi/platform-browser',
                '@tsdi/platform-browser-boot': '@tsdi/platform-browser-boot',
                '@tsdi/activities': '@tsdi/activities'
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
    clean: ['lib', 'bundles', 'fesm5', 'es2015', 'fesm2015'],
    assets: {
        ts: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, activity: TsCompile },
                RollupTs,
                {
                    name: 'zip',
                    src: 'bundles/platform-browser-activities.umd.js',
                    dest: 'bundles',
                    sourcemaps: true,
                    uglify: true,
                    pipes: [
                        () => rename('platform-browser-activities.umd.min.js')
                    ],
                    task: AssetActivity
                },
                {
                    src: 'lib/**/*.js', dest: 'fesm5',
                    data: {
                        name: 'platform-browser-activities.js',
                        input: 'lib/index.js',
                        format: 'cjs'
                    },
                    activity: RollupTs
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
                        name: 'platform-browser-activities.js',
                        input: './es2015/index.js',
                        format: 'cjs'
                    }, activity: RollupTs
                }
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
