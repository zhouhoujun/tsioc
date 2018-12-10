
import { TaskContainer } from '@taskfr/core';
import { IActivity } from '@taskfr/core';
import { Asset, AssetActivity, CleanToken, TsCompile, IBuildHandleActivity } from '@taskfr/build';
import { Pack, PackModule } from '@taskfr/pack';

const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
// import { rollup } from 'rollup';
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');
const builtins = require('rollup-plugin-node-builtins');

@Asset({
    src: 'esnext/**/*.js',
    dest: 'es2015',
    data: {
        name: 'platform-server.js',
        input: 'esnext/index.js'
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
                    commonjs({
                        exclude: ['node_modules/**', '../../node_modules/**']
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
                input: act.config.data.input
            })
        },
        (act) => rename(act.config.data.name)
    ]
})
export class PfServerRollup extends AssetActivity {
}

@Pack({
    src: 'src',
    clean: 'lib',
    test: (act: IActivity) => act.context.getEnvArgs().test === 'false' ? '' : 'test/**/*.spec.ts',
    assets: {
        ts: { dest: 'lib', annotation: true, uglify: false },
        ts2015: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
                PfServerRollup
            ]
        },
        es2017: {
            sequence: [
                { clean: 'esnext', activity: CleanToken },
                { src: 'src/**/*.ts', dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2017.json', activity: TsCompile },
                { src: 'esnext/**/*.js', dest: 'es2017', activity: PfServerRollup },
                { clean: 'esnext', activity: CleanToken }
            ]
        }
    },
    after: {
        shell: (ctx: IBuildHandleActivity) => {
            // let envArgs = ctx.getEnvArgs();
            return `cd bootstrap & ts-node -r tsconfig-paths/register taskfile.ts`
        },
        activity: 'shell'
    }

})
export class PfServerBuilder {
}

TaskContainer.create(__dirname)
    .use(PackModule)
    .bootstrap(PfServerBuilder);

