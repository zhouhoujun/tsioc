import { Pack, PackActivity, PackModule } from '@tsdi/pack';
import { Workflow } from '@tsdi/activities';
import { Asset, CleanToken, AssetActivity, TsCompile, TransformContext } from '@tsdi/build';
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
    dest: 'es2015',
    data: {
        name: 'build.js',
        input: 'lib/index.js',
        format: 'cjs'
    },
    pipes: [
        (ctx: TransformContext) => rollup({
            name: ctx.config.data.name,
            format: ctx.config.data.format || 'cjs',
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
                'typescript',
                'shelljs',
                'rollup',
                '@tsdi/core',
                '@tsdi/aop',
                '@tsdi/logs',
                '@tsdi/boot',
                '@tsdi/pipes',
                '@tsdi/platform-server',
                '@tsdi/annotations',
                '@tsdi/activities',
                '@tsdi/platform-server-activities',
                '@tsdi/unit',
                '@tsdi/unit-console',
                'minimatch',
                'minimist',
                'gulp-sourcemaps',
                'vinyl-fs', 'del', 'chokidar',
                'gulp-uglify', 'execa',
                'gulp-typescript',
                'rxjs',
                'rxjs/operators'
            ],
            globals: {
                'reflect-metadata': 'Reflect',
                'tslib': 'tslib',
                'globby': 'globby',
                'fs': 'fs',
                'del': 'del',
                'path': 'path',
                'shelljs': 'shelljs',
                'minimist': 'minimist',
                'minimatch': 'minimatch',
                'chokidar': 'chokidar',
                'stream': 'stream',
                'execa': 'execa',
                'rxjs': 'rxjs',
                'rxjs/operators': 'rxjs/operators',
                'vinyl-fs': 'vinyl-fs',
                'child_process': 'child_process',
                'typescript': 'typescript',
                'gulp-typescript': 'gulp-typescript',
                'gulp-sourcemaps': 'gulp-sourcemaps',
                'gulp-uglify': 'gulp-uglify',
                'rollup': 'rollup',
                '@tsdi/core': '@tsdi/core',
                '@tsdi/aop': '@tsdi/aop',
                '@tsdi/annotations': '@tsdi/annotations',
                '@tsdi/boot': '@tsdi/boot',
                '@tsdi/platform-server': '@tsdi/platform-server',
                '@tsdi/platform-server-boot': '@tsdi/platform-server-boot',
                '@tsdi/activities': '@tsdi/activities',
                '@tsdi/platform-server-activities': '@tsdi/platform-server-activities',
                '@tsdi/unit': '@tsdi/unit',
                '@tsdi/unit-console': '@tsdi/unit-console'
            },
            input: ctx.relativeRoot(ctx.config.data.input)
        }),
        (ctx) => rename(ctx.config.data.name)
    ],
})
export class RollupTs extends AssetActivity {
}


@Pack({
    // src: 'src',
    baseURL: __dirname,
    clean: ['lib', 'bundles', 'fesm5', 'es2015', 'fesm2015'],
    assets: {
        ts: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, tsconfig: './tsconfig.json', activity: TsCompile },
                { src: 'lib/**/*.js', data: { name: 'build.js', input: 'lib/index.js', format: 'cjs' }, dest: 'fesm5', activity: RollupTs }
            ]
        },
        ts2015: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'es2015', tds: false, uglify: false, tsconfig: './tsconfig.es2015.json', annotation: true, activity: TsCompile },
                {
                    src: 'es2015/**/*.js',
                    dest: 'fesm2015',
                    data: {
                        name: 'build.js',
                        input: 'es2015/index.js',
                        format: 'cjs'
                    }, activity: RollupTs
                }
            ]
        }
    }
})
export class BuildBuilder {
}

if (process.cwd() === __dirname) {
    Workflow.create()
        .use(PackModule)
        .bootstrap(BuildBuilder);
}
