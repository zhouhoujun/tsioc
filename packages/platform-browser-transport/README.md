# packaged @tsdi/platform-browser-activities
`@tsdi/platform-browser-activities` is activities framework for browser, base on AOP, Ioc container, via @tsdi. file stream pipes activities.

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc/blob/master/packages/activities#readme).
Please file issues and pull requests against that repo.


## Install

1. install modules:

```shell
npm install @tsdi/platform-browser-activities
```

2. install cli | build pack:

### cli in global
```shell
npm install -g '@tsdi/cli'
```
### build pack
```
npm install '@tsdi/pack'
```

use command: `pk run [taskfile.ts], pk run [taskfile.js]`


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

see [control flow codes](https://github.com/zhouhoujun/tsioc/tree/master/packages/activities/src/activities)


* Task module

```ts


```

### Run task

```ts
1.
let wf = new Worflow(moudles)
2.
Workflow.create( moudles)
    .bootstrap(<IConfigure>{
        ...
        activity:...
    });
3.
Workflow.create( moudles)
    .bootstrap(TestTask);
4.
Workflow.create()
    .sequence(TestTask, TsCompile, <IConfigure>{
        ...
        activity: ...
    });
5.
Workflow.create()
    .run(...[TestTask, TsCompile, <IConfigure>{
        ...
        activity: ...
    }]);

```

## Documentation
Documentation is available on the
* [@tsdi/ioc document](https://github.com/zhouhoujun/tsioc/tree/master/packages/ioc).
* [@tsdi/aop document](https://github.com/zhouhoujun/tsioc/tree/master/packages/aop).
* [@tsdi/core document](https://github.com/zhouhoujun/tsioc/tree/master/packages/core).
* [@tsdi/boot document](https://github.com/zhouhoujun/tsioc/tree/master/packages/boot).
* [@tsdi/components document](https://github.com/zhouhoujun/tsioc/tree/master/packages/components).
* [@tsdi/activities document](https://github.com/zhouhoujun/tsioc/tree/master/packages/activities).
* [@tsdi/typeorm-adapter document](https://github.com/zhouhoujun/tsioc/tree/master/packages/typeorm-adapter).
* [@tsdi/unit document](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit).
* [@tsdi/unit-console document](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit-console).
* [@tsdi/cli document](https://github.com/zhouhoujun/tsioc/tree/master/packages/cli).

## License

MIT © [Houjun](https://github.com/zhouhoujun/)