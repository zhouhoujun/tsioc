# packaged @ts-ioc/unit

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@ts-ioc/unit`： unit testing framework, base on AOP, Ioc container.

version 2+ of [`tsioc`](https://www.npmjs.com/zhouhoujun/package/tsioc)
# Install

```shell

npm install @ts-ioc/unit

// in browser
npm install @ts-ioc/platform-browser

// in server
npm install @ts-ioc/platform-server
```

## add extends modules

### use unit


```ts

import { DIModule, Bootstrap } from '@ts-ioc/unit';
// in server
import { ApplicationBuilder } from '@ts-ioc/platform-server/unit'
// in browser
import { ApplicationBuilder } from '@ts-ioc/platform-browser/unit'


export class TestService {
    testFiled = 'test';
    test() {
        console.log('test');
    }
}

@DIModule({
    providers: [
        { provide: 'mark', useFactory: () => 'marked' },
        TestService
    ],
    exports: [

    ]
})
export class ModuleA {

}

@Injectable
export class ClassSevice {
    @Inject('mark')
    mark: string;
    state: string;
    start() {
        console.log(this.mark);
    }
}

@Aspect
export class Logger {

    @Around('execution(*.start)')
    log() {
        console.log('start........');
    }
}


@DIModule({
    imports: [
        AopModule,
        Logger,
        ModuleA
    ],
    exports: [
        ClassSevice
    ],
    unit: ClassSevice
})
export class ModuleB implements OnModuleStart<ClassSevice> {
    constructor(test: TestService, @Inject(ContainerToken) private container: IContainer) {
        console.log(test);
        test.test();
        // console.log(container);
        // console.log('container pools..................\n');
        let pools = container.get(ContainerPoolToken);
        // console.log(pools);
        console.log('container pools defaults..................\n');
        console.log(pools.defaults);
    }
    mdOnStart(instance: ClassSevice): void | Promise<any> {
        console.log('mdOnStart...');
        console.log(this.container);
        instance.start();
        instance.state = 'started';
    }
}


ApplicationBuilder.create(__dirname)
    .unit(Application)

ApplicationBuilder.create(baseURL)
    .unit(Application)

```


## Container Interface

see more interface. all document is typescript .d.ts.

* [IMethodAccessor](https://github.com/zhouhoujun/tsioc/blob/master/packages/core/src/IMethodAccessor.ts).
* [IContainer](https://github.com/zhouhoujun/tsioc/blob/master/packages/core/src/IContainer.ts)
* [LifeScope](https://github.com/zhouhoujun/tsioc/blob/master/packages/core/src/LifeScope.ts)

Documentation is available on the
[@ts-ioc/core docs site](https://github.com/zhouhoujun/tsioc).

## License

MIT © [Houjun](https://github.com/zhouhoujun/)