# packaged @ts-ioc/boot

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@ts-ioc/boot`： DI Module manager, application bootstrap. base on AOP, Ioc container, via `@ts-ioc/core`.

version 2+ of [`tsioc`](https://www.npmjs.com/zhouhoujun/package/tsioc)
# Install

```shell

npm install @ts-ioc/boot

// in browser
npm install @ts-ioc/platform-browser

// in server
npm install @ts-ioc/platform-server
```

## add extends modules

### use bootstrap


```ts
import { DIModule, ApplicationBuilder } from '@ts-ioc/boot';


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
    bootstrap: ClassSevice
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
    .bootstrap(Application)

ApplicationBuilder.create(baseURL)
    .bootstrap(Application)

```

* use @Bootstrap config to boot application
```ts

@Bootstrap({
    baseURL: __dirname,
    imports: [
        KoaModule
    ],
    //use your builder
    builder: MvcHostBuilder,
    bootstrap: MvcServerToken,
    //bootDeps:[s
        //module
    //],
    //bootConfiguration: config
    //debug: true
})
class MvcApi {
    constructor() {
        console.log('boot application');
    }
}

```

* use @Bootstrap main to boot application

```ts

@Bootstrap({
    imports: [
        KoaModule
    ],
    bootstrap: MvcServerToken
})
class MvcApi {
    constructor() {
        console.log('boot application');
    }

    static main() {
        console.log('run mvc api...');
        // use your builder
        MvcHostBuilder.create(__dirname)
            .useConfiguration({ debug: true })
            .bootstrap(MvcApi);
    }
}


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