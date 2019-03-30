
import { Workflow } from '@tsdi/activities';
import { Asset, CleanToken, TsCompile, TransformContext } from '@tsdi/build';
import { Pack, PackModule } from '@tsdi/pack';

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
        name: 'platform-server.js',
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
                'globby', 'path', 'fs',
                'process',
                '@tsdi/core',
                '@tsdi/aop'
            ],
            globals: {
                'reflect-metadata': 'Reflect',
                'tslib': 'tslib',
                'path': 'path',
                'globby': 'globby',
                '@tsdi/core': '@tsdi/core',
                '@tsdi/aop': '@tsdi/aop'
            },
            input: ctx.relativeRoot(ctx.config.data.input)
        }),
        (ctx) => rename(ctx.config.data.name)
    ]
})
export class PfServerRollup {
}

@Pack({
    baseURL: __dirname,
    src: 'src',
    clean: ['lib', 'bundles', 'fesm5', 'es2015', 'fesm2015'],
    test: ctx => ctx.getEnvArgs().test === 'false' ? '' : 'test/**/*.spec.ts',
    assets: {
        ts: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, tsconfig: './tsconfig.json', activity: TsCompile },
                PfServerRollup
            ]
        },
        ts2015: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'es2015', tds: false, annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
                {
                    src: 'es2015/**/*.js',
                    dest: 'fesm2015',
                    data: {
                        name: 'platform-server.js',
                        input: './es2015/index.js'
                    },
                    activity: PfServerRollup
                }
            ]
        }
    }
})
export class PfServerBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.create()
        .use(PackModule)
        .bootstrap(PfServerBuilder);
}

