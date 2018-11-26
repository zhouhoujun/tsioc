# packaged @taskfr/pipes
`@taskfr` type task framework, base on AOP, Ioc container, via @ts-ioc. file stream pipes activities.

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/type-task).
Please file issues and pull requests against that repo.

`@taskfr/pipes` file stream pipes activities.


## Install

1. install modules:

```shell
npm install @taskfr/pipes
```

2. install cli:

```shell
npm install -g @taskfr/cli
```

use command: `tkf [task names] [--param param]`

taskname: decorator class with `@Task('taskname')` or `@TaskModule({name:'taskname'})`.


You can `import` modules:


## Doc

### Define Task

* Single task

```ts
@Task('test')
class SimpleTask extends AbstractTask implements ITask {

    constructor(name: string) {
        super(name);
    }

    run(): Promise<any> {
        // console.log('before simple activity:', this.name);
        return Promise.resolve('simple task')
            .then(val => {
                console.log('return simple activity:', val);
                return val;
            });
    }
}

```

* control flow activities.

see [control flow codes](https://github.com/zhouhoujun/type-task/tree/master/packages/core/src/activities)


* Task module

```ts


```

### Run task

```ts
1.
let container = new TaskContainer(__dirname, moudles)
2.
TaskContainer.create(__dirname, moudles)
    .bootstrap(<IConfigure>{
        ...
        activity:...
    });
3.
TaskContainer.create(__dirname, moudles)
    .bootstrap(TestTask);
4.
TaskContainer.create(__dirname)
    .bootstrap([TestTask, TsCompile, <IConfigure>{
        ...
        activity: ...
    }]);

```

## Simples

```ts
import { PipeModule, PackageTask, AssetActivity, IPackageConfigure, IAssetConfigure } from '@taskfr/pipes';
import { TaskContainer } from '@taskfr/platform-server';
const rename = require('gulp-rename');
const rollup = require('gulp-rollup');
const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
const builtins = require('rollup-plugin-node-builtins');

//demo1
@Package({
    src: 'src',
    clean: 'lib',
    test: 'test/**/*.spec.ts',
    assets: {
        ts: { dest: 'lib', uglify: true, activity: 'ts' }
    }
})
export class Builder {
}

TaskContainer.create(__dirname)
    .use(PipeModule)
    .bootstrap(Builder);

//demo2

TaskContainer.create(__dirname)
    .use(PipeModule)
    .bootstrap(
        <IPackageConfigure>{
            test: 'test/**/*.spec.ts',
            clean: 'lib',
            src: 'src',
            assets: {
                ts: { src: 'src/**/*.ts', dest: 'lib', /*uglify: true*/ }
            },
            activity: PackageTask
        },
        <IAssetConfigure>{
            src: 'lib/**/*.js',
            pipes: [
                () => rollup({
                    name: 'core.umd.js',
                    format: 'umd',
                    plugins: [
                        resolve(),
                        commonjs(),
                        builtins(),
                        rollupSourcemaps()
                    ],
                    external: [
                        'reflect-metadata',
                        'tslib',
                        '@ts-ioc/core',
                        '@ts-ioc/aop',
                        '@ts-ioc/logs'
                    ],
                    globals: {
                        'reflect-metadata': 'Reflect'
                    },
                    input: 'lib/index.js'
                }),
                () => rename('core.umd.js')
            ],
            dest: 'bundles',
            activity: AssetActivity
        });

```

## Documentation [github](https://github.com/zhouhoujun/type-task.git)

Documentation is available on the
[type-task docs site](https://github.com/zhouhoujun/type-task).

## License

MIT © [Houjun](https://github.com/zhouhoujun/)