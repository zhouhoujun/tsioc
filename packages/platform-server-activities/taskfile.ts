import { PackModule, Pack, PackActivity } from '@tsdi/pack';
import { Workflow } from '@tsdi/activities';
import { CleanToken, AssetActivity, Asset, TsCompile, TransformContext } from '@tsdi/build';

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
        name: 'platform-server-activities.js',
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
                'globby', 'path', 'fs', 'time-stamp', 'chalk', 'pretty-hrtime',
                '@tsdi/core',
                '@tsdi/aop',
                '@tsdi/logs',
                '@tsdi/boot',
                '@tsdi/platform-server',
                '@tsdi/platform-server-logs',
                '@tsdi/platform-server-boot',
                '@tsdi/activities'
            ],
            globals: {
                'reflect-metadata': 'Reflect',
                'tslib': 'tslib',
                'chalk': 'chalk',
                'pretty-hrtime': 'pretty-hrtime',
                'time-stamp': 'time-stamp',
                '@tsdi/core': '@tsdi/core',
                '@tsdi/aop': '@tsdi/aop',
                '@tsdi/logs': '@tsdi/logs',
                '@tsdi/annotations': '@tsdi/annotations',
                '@tsdi/boot': '@tsdi/boot',
                '@tsdi/platform-server': '@tsdi/platform-server',
                '@tsdi/platform-server-logs': '@tsdi/platform-server-logs',
                '@tsdi/platform-server-boot': '@tsdi/platform-server-boot',
                '@tsdi/activities': '@tsdi/activities'
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
    clean: ['lib', 'bundles', 'fesm5', 'es2015', 'fesm2015'],
    test: 'test/**/*.spec.ts',
    assets: {
        ts: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, tsconfig: './tsconfig.json', activity: TsCompile },
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
                        name: 'platform-server-activities.js',
                        input: './es2015/index.js'
                    },
                    activity: RollupTs
                }
            ]
        }
    }
})
export class ActPfServerBuilder extends PackActivity {
}

if (process.cwd() === __dirname) {
    Workflow.create()
        .use(PackModule)
        .bootstrap(ActPfServerBuilder);
}
