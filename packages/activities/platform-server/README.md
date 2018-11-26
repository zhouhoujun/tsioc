# packaged @taskfr/platform-server
`@taskfr` type task framework, base on AOP, Ioc container, via @ts-ioc. file stream pipes activities.

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/type-task).
Please file issues and pull requests against that repo.


## Install

1. install modules:

```shell
npm install @taskfr/platform-server
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
        // console.log('before simple task:', this.name);
        return Promise.resolve('simple task')
            .then(val => {
                console.log('return simple task:', val);
                return val;
            });
    }
}

```

* control flow activities.

see [control flow codes](https://github.com/zhouhoujun/type-task/tree/master/packages/core/src/activities)


```

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
        task:...
    });
3.
TaskContainer.create(__dirname, moudles)
    .bootstrap(TestTask);
4.
TaskContainer.create(__dirname)
    .bootstrap([TestTask, TsCompile, <IConfigure>{
        ...
        task: ...
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
        ts: { dest: 'lib', uglify: true, task: 'ts' }
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
            task: PackageTask
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
            task: AssetActivity
        });

```

## Documentation [github](https://github.com/zhouhoujun/type-task.git)

Documentation is available on the
[type-task docs site](https://github.com/zhouhoujun/type-task).

## License

MIT © [Houjun](https://github.com/zhouhoujun/)