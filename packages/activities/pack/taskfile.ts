import { TaskContainer } from '@taskfr/platform-server';
import { CleanToken, CleanActivity, AssetActivity, Asset, TsCompile } from '@taskfr/build';
import { Pack, PackActivity, PackModule } from '@taskfr/pack';
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
        name: 'pack.js',
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
                'object-assign',
                'log4js',
                'globby', 'path', 'fs', 'events', 'stream', 'child_process',
                '@ts-ioc/core',
                '@ts-ioc/aop',
                '@ts-ioc/logs',
                '@ts-ioc/bootstrap',
                '@ts-ioc/pipes',
                '@ts-ioc/platform-server',
                'minimist', 'gulp-sourcemaps', 'vinyl-fs', 'gulp-mocha', 'del', 'chokidar',
                'rxjs', 'gulp-uglify', 'execa', '@ts-ioc/annotations', 'gulp-typescript',
                '@taskfr/core',
                '@taskfr/node',
                '@taskfr/build',
                'rxjs/Observer',
                'rxjs/util',
                'rxjs/util/ObjectUnsubscribedError',
                'rxjs/util/UnsubscriptionError',
                'rxjs/Subject',
                'rxjs/Observable',
                'rxjs/Subscriber',
                'rxjs/Subscription',
                'rxjs/BehaviorSubject',
                'rxjs/add/operator/map',
                'rxjs/add/operator/mergeMap',
                'rxjs/add/operator/delay',
                'rxjs/add/operator/distinct',
                'rxjs/add/operator/catch',
                'rxjs/add/operator/distinctUntilChanged',
                'rxjs/add/operator/timeout',
                'rxjs/add/operator/filter',
                'rxjs/add/observable/of',
                'rxjs/add/observable/throw',
                'rxjs/add/observable/fromPromise',
                'rxjs/add/operator/toPromise',
                'rxjs/add/observable/forkJoin',
                'rxjs/add/observable/empty'
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

@Pack({
    clean: 'lib',
    src: 'src',
    watch: true,
    assets: {
        ts2015: {
            sequence: [
                { src: 'src/**/*.ts', dest: 'lib', annotation: true, uglify: false, tsconfig: './tsconfig.es2015.json', activity: TsCompile },
                RollupTs
            ]
        },
        ts2017: {
            sequence: [
                { clean: 'esnext', activity: CleanToken },
                { src: 'src/**/*.ts', dest: 'esnext', annotation: true, uglify: false, tsconfig: './tsconfig.es2017.json', activity: TsCompile },
                { src: 'esnext/**/*.js', dest: 'es2017', data: { name: 'pack.js', input: 'esnext/index.js' }, activity: RollupTs },
                { clean: 'esnext', activity: CleanActivity }
            ]
        }
    }
})
export class PackBuilder extends PackActivity {
}


TaskContainer.create(__dirname)
    .use(PackModule)
    .bootstrap(PackBuilder);
