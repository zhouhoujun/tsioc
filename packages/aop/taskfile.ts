import { Pack, PackModule } from '@ts-ioc/pack';
import { Workflow } from '@ts-ioc/activities';
import { Asset, AssetActivity, TsCompile, CleanToken, TransformContext } from '@ts-ioc/build';

const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');

@Asset({
    src: 'lib/**/*.js',
    dest: 'bundles',
    data: {
        name: 'aop.umd.js',
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
                '@ts-ioc/core'
            ],
            globals: {
                'reflect-metadata': 'Reflect',
                'tslib': 'tslib',
                '@ts-ioc/core': '@ts-ioc/core'
            },
            input: ctx.relativeRoot(ctx.config.data.input)
        }),
        (ctx) => rename(ctx.config.data.name)
    ]
})
export class AopRollup extends AssetActivity {
}

@Pack({
    baseURL: __dirname,
    clean: ['lib', 'bundles', 'fesm5', 'es2015', 'fesm2015'],
    test: (ctx) => ctx.getEnvArgs().test === 'false' ? '' : 'test/**/*.spec.ts',
    assets: {
        ts: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, activity: TsCompile },
                AopRollup,
                {
                    name: 'zip',
                    src: 'bundles/aop.umd.js',
                    dest: 'bundles',
                    sourcemaps: true,
                    uglify: true,
                    pipes: [
                        () => rename('aop.umd.min.js')
                    ],
                    task: AssetActivity
                },
                {
                    src: 'lib/**/*.js', dest: 'fesm5',
                    data: {
                        name: 'aop.js',
                        input: 'lib/index.js',
                        format: 'cjs'
                    },
                    activity: AopRollup
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
                        name: 'aop.js',
                        input: './es2015/index.js',
                        format: 'cjs'
                    },
                    activity: AopRollup
                }
            ]
        }
    }
})
export class AopBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.create()
        .use(PackModule)
        .bootstrap(AopBuilder);
}
