import { Workflow } from '@ts-ioc/activities';
import { CleanToken, CleanActivity, AssetActivity, Asset, TsCompile, TransformContext } from '@ts-ioc/build';
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
    sourcemaps: true,
    dest: 'fesm5',
    data: {
        name: 'pack.js',
        input: 'lib/index.js'
    },
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
                'globby', 'path', 'fs', 'events', 'stream', 'child_process',
                '@ts-ioc/core',
                '@ts-ioc/aop',
                '@ts-ioc/logs',
                '@ts-ioc/boot',
                '@ts-ioc/pipes',
                '@ts-ioc/platform-server',
                'minimist', 'gulp-sourcemaps', 'vinyl-fs', 'del', 'chokidar',
                'gulp-uglify', 'execa', '@ts-ioc/annotations', 'gulp-typescript',
                '@ts-ioc/activities',
                '@ts-ioc/platform-server-activities',
                '@ts-ioc/build',
                'rxjs',
                'rxjs/operators'
            ],
            globals: {
                'reflect-metadata': 'Reflect',
                'tslib': 'tslib',
                'path': 'path',
                '@ts-ioc/core': '@ts-ioc/core',
                '@ts-ioc/aop': '@ts-ioc/aop',
                '@ts-ioc/boot': '@ts-ioc/boot',
                '@ts-ioc/activities': '@ts-ioc/activities',
                '@ts-ioc/build': '@ts-ioc/build'
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
    clean: ['lib', 'bundles', 'fesm5', 'es2015', 'fesm2015'],
    src: 'src',
    // watch: true,
    assets: {
        ts: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, tsconfig: './tsconfig.es2017.json', activity: TsCompile },
                RollupTs
            ]
        },
        ts2015: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'es2015', tds: false, annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
                {
                    src: 'es2015/**/*.js',
                    dest: 'fesm2015',
                    data: {
                        name: 'pack.js',
                        input: 'es2015/index.js'
                    }, activity: RollupTs
                }
            ]
        }
    }
})
export class PackBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.create()
        .use(PackModule)
        .bootstrap(PackBuilder);
}
