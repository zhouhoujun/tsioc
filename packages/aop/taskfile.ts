import { Pack, PackActivity, PackModule } from '@taskfr/pack';
import { TaskContainer } from '@taskfr/platform-server';
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
        name: 'aop.umd.js',
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
                    'log4js',
                    'tslib',
                    'object-assign',
                    '@ts-ioc/core'
                ],
                globals: {
                    'reflect-metadata': 'Reflect',
                    'log4js': 'log4js',
                    '@ts-ioc/core': '@ts-ioc/core'
                },
                input: act.config.data.input
            })
        },
        (act) => rename(act.config.data.name)
    ]
})
export class AopRollup extends AssetActivity {
}

@Pack({
    clean: 'lib',
    // test: (act: IActivity) => act.context.getEnvArgs().test === 'false' ? '' : 'test/**/*.spec.ts',
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
                }
            ]
        },
        ts2015: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
                { src: 'esnext/**/*.js', dest: 'es2015', data: { name: 'aop.js', input: './esnext/index.js' }, activity: AopRollup }
            ]
        },
        es2017: {
            sequence: [
                { clean: 'esnext', activity: CleanToken },
                { src: 'src/**/*.ts', dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2017.json', activity: TsCompile },
                { src: 'esnext/**/*.js', dest: 'es2017', data: { name: 'aop.js', input: './esnext/index.js' }, activity: AopRollup },
                { clean: 'esnext', activity: CleanToken }
            ]
        }
    }
})
export class AopBuilder extends PackActivity {
}

TaskContainer.create(__dirname)
    .use(PackModule)
    .bootstrap(AopBuilder);
