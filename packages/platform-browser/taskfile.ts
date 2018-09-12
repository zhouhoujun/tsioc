import { PipeModule, Package, AssetActivity, PackageActivity, AssetTask, CleanToken, TsCompile, IPipeContext } from '@taskfr/pipes';
import { TaskContainer } from '@taskfr/platform-server';
const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
// import { rollup } from 'rollup';
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');

@AssetTask({
    src: 'lib/**/*.js',
    dest: 'bundles',
    data: {
        name: 'platform-browser.umd.js',
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
export class PfBrowserRollup extends AssetActivity {
}


@Package({
    src: 'src',
    clean: 'lib',
    test: 'test/**/*.spec.ts',
    assets: {
        ts: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false },
                PfBrowserRollup,
                {
                    name: 'zip',
                    src: 'bundles/platform-browser.umd.js',
                    dest: 'bundles',
                    sourcemaps: true,
                    uglify: true,
                    pipes: [
                        () => rename('platform-browser.umd.min.js')
                    ],
                    task: AssetActivity
                }
            ]
        },
        ts2015: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
                { src: 'esnext/**/*.js', dest: 'es2015', data: { name: 'platform-browser.js', input: './esnext/index.js' }, activity: PfBrowserRollup }
            ]
        },
        es2017: {
            sequence: [
                { clean: 'esnext', activity: CleanToken },
                { src: 'src/**/*.ts', dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2017.json', activity: TsCompile },
                { src: 'esnext/**/*.js', dest: 'es2017', data: { name: 'platform-browser.js', input: './esnext/index.js' }, activity: PfBrowserRollup },
                { clean: 'esnext', activity: CleanToken }
            ]
        }
    },
    sequence: [
        {
            shell: (ctx: IPipeContext) => {
                // let envArgs = ctx.getEnvArgs();
                return `cd bootstrap & tkf`
            },
            activity: 'shell'
        }
    ]
})
export class PfBrowserBuilder extends PackageActivity {
}

TaskContainer.create(__dirname)
    .use(PipeModule)
    .bootstrap(PfBrowserBuilder);
