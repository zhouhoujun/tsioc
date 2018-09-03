import { PipeModule, Package, ShellTaskConfig, IPipeContext, CleanConfigure, CleanActivity, AssetActivity, PackageActivity, TsConfigure, AssetConfigure } from '@taskfr/pipes';
import { TaskContainer } from '@taskfr/platform-server';

const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
// import { rollup } from 'rollup';
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');
const builtins = require('rollup-plugin-node-builtins');

@Package({
    src: 'src',
    clean: 'lib',
    test: 'test/**/*.spec.ts',
    assets: {
        ts: { dest: 'lib', annotation: true, uglify: false }
    },
    sequence: [
        <ShellTaskConfig>{
            shell: (ctx: IPipeContext) => {
                // let envArgs = ctx.getEnvArgs();
                return `cd bootstrap & tkf`
            },
            activity: 'shell'
        }
    ]
})
export class PfServerBuilder extends PackageActivity {
}


@Package({
    src: 'src',
    clean: 'esnext',
    assets: {
        ts: <TsConfigure>{ dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json' }
    },
    sequence: [
        <AssetConfigure>{
            src: 'esnext/**/*.js',
            dest: 'es2015',
            sourcemaps: true,
            pipes: [
                (ctx) => {
                    return rollup({
                        name: 'platform-server.js',
                        format: 'cjs',
                        sourceMap: true,
                        plugins: [
                            resolve(),
                            commonjs({
                                exclude: [ 'node_modules/**', '../../node_modules/**']
                            }),
                            // builtins(),
                            rollupSourcemaps()
                        ],
                        external: [
                            'reflect-metadata',
                            'tslib',
                            'object-assign',
                            'log4js',
                            'globby', 'path', 'fs',
                            '@ts-ioc/core',
                            '@ts-ioc/aop'
                        ],
                        globals: {
                            'reflect-metadata': 'Reflect',
                            'log4js': 'log4js',
                            '@ts-ioc/core': '@ts-ioc/core',
                            '@ts-ioc/aop': '@ts-ioc/aop'
                        },
                        input: './esnext/index.js'
                    })
                },
                () => rename('platform-server.js')
            ],
            task: AssetActivity
        }
    ]
})
export class PfServerES2015Builder extends PackageActivity {
}

@Package({
    src: 'src',
    clean: 'esnext',
    assets: {
        ts: <TsConfigure>{ dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2017.json' }
    },
    sequence: [
        <AssetConfigure>{
            src: 'esnext/**/*.js',
            dest: 'es2017',
            sourcemaps: true,
            pipes: [
                (ctx) => {
                    return rollup({
                        name: 'platform-server.js',
                        format: 'cjs',
                        sourceMap: true,
                        plugins: [
                            resolve(),
                            commonjs({
                                exclude: [ 'node_modules/**', '../../node_modules/**']
                            }),
                            // builtins(),
                            rollupSourcemaps()
                        ],
                        external: [
                            'reflect-metadata',
                            'tslib',
                            'object-assign',
                            'log4js',
                            'globby', 'path', 'fs',
                            '@ts-ioc/core',
                            '@ts-ioc/aop'
                        ],
                        globals: {
                            'reflect-metadata': 'Reflect',
                            'log4js': 'log4js',
                            '@ts-ioc/core': '@ts-ioc/core',
                            '@ts-ioc/aop': '@ts-ioc/aop'
                        },
                        input: './esnext/index.js'
                    })
                },
                () => rename('platform-server.js')
            ],
            task: AssetActivity
        },
        <CleanConfigure>{
            clean: 'esnext',
            activity: CleanActivity
        }
    ]
})
export class PfServerES2017Builder extends PackageActivity {
}

TaskContainer.create(__dirname)
    .use(PipeModule)
    .bootstrap(PfServerBuilder, PfServerES2015Builder, PfServerES2017Builder);


