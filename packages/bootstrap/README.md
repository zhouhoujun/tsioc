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
import { PlatformServer } from '@ts-ioc/platform-server/bootstrap'
// in browser
import { PlatformBrowser } from '@ts-ioc/platform-browser/bootstrap'

let builder = new ContainerBuilder();

let container = build.create();

container.use(AopModule);

@DIModule({
    imports:[ ...],
    providers:[...],
    exports:[ ... ],
    bootstrap?: Token<any>
})
export class DIModuleClassA {

}

@DIModule({
    imports:[
        DIModuleClassA
    ],
    providers:[...],
    exports:[ ... ],
    bootstrap?: Token<any>
})
export class DIModuleClassB {

}

@Bootstrap({
    imports:[
        DIModuleClassB
    ],
    providers:[...],
    exports:[ ... ],
    bootstrap?: MVCApplication
})
export class Application implements OnApplicationStart<MVCApplication> {

    onStart(application: MVCApplication){
        // TODO: application start work.
    }
}

PlatformServer.create(__dirname)
    .bootstrap(Application)

PlatformBrowser.create(baseURL)
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