import { PipeModule, Package, AssetActivity, PackageActivity, AssetTask, CleanToken, TsCompile } from '@taskfr/pipes';
import { TaskContainer } from '@taskfr/platform-server';
import { IActivity } from '@taskfr/core';
const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');

@AssetTask({
    src: 'lib/**/*.js',
    dest: 'bundles',
    data: {
        name: 'bootstrap.umd.js',
        input: 'lib/index.js'
    },
    sourcemaps: true,
    pipes: [
        (act) => {
            return rollup({
                name: act.config.data.name,
                format: 'umd',
                sourceMap: true,
                plugins: [
                    resolve(),
                    commonjs(),
                    rollupSourcemaps()
                ],
                external: [
                    'reflect-metadata',
                    'events',
                    'tslib',
                    'object-assign',
                    'log4js',
                    '@ts-ioc/core',
                    '@ts-ioc/aop'
                ],
                globals: {
                    'reflect-metadata': 'Reflect'
                },
                input: act.config.data.input
            })
        },
        (act) => rename(act.config.data.name)
    ]
})
export class BootRollup extends AssetActivity {
}

@Package({
    src: 'src',
    clean: 'lib',
    test: (act: IActivity) => act.context.getEnvArgs().test === 'false' ? '' : 'test/**/*.spec.ts',
    assets: {
        ts: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false },
                BootRollup,
                {
                    name: 'zip',
                    src: 'bundles/bootstrap.umd.js',
                    dest: 'bundles',
                    sourcemaps: true,
                    uglify: true,
                    pipes: [
                        () => rename('bootstrap.umd.min.js')
                    ],
                    task: AssetActivity
                }
            ]
        },
        ts2015: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
                { src: 'esnext/**/*.js', dest: 'es2015', data: { name: 'bootstrap.js', input: './esnext/index.js' }, activity: BootRollup }
            ]
        },
        es2017: {
            sequence: [
                { clean: 'esnext', activity: CleanToken },
                { src: 'src/**/*.ts', dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2017.json', activity: TsCompile },
                { src: 'esnext/**/*.js', dest: 'es2017', data: { name: 'bootstrap.js', input: './esnext/index.js' }, activity: BootRollup },
                { clean: 'esnext', activity: CleanToken }
            ]
        }
    }
})
export class BootBuilder extends PackageActivity {
}

TaskContainer.create(__dirname)
    .use(PipeModule)
    .bootstrap(BootBuilder);
