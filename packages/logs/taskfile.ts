import { Pack, PackActivity, PackModule } from '@taskfr/pack';
import { TaskContainer } from '@taskfr/platform-server';
import { IActivity } from '@taskfr/core';
import { Asset, AssetActivity, TsCompile, CleanToken } from '@taskfr/build';
const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');


@Asset({
    src: 'lib/**/*.js',
    dest: 'bundles',
    data: {
        name: 'logs.umd.js',
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
                    'tslib',
                    'object-assign',
                    'log4js',
                    '@ts-ioc/core',
                    '@ts-ioc/aop'
                ],
                globals: {
                    'reflect-metadata': 'Reflect',
                    'log4js': 'log4js',
                    '@ts-ioc/core': '@ts-ioc/core',
                    '@ts-ioc/aop': '@ts-ioc/aop'
                },
                input: act.config.data.input
            })
        },
        (act) => rename(act.config.data.name)
    ]
})
export class LogsRollup extends AssetActivity {
}

@Pack({
    clean: 'lib',
    test: (act: IActivity) => act.getContext().getEnvArgs().test === 'false' ? '' : 'test/**/*.spec.ts',
    assets: {
        ts: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, activity: TsCompile },
                LogsRollup,
                {
                    name: 'zip',
                    src: 'bundles/logs.umd.js',
                    dest: 'bundles',
                    sourcemaps: true,
                    uglify: true,
                    pipes: [
                        () => rename('logs.umd.min.js')
                    ],
                    task: AssetActivity
                }
            ]
        },
        ts2015: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
                { src: 'esnext/**/*.js', dest: 'es2015', data: { name: 'logs.js', input: './esnext/index.js' }, activity: LogsRollup }
            ]
        },
        es2017: {
            sequence: [
                { clean: 'esnext', activity: CleanToken },
                { src: 'src/**/*.ts', dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2017.json', activity: TsCompile },
                { src: 'esnext/**/*.js', dest: 'es2017', data: { name: 'logs.js', input: './esnext/index.js' }, activity: LogsRollup },
                { clean: 'esnext', activity: CleanToken }
            ]
        }
    }
})
export class LogsBuilder extends PackActivity {
}

TaskContainer.create(__dirname)
    .use(PackModule)
    .bootstrap(LogsBuilder);
