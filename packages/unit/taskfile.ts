
import { Workflow } from '@ts-ioc/activities';
import { Asset, CleanToken, TsCompile, AssetToken, TransformContext } from '@ts-ioc/build';
import { Pack, PackModule } from '@ts-ioc/pack';
const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');

@Asset({
    src: 'lib/**/*.js',
    dest: 'bundles',
    data: {
        name: 'unit.umd.js',
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
                'assert',
                'expect',
                '@ts-ioc/core',
                '@ts-ioc/aop',
                '@ts-ioc/logs',
                '@ts-ioc/bootstrap'
            ],
            globals: {
                'reflect-metadata': 'Reflect',
                'tslib': 'tslib',
                'assert': 'assert',
                'expect': 'expect',
                '@ts-ioc/core': '@ts-ioc/core',
                '@ts-ioc/aop': '@ts-ioc/aop',
                '@ts-ioc/logs': '@ts-ioc/logs',
                '@ts-ioc/bootstrap': '@ts-ioc/bootstrap'

            },
            input: ctx.relativeRoot(ctx.config.data.input)
        }),
        (ctx) => rename(ctx.config.data.name)
    ]
})
export class BootRollup {
}

@Pack({
    baseURL: __dirname,
    src: 'src',
    clean: ['lib', 'bundles', 'fesm5', 'es2015', 'fesm2015'],
    test: ctx => ctx.getEnvArgs().test === 'false' ? '' : 'test/**/*.spec.ts',
    assets: {
        ts: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, activity: TsCompile },
                BootRollup,
                {
                    name: 'zip',
                    src: 'bundles/unit.umd.js',
                    dest: 'bundles',
                    sourcemaps: true,
                    uglify: true,
                    pipes: [
                        () => rename('unit.umd.min.js')
                    ],
                    activity: AssetToken
                },
                {
                    src: 'lib/**/*.js', dest: 'fesm5',
                    data: {
                        name: 'unit.js',
                        input: 'lib/index.js',
                        format: 'cjs'
                    },
                    activity: BootRollup
                }
            ]
        },
        ts2015: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'es2015', tds: false, annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
                {
                    src: 'es2015/**/*.js', dest: 'fesm2015',
                    data: {
                        name: 'unit.js',
                        input: './es2015/index.js',
                        format: 'cjs'
                    }, activity: BootRollup
                }
            ]
        }
    }
})
export class UnitBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.create()
        .use(PackModule)
        .bootstrap(UnitBuilder);

}
