import { PipeModule, Package, PackageActivity } from '@taskfr/pipes';
import { TaskContainer } from '@taskfr/platform-server';
import { Asset, AssetActivity, CleanToken, TsCompile } from '@taskfr/build';
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
        name: 'activites.js',
        input: 'lib/index.js'
    },
    pipes: [
        (act) => rollup({
            name: act.config.data.name,
            format: 'umd',
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
                'log4js',
                'globby', 'path', 'fs', 'events', 'stream', 'child_process',
                'typescript',
                'shelljs',
                'rollup',
                '@ts-ioc/core',
                '@ts-ioc/aop',
                '@ts-ioc/logs',
                '@ts-ioc/bootstrap',
                '@ts-ioc/pipes',
                '@ts-ioc/platform-server',
                '@ts-ioc/annotations',
                'minimatch',
                'minimist', 'gulp-sourcemaps', 'vinyl-fs', 'gulp-mocha', 'del', 'chokidar',
                'gulp-uglify', 'execa',
                '@taskfr/core',
                'rxjs',
                'rxjs/operators'
            ],
            globals: {
                'reflect-metadata': 'Reflect',
                'log4js': 'log4js',
                '@ts-ioc/core': '@ts-ioc/core',
                '@ts-ioc/aop': '@ts-ioc/aop'
            },
            input: act.config.data.input
        }),
        (act) => rename(act.config.data.name)
    ],
})
export class RollupTs extends AssetActivity {
}


@Package({
    // src: 'src',
    clean: 'lib',
    assets: {
        ts2015: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'lib', uglify: false, tsconfig: './tsconfig.es2015.json', annotation: true, activity: TsCompile },
                { dest: 'es2015', activity: RollupTs }
            ]
        },
        ts2017: {
            sequence: [
                { clean: 'esnext', activity: CleanToken },
                { src: 'src/**/*.ts', dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2017.json', activity: TsCompile },
                { src: 'esnext/**/*.js', data: { name: 'activites.js', input: 'esnext/index.js' }, dest: 'es2017', activity: RollupTs },
                { clean: 'esnext', activity: CleanToken }
            ]
        }
    }
})
export class PipesBuilder extends PackageActivity {
}


TaskContainer.create(__dirname)
    .use(PipeModule)
    .bootstrap(PipesBuilder);
