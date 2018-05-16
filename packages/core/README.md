# packaged @ts-ioc/core

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`@ts-ioc/core` is AOP, Ioc container, via typescript decorator.

version 2+ of [`tsioc`](https://www.npmjs.com/zhouhoujun/package/tsioc)
# Install

```shell

npm install @ts-ioc/core

// in browser
npm install @ts-ioc/platform-browser

// in server
npm install @ts-ioc/platform-server
```

## add extends modules

### use aop

```shell

// install aop
npm install @ts-ioc/aop

```

```ts

import { AopModule } from '@ts-ioc/aop';
// in server
import { ContainerBuilder } from '@ts-ioc/platform-server'
// in browser
import { ContainerBuilder } from '@ts-ioc/platform-browser'

let builder = new ContainerBuilder();

let container = build.create();

container.use(AopModule);

```

### use aop logs

```shell
// install aop logs
npm install @ts-ioc/logs
```

```ts

import { LogModule } from '@ts-ioc/logs';
// in server
import { ContainerBuilder } from '@ts-ioc/platform-server'
// in browser
import { ContainerBuilder } from '@ts-ioc/platform-browser'

let builder = new ContainerBuilder();

let container = build.create();

container.use(LogModule);

```

# Documentation

class name First char must be UpperCase.

## Ioc

1. Register one class will auto register depdence class (must has a class decorator).

2. get Instance can auto create constructor param.  (must has a class decorator or register in container).

### Has [decorators](https://github.com/zhouhoujun/tsioc/tree/master/packages/core/src/core/decorators)

1. `@Abstract`  abstract class decorator.
2. `@AutoRun`   class, method decorator, use to define the class auto run (via a method or not) after registered.
3. `@AutoWried`  property or param decorator, use to auto wried type instance or value to the instance of one class with the decorator.
4. `@Component` class decortator, use to define the class. it can setting provider to some token, singleton or not. it will execute  [`ComponentLifecycle`](https://github.com/zhouhoujun/tsioc/blob/master/packages/core/src/core/ComponentLifecycle.ts) hooks when create a instance .
5. `@Inject`  property or param decorator, use to auto wried type instance or value to the instance of one class with the decorator.
6. `@Injectable` class decortator, use to define the class. it can setting provider to some token, singleton or not.
7. `@IocModule` class decortator, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
8. `@Method` method decorator.
9. `@Param`   param decorator, use to auto wried type instance or value to the instance of one class with the decorator.
10. `@Singleton` class decortator, use to define the class is singleton.

### create Container

* in browser can not:
    1. use syncBuild
    2. syncLoadModule
    3. can not use minimatch to match file.
    4. support es5 uglify, [@ts-ioc/class-annotations](https://www.npmjs.com/package/@ts-ioc/class-annotations)  [] or [typescript-class-annotations](https://www.npmjs.com/package/typescript-class-annotations) to get class annotations before typescript compile.

```ts
let builder = new ContainerBuilder();

// 1. via create.
let container = builder.create();

// 2. via build.
//with BuildOptions to auto register module.
let container = await builder.build({
  files: [__dirname +'/controller/**/*.ts', __dirname + '/*.model.js'],
  moudles:['node-modules-name', ClassType]
});

// 3. via syncBuild
let container = builder.syncBuild({
  moudles:['node-modules-name', ClassType]
});

```

### init & register Container

see interface [IContainer](https://github.com/zhouhoujun/tsioc/blob/master/packages/core/src/IContainer.ts)

```ts
// 1.  you can load modules by self
await builder.loadModule(container, {
  files: [__dirname +'/controller/**/*.ts', __dirname + '/*.model.js'],
  moudles:['node-modules-name', ClassType]
});
// 2. load sync
builder.syncLoadModule(container, {
  moudles:['node-modules-name', ClassType]
});

// 3. use modules
container.use(...modules);

// 4. register a class
container.register(Person);

// 5. register a factory;
container.register(Person, (container)=> {
    ...
    return new Person(...);
});

// 6. register with keyword
container.register('keyword', Perosn);

// 8. register with alais
container.register(new Registration(Person, aliasname));

```

### get instance of type

```ts
// 8. get instance use get method of container.
/**
 * Retrieves an instance from the container based on the provided token.
 *
 * @template T
 * @param {Token<T>} token
 * @param {string} [alias]
 * @returns {T}
 * @memberof IContainer
 */
get<T>(token: Token<T>, alias?: string): T;

/**
 * resolve type instance with token and param provider.
 *
 * @template T
 * @param {Token<T>} token
 * @param {...Providers[]} providers
 * @returns {T}
 * @memberof IContainer
 */
resolve<T>(token: Token<T>, ...providers: Providers[]): T;

//get simple person
let person = container.get(Person);
//get colloge person
let person = container.get(Person, 'Colloge');

// resolve with providers
container.resolve(Person, ...providers);

```

### Invoke method

you can use yourself `MethodAccessor` by implement IMethodAccessor, register `MethodAccessorToken` with your `MethodAccessor` in container,   see interface [IMethodAccessor](https://github.com/zhouhoujun/@ts-ioc/core/blob/master/packages/core/src/IMethodAccessor.ts).

```ts

@Injectable
class Person {
    constructor() {

    }
    say() {
        return 'I love you.'
    }
}

@Injectable
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

    @Method
    sayHello(person: Person) {
        return person.say();
    }
}

class MethodTest2 {
    constructor() {

    }

    @Method()
    sayHello( @Inject(Child) person: Person) {
        return person.say();
    }
}

class MethodTest3 {
    constructor() {

    }

    @Method
    sayHello( @Inject(Child) personA: Person, personB: Person) {
        return personA.say() + ', '  + personB.say();
    }
}

@Injectable
class Geet {
    constructor(private name: string){

    }

    print(hi?:string){
        return `${hi}, from ${this.name}`;
    }
}

container.register(Geet);

container.invoke(Geet, 'print', null,
{hi: 'How are you.', name:'zhou' },
{ hi: (container: IContainer)=> 'How are you.' }, ... },
{ hi:{type: Token<any>, value: any |(container: IContainer)=>any }},
Provider.createParam('name', 'zhou'),
Provider.create('hi', value:'Hello'),
// or use ProviderMap.
...
)

container.resolve(Geet,
{name: 'zhou' },
{ name: (container: IContainer)=>any } },
{name:{type: Token<any>, value: any|(container: IContainer)=>any }})



container.register(MethodTest);
container.invoke(MethodTest, 'sayHello')
    .then(data =>{
        console.log(data);
    });

container.register(MethodTest2);
container.invoke(MethodTest2, 'sayHello')
    .then(data =>{
        console.log(data);
    });

container.register(MethodTest3);
container.invoke(MethodTest3, 'sayHello')
    .then(data =>{
        console.log(data);
    });




```


## Use Demo

```ts

import { Method, ContainerBuilder, AutoWired, Injectable, Singleton, IContainer, ParameterMetadata, Param, Aspect } from '@ts-ioc/core';


export class SimppleAutoWried {
    constructor() {
    }

    @AutoWired
    dateProperty: Date;
}

@Singleton
export class Person {
    name = 'testor';
}
// > v0.3.5 all class decorator can depdence.
@Singleton
// @Injectable
export class RoomService {
    constructor() {

    }
    @AutoWired
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

@Injectable
export class CollegeClassRoom {
    constructor(
        @Param(CollegeStudent)
        @AutoWired(CollegeStudent)
        public leader: Student) {

    }
}


@Injectable
export class InjMClassRoom {
    // @Inject(MiddleSchoolStudent)
    @Inject
    // @Inject({ type: MiddleSchoolStudent })
    // @Inject({ provider: MiddleSchoolStudent })
    leader: Student;
    constructor() {

    }
}


export interface IClassRoom {
    leader: Student;
}

@Injectable
export class InjCollegeClassRoom {
    constructor(
        // all below decorator can work, also @AutoWired, @Param is.
        // @Inject(new Registration(Student, 'college')) // need CollegeStudent also register.
        @Inject(CollegeStudent)
        // @Inject({ provider: CollegeStudent })
        // @Inject({ provider: Student, alias: 'college' }) //need CollegeStudent also register.
        // @Inject({ type: CollegeStudent })
        public leader: Student
    ) {

    }
}

@Injectable
export class InjCollegeAliasClassRoom {
    constructor(
        // all below decorator can work, also @AutoWired, @Param is.
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
    @Inject
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

@Injectable
class MethodTestPerson {
    say() {
        return 'hello word.'
    }
}

class MethodTest {

    @Method
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

## Extend decorator

see interface [LifeScope](https://github.com/zhouhoujun/@ts-ioc/core/blob/master/src/LifeScope.ts)
You can extend yourself decorator via:

1. `createClassDecorator`

```ts
/**
 * create class decorator
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {*}
 */
export function createClassDecorator<T extends ClassMetadata>(name: string, adapter?: MetadataAdapter, metadataExtends?: MetadataExtends<T>): IClassDecorator<T>
```

2. `createClassMethodDecorator`

```ts
/**
 * create method decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns
 */
export function createMethodDecorator<T extends MethodMetadata>
```

3. `createClassMethodDecorator`

```ts
/**
 * create decorator for class and method.
 *
 * @export
 * @template T
 * @param {string} name
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {IClassMethodDecorator<T>}
 */
export function createClassMethodDecorator<T extends TypeMetadata>(name: string, adapter?: MetadataAdapter, metadataExtends?: MetadataExtends<T>): IClassMethodDecorator<T>
```

4. `createParamDecorator`

```ts
/**
 * create parameter decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns
 */
export function createParamDecorator<T extends ParameterMetadata>

```

5. `createPropDecorator`

```ts
/**
 * create property decorator.
 *
 * @export
 * @template T metadata type.
 * @param {string} name decorator name.
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns
 */
export function createPropDecorator<T extends PropertyMetadata>(name: string, adapter?: MetadataAdapter, metadataExtends?: MetadataExtends<T>): IPropertyDecorator<T>
```

6. `createParamPropDecorator`

```ts
/**
 * create parameter or property decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {IParamPropDecorator<T>}
 */
export function createParamPropDecorator<T extends ParamPropMetadata>(
    name: string,
    adapter?: MetadataAdapter,
    metadataExtends?: MetadataExtends<T>): IParamPropDecorator<T>
```

7. `createDecorator`

```ts
/**
 * create dectorator for class params props methods.
 *
 * @export
 * @template T
 * @param {string} name
 * @param {MetadataAdapter} [adapter]  metadata adapter
 * @param {MetadataExtends<T>} [metadataExtends] add extents for metadata.
 * @returns {*}
 */
export function createDecorator<T>(name: string, adapter?: MetadataAdapter, metadataExtends?: MetadataExtends<T>): any
```

### Demo fo extends yourself decorator

```ts

//eg.
// 1. create decorator
export interface IControllerDecorator<T extends ControllerMetadata> extends IClassDecorator<T> {
    (routePrefix: string, provide?: Registration<any> | string, alias?: string): ClassDecorator;
    (target: Function): void;
}
export const Controller: IControllerDecorator<ControllerMetadata> =
    createClassDecorator<ControllerMetadata>('Controller', (args: ArgsIterator) => {
        args.next<ControllerMetadata>({
            isMetadata: (arg) => isClassMetadata(arg, ['routePrefix']),
            match: (arg) => isString(arg),
            setMetadata: (metadata, arg) => {
                metadata.routePrefix = arg;
            }
        });
    }) as IControllerDecorator<ControllerMetadata>;

export const Aspect: IClassDecorator<ClassMetadata> = createClassDecorator<ClassMetadata>('Aspect', null, (metadata) => {
    metadata.singleton = true;
    return metadata;
});


// 2. add decorator action
 let lifeScope = container.get(LifeScopeToken);
 let factory = new AopActionFactory();
 lifeScope.addAction(factory.create(AopActions.registAspect), DecoratorType.Class, IocState.design);


// 3. register decorator
lifeScope.registerDecorator(Aspect, AopActions.registAspect);

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