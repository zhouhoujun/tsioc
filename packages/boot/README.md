# packaged @tsdi/boot

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@tsdi/boot`： DI Module manager, application bootstrap. base on AOP, Ioc container, via `@tsdi/core`.

version 5+ of [`@ts-ioc/core`](https://www.npmjs.com/package/@ts-ioc/core) [`tsioc`](https://www.npmjs.com/package/tsioc)
# Install

```shell

npm install @tsdi/boot

// in browser
npm install @tsdi/platform-browser

// in server
npm install @tsdi/platform-server
```

## add extends modules


## boot
DI Module manager, application bootstrap. base on AOP.

*  `@DIModule` DIModule decorator, use to define class as DI Module.
*  `@Bootstrap` Bootstrap decorator, use to define class as bootstrp module.
*  `@Annotation` Annotation decorator, use to define class build metadata config.
*  `@Message`  Message decorator, for class. use to define the class as message handle register in global message queue.

[mvc boot simple](https://github.com/zhouhoujun/type-mvc/tree/master/packages/simples)


### use bootstrap


```ts
import { DIModule, BootApplication } from '@tsdi/boot';


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

@Injectable
export class Person {
    constructor(name: string){

    }
}

// binding component. 
@Component({
    selector: 'you component',
    template: {
        filed: 'binding: myfield'
    }
})
export class MyComponent implements AfterInit {
    
    @Input()
    myfield: string;
    
    @Input()
    use: Person;

    onAfterInit(): void | Promise<void> {
       // todo inited field..

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
        ModuleA
    ],
    providers: [
        Logger,
        ClassSevice
    ],
    bootstrap: ClassSevice
})
export class ModuleB {
    constructor(test: TestService, @Inject(INJECTOR) private injector: ICoreInjector) {
        // the injector is the module injected in.
        console.log(test);
        test.test();
        // console.log(injector);
        // console.log(pools);
    }
}


BootApplication.run(ModuleB)


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
        BootApplication.run(MvcApi);
    }
}


```


## document

Documentation is available on the
[@tsdi/ioc document](https://github.com/zhouhoujun/tsioc/tree/master/packages/ioc).
[@tsdi/aop document](https://github.com/zhouhoujun/tsioc/tree/master/packages/aop).
[@tsdi/core document](https://github.com/zhouhoujun/tsioc/tree/master/packages/core).
[@tsdi/boot document](https://github.com/zhouhoujun/tsioc/tree/master/packages/boot).
[@tsdi/components document](https://github.com/zhouhoujun/tsioc/tree/master/packages/components).
[@tsdi/activities document](https://github.com/zhouhoujun/tsioc/tree/master/packages/activities).

## License

MIT © [Houjun](https://github.com/zhouhoujun/)