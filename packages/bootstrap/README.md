# packaged @ts-ioc/bootstrap

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@ts-ioc/bootstrap`： DI Module manager, application bootstrap. base on AOP, Ioc container, via `@ts-ioc/core`.

version 2+ of [`tsioc`](https://www.npmjs.com/zhouhoujun/package/tsioc)
# Install

```shell

npm install @ts-ioc/bootstrap

// in browser
npm install @ts-ioc/platform-browser

// in server
npm install @ts-ioc/platform-server
```

## add extends modules

### use bootstrap


```ts

import { DIModule, Bootstrap } from '@ts-ioc/bootstrap';
// in server
import { ApplicationBuilder } from '@ts-ioc/platform-server/bootstrap'
// in browser
import { ApplicationBuilder } from '@ts-ioc/platform-browser/bootstrap'


export class TestService {
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


@DIModule({
    imports: [
        ModuleA
    ],
    exports: [
        ClassSevice
    ],
    bootstrap: ClassSevice
})
export class ModuleB implements OnModuleStart<ClassSevice> {
    constructor(test: TestService) {
        test.test();
    }
    mdOnStart(instance: ClassSevice): void | Promise<any> {
        instance.start();
        instance.state = 'started';
    }
}


ApplicationBuilder.create(__dirname)
    .bootstrap(Application)

ApplicationBuilder.create(baseURL)
    .bootstrap(Application)

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