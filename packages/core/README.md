# packaged @tsdi/core

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@tsdi/core` is Ioc container, Injector, via typescript decorator. extends `@tsdi/ioc`
with features:
* can load script and inject.
* get service form injector tree.
* get services form injector tree.


version 5+ of [`@ts-ioc/core`](https://www.npmjs.com/package/@ts-ioc/core) [`tsioc`](https://www.npmjs.com/package/tsioc)

# builder

```shell
build: npm run build

//build with version:
npm run build -- --setvs=4.0.0-beta

//deploy: 
./deploy.cmd
//or
 npm run build -- --deploy=true

```

# Install

```shell

npm install @tsdi/ioc

```

## add extends modules

### use aop

```shell

// install aop
npm install @tsdi/aop

```

```ts
import { AopModule } from '@tsdi/aop';
// in server
import { ContainerBuilder } from '@tsdi/platform-server'
// in browser
import { ContainerBuilder } from '@tsdi/platform-browser'

let builder = new ContainerBuilder();

let container = build.create();

// use aop.
container.use(AopModule);
// also can
container.register(AopModule);
// or
container.inject(AopModule)
//or
container.injectModule(AopModule)

```

### use aop logs

```shell
// install aop logs
npm install @tsdi/logs
```

```ts

import { LogModule } from '@tsdi/logs';
// in server
import { ContainerBuilder } from '@tsdi/platform-server'
// in browser
import { ContainerBuilder } from '@tsdi/platform-browser'

let builder = new ContainerBuilder();

let container = build.create();

container.use(LogModule);

```

# Documentation

## core

### extends ioc
1. `@IocExt()` class decortator, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
2. add service resolve.
3. module inject.


## Ioc

1. Register one class will auto register depdence class (must has a class decorator).

2. get Instance can auto create constructor param.  (must has a class decorator or register in container).

### decorators

1. `@Abstract`  abstract class decorator.
2. `@AutoRun`   class, method decorator, use to define the class auto run (via a method or not) after registered.
3. `@AutoWried`  property or param decorator, use to auto wried type instance or value to the instance of one class with the decorator.
4. `@Inject()`  property or param decorator, use to auto wried type instance or value to the instance of one class with the decorator.
5. `@Injectable()` class decortator, use to define the class. it can setting provider to some token, singleton or not.
6. `@AutoWried` method decorator.
7. `@Param()`   param decorator, use to auto wried type instance or value to the instance of one class with the decorator.
8. `@Singleton()` class decortator, use to define the class is singleton.
9. `@Providers` Providers decorator, for class. use to add private ref service for the class.
10. `@Refs` Refs decorator, for class. use to define the class as a service for target.


## AOP

It's a dynamic aop base on ioc.

define a Aspect class, must with decorator:

* `@Aspect()` Aspect decorator, define for class.  use to define class as aspect. it can setting provider to some token, singleton or not.

* `@Before(matchstring|RegExp)` method decorator,  aop Before advice decorator.

* `@After(matchstring|RegExp)`  method decorator,  aop after advice decorator.

* `@Around(matchstring|RegExp)`  method decorator,  aop around advice decorator.

* `@AfterThrowing(matchstring|RegExp)`  method decorator,  aop AfterThrowing advice decorator.

* `@AfterReturning(matchstring|RegExp)`  method decorator,  aop AfterReturning advice decorator.

* `@Pointcut(matchstring|RegExp)`  method decorator,  aop Pointcut advice decorator.


see [simples](https://github.com/zhouhoujun/tsioc/tree/master/packages/aop/test/aop)


## boot
DI Module manager, application bootstrap. base on AOP.

*  `@DIModule` DIModule decorator, use to define class as DI Module.
*  `@Bootstrap` Bootstrap decorator, use to define class as bootstrp module.
*  `@Boot()` Boot decorator, use to define class as startup service for application.
*  `@Message`  Message decorator, for class. use to define the class as message handle register in global message queue.

[mvc boot simple](https://github.com/zhouhoujun/type-mvc/tree/master/packages/simples)

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

@Injectable()
export class ClassSevice {
    @Inject('mark')
    mark: string;
    state: string;
    start() {
        console.log(this.mark);
    }
}

@Aspect()
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
    providers:[
        Logger,
        ClassSevice
    ]
    bootstrap: ClassSevice
})
export class ModuleB {

}

BootApplication.run(ModuleB);

```

## components
*  `@Component`  Component decorator,  use to defaine class as component with template.
*  `@Input` Input decorator, use to define property or param as component binding field or args.

see [ activity build boot simple](https://github.com/zhouhoujun/tsioc/blob/master/packages/activities/taskfile.ts)


## [Activites](https://github.com/zhouhoujun/tsioc/tree/master/packages/activities)

* [activities](https://github.com/zhouhoujun/tsioc/tree/master/packages/activities)
* [pack](https://github.com/zhouhoujun/tsioc/tree/master/packages/pack)

### create Container

```ts

let container = new IocContainer();

```

###  Container is ioc root.

see @tsdi/ioc interface [IIocContainer](https://github.com/zhouhoujun/tsioc/blob/master/packages/ioc/src/IIocContainer.ts)

see @tsdi/core interface [IContainer](https://github.com/zhouhoujun/tsioc/blob/master/packages/core/src/IContainer.ts)

```ts

// 1. register a class
container.register(Person);

// 2. register a factory;
container.register(Person, (container)=> {
    ...
    return new Person(...);
});

// 3. register with keyword
container.register('keyword', Perosn);

// 4. register with alais
container.register(new Registration(Person, aliasname));

// register singleton
container.registerSingleton(Person)

// bind provider
container.bindProvider
// bind providers.
container.bindProviders

```

### Injector is basic ioc injector.

see interface [IInjector](https://github.com/zhouhoujun/tsioc/blob/master/packages/ioc/src/IInjector.ts)

```ts

// get the injector of Person class type injected.
let injector =  container.getInjector(Person);

// create new injector
let injector = container.createInjector();
// or create new injector via
let injector = container.getInstance(InjectorFactoryToken);
```

### Invoke method

you can use yourself `MethodAccessor` by implement IMethodAccessor, register `MethodAccessorToken` with your `MethodAccessor` in container,   see [interface](https://github.com/zhouhoujun/tsioc/blob/master/packages/ioc/src/IIocContainer.ts).

```ts

@Injectable()
class Person {
    constructor() {

    }
    say() {
        return 'I love you.'
    }
}

@Injectable()
class Child extends Person {
    constructor() {
        super();
    }
    say() {
        return 'Mama';
    }
}

class MethodTest {
    constructor() {

    }

    @AutoWried
    sayHello(person: Person) {
        return person.say();
    }
}

class MethodTest2 {
    constructor() {

    }

    @AutoWried()
    sayHello( @Inject(Child) person: Person) {
        return person.say();
    }
}

class MethodTest3 {
    constructor() {

    }

    @AutoWried
    sayHello( @Inject(Child) personA: Person, personB: Person) {
        return personA.say() + ', '  + personB.say();
    }
}

@Injectable()
class Geet {
    constructor(private name: string){

    }

    print(hi?:string){
        return `${hi}, from ${this.name}`;
    }
}

container.register(Geet);

container.invoke(Geet, gt=> gt.print, ... //inject providers.)

let instance = container.resolve(Geet, )

container.invoke(instance, gt=> gt.print, ...//inject providers.);
container.invoke(instance, 'print', ...);

container.register(MethodTest);
container.invoke(MethodTest, 'sayHello');

container.register(MethodTest2);
container.invoke(MethodTest2, tg=> tg.sayHello);

container.register(MethodTest3);
container.invoke(MethodTest3, 'sayHello');


```


## Use Demo

```ts

import { Method, ContainerBuilder, AutoWired, Injectable, Singleton, IContainer, ParameterMetadata, Param, Aspect } from '@tsdi/core';


export class SimppleAutoWried {
    constructor() {
    }

    @AutoWired()
    dateProperty: Date;
}

@Singleton()
export class Person {
    name = 'testor';
}
// > v0.3.5 all class decorator can depdence.
@Singleton()
// @Injectable()
export class RoomService {
    constructor() {

    }
    @AutoWired()
    current: Date;
}

@Injectable()
export class ClassRoom {
    constructor(public service: RoomService) {

    }
}

export abstract class Student {
    constructor() {
    }
    abstract sayHi(): string;
}

@Injectable({ provide: Student })
export class MiddleSchoolStudent extends Student {
    constructor() {
        super();
    }
    sayHi() {
        return 'I am a middle school student';
    }
}

@Injectable()
export class MClassRoom {
    @AutoWired(MiddleSchoolStudent)
    leader: Student;
    constructor() {

    }
}


@Injectable({ provide: Student, alias: 'college' })
export class CollegeStudent extends Student {
    constructor() {
        super();
    }
    sayHi() {
        return 'I am a college student';
    }
}

@Injectable()
export class CollegeClassRoom {
    constructor(
        @Param(CollegeStudent)
        @AutoWired(CollegeStudent)
        public leader: Student) {

    }
}


@Injectable()
export class InjMClassRoom {
    // @Inject(MiddleSchoolStudent)
    @Inject()
    // @Inject({ type: MiddleSchoolStudent })
    // @Inject({ provider: MiddleSchoolStudent })
    leader: Student;
    constructor() {

    }
}


export interface IClassRoom {
    leader: Student;
}

@Injectable()
export class InjCollegeClassRoom {
    constructor(
        // all below decorator can work, also @AutoWired(), @Param() is.
        // @Inject(new Registration(Student, 'college')) // need CollegeStudent also register.
        @Inject(CollegeStudent)
        // @Inject({ provider: CollegeStudent })
        // @Inject({ provider: Student, alias: 'college' }) //need CollegeStudent also register.
        // @Inject({ type: CollegeStudent })
        public leader: Student
    ) {

    }
}

@Injectable()
export class InjCollegeAliasClassRoom {
    constructor(
        // all below decorator can work, also @AutoWired(), @Param() is.
        @Inject(new Registration(Student, 'college')) // need CollegeStudent also register.
        // @Inject(CollegeStudent)
        // @Inject({ provider: CollegeStudent })
        // @Inject({ provider: Student, alias: 'college' }) // need CollegeStudent also register.
        // @Inject({ type: CollegeStudent })
        public leader: Student
    ) {

    }
}


@Injectable('StringClassRoom')
export class StingMClassRoom {
    // @Inject(MiddleSchoolStudent)
    @Inject()
    // @Inject({ type: MiddleSchoolStudent })
    leader: Student;
    constructor() {

    }
}

export class StringIdTest {
    constructor(@Inject('StringClassRoom') public room: IClassRoom) {

    }
}

export const CollClassRoom = Symbol('CollegeClassRoom');

@Injectable(CollClassRoom)
export class SymbolCollegeClassRoom {

    @Inject(CollegeStudent)
    leader: Student;
    constructor() {

    }
}

export class SymbolIdest {
    @Inject(CollClassRoom)
    public room: IClassRoom
    constructor() {

    }
}

@Injectable()
class MethodTestPerson {
    say() {
        return 'hello word.'
    }
}

class MethodTest {

    @AutoWried
    sayHello(person: MethodTestPerson) {
        return person.say();
    }
}


// 1. Custom register one class will auto inject depdence class (must has a class decorator).

let builder = new ContainerBuilder();
let container = builder.create();


container.register(MethodTest);
container.invoke(MethodTest, 'sayHello')
    .then(data =>{
        console.log(data);
    });

container.register(SimppleAutoWried);
let instance = container.get(SimppleAutoWried);
console.log(instance.dateProperty);


container.register(ClassRoom);
let room = container.get(ClassRoom);
console.log(room.service.current);

container.register(MiddleSchoolStudent);
container.register(CollegeStudent);

let student = container.get(Student);
console.log(student.sayHi());

let student2 = container.get(new Registration(Student, 'college'));

console.log(student2.sayHi());

let student3 = container.get(Student, 'college'));

console.log(student3.sayHi());


builder.build({
    files: __dirname + '/*{.ts,.js}'
})
    .then(container => {
        let instance = container.get(Student);
        console.log(instance.sayHi());

        let instance2 = container.get(new Registration(Student, 'college'));
        console.log(instance2.sayHi());

        let instance3 = container.get(Student, 'college');
        console.log(instance3.sayHi())
    });



```

## Extend decorator, Demo fo extends 

see AOP extends (https://github.com/zhouhoujun/tsioc/blob/master/packages/aop/src/AopModule.ts)
You can extend yourself decorator via:


## Documentation
Documentation is available on the
* [@tsdi/ioc document](https://github.com/zhouhoujun/tsioc/tree/master/packages/ioc).
* [@tsdi/aop document](https://github.com/zhouhoujun/tsioc/tree/master/packages/aop).
* [@tsdi/core document](https://github.com/zhouhoujun/tsioc/tree/master/packages/core).
* [@tsdi/boot document](https://github.com/zhouhoujun/tsioc/tree/master/packages/boot).
* [@tsdi/components document](https://github.com/zhouhoujun/tsioc/tree/master/packages/components).
* [@tsdi/compiler document](https://github.com/zhouhoujun/tsioc/tree/master/packages/compiler).
* [@tsdi/activities document](https://github.com/zhouhoujun/tsioc/tree/master/packages/activities).
* [@tsdi/pack document](https://github.com/zhouhoujun/tsioc/tree/master/packages/pack).
* [@tsdi/typeorm-adapter document](https://github.com/zhouhoujun/tsioc/tree/master/packages/typeorm-adapter).
* [@tsdi/unit document](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit).
* [@tsdi/unit-console document](https://github.com/zhouhoujun/tsioc/tree/master/packages/unit-console).
* [@tsdi/cli document](https://github.com/zhouhoujun/tsioc/tree/master/packages/cli).



### packages
[@tsdi/cli](https://www.npmjs.com/package/@tsdi/cli)
[@tsdi/ioc](https://www.npmjs.com/package/@tsdi/ioc)
[@tsdi/aop](https://www.npmjs.com/package/@tsdi/aop)
[@tsdi/core](https://www.npmjs.com/package/@tsdi/core)
[@tsdi/boot](https://www.npmjs.com/package/@tsdi/boot)
[@tsdi/components](https://www.npmjs.com/package/@tsdi/components)
[@tsdi/compiler](https://www.npmjs.com/package/@tsdi/compiler)
[@tsdi/activities](https://www.npmjs.com/package/@tsdi/activities)
[@tsdi/pack](https://www.npmjs.com/package/@tsdi/pack)
[@tsdi/typeorm-adapter](https://www.npmjs.com/package/@tsdi/typeorm-adapter)
[@tsdi/unit](https://www.npmjs.com/package/@tsdi/unit)
[@tsdi/unit-console](https://www.npmjs.com/package/@tsdi/unit-console)

## License

MIT © [Houjun](https://github.com/zhouhoujun/)