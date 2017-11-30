# packaged tsioc

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/tsioc).

`tsioc` is AOP, Ioc container, via typescript decorator.

now package rename as [`tsioc`](https://www.npmjs.com/package/tsioc)
# Install

```shell

npm install tsioc

```

# Documentation

## Ioc

1. Register one class will auto register depdence class (must has a class decorator).

2. get Instance can auto create constructor param.  (must has a class decorator or register in container).

### create Container

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

// 3. register a class
container.register(Person);

// 4. register a factory;
container.register(Person, (container)=> {
    ...
    return new Person(...);
});

// 5. register with keyword
container.register('keyword', Perosn);

// 7. register with alais
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
 * @param {T} [notFoundValue]
 * @returns {T}
 * @memberof IContainer
 */
get<T>(token: Token<T>, alias?: string, notFoundValue?: T): T;

//get simple person
let person = container.get(Person);
//get colloge person
let person = container.get(Person, 'Colloge');

```

### Invoke method

you can use yourself `MethodAccessor` by implement IMethodAccessor, register `symbols.IMethodAccessor` with your `MethodAccessor` in container,   see below.

```ts
/**
 * try to invoke the method of intance,  if no instance will create by type.
 *
 * @template T
 * @param {Type<any>} type  type of object
 * @param {(string | symbol)} propertyKey method name
 * @param {*} [instance] instance of type.
 * @param {...AsyncParamProvider[]} providers param provider.
 * @returns {Promise<T>}
 * @memberof IMethodAccessor
 */
invoke<T>(type: Type<any>, propertyKey: string | symbol, instance?: any, ...providers: AsyncParamProvider[]): Promise<T>;

/**
 * try to invoke the method of intance,  if no instance will create by type.
 *
 * @template T
 * @param {Type<any>} type
 * @param {(string | symbol)} propertyKey
 * @param {*} [instance]
 * @param {...ParamProvider[]} providers
 * @returns {T}
 * @memberof IMethodAccessor
 */
syncInvoke<T>(type: Type<any>, propertyKey: string | symbol, instance?: any, ...providers: ParamProvider[]): T


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

## AOP


## Use Demo

```ts

import { Method, ContainerBuilder, AutoWired, Injectable, Singleton, IContainer, ParameterMetadata, Param, Aspect } from 'tsioc';


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
    files: __dirname + '/debug.js'
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


// 2. create decorator action
let builder = new ActionBuilder();
let actionComponent = builder.build(Controller.toString(), this.getDecoratorType(Controller),
    ActionType.provider);
actionComponent.add(...);

// 3. register decorator
let container = builder.create();
container.registerDecorator<ControllerMetadata>(
    Controller,
    actionComponent);

```

## Container Interface

see more interface. all document is typescript .d.ts.

```ts
/**
 * container interface.
 *
 * @export
 * @interface IContainer
 */
export interface IContainer extends IMethodAccessor {

    /**
     * has register the token or not.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @returns {boolean}
     * @memberof IContainer
     */
    has<T>(token: Token<T>, alias?: string): boolean;
    /**
     * Retrieves an instance from the container based on the provided token.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @param {T} [notFoundValue]
     * @returns {T}
     * @memberof IContainer
     */
    get<T>(token: Token<T>, alias?: string, notFoundValue?: T): T;


    /**
     * get token.
     *
     * @template T
     * @param {SymbolType<T>} target
     * @param {string} [alias]
     * @returns {Token<T>}
     * @memberof IContainer
     */
    getToken<T>(target: SymbolType<T>, alias?: string): Token<T>;
    /**
     * get tocken key.
     *
     * @template T
     * @param {Token<T>} token
     * @param {string} [alias]
     * @returns {SymbolType<T>}
     * @memberof IContainer
     */
    getTokenKey<T>(token: Token<T>, alias?: string): SymbolType<T>;

    /**
     * register type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {Factory<T>} [value]
     * @memberOf IContainer
     */
    register<T>(token: Token<T>, value?: Factory<T>);

    /**
     * unregister the token
     *
     * @template T
     * @param {Token<T>} token
     * @memberof IContainer
     */
    unregister<T>(token: Token<T>);

    /**
     * bind provider
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Token<T> | Factory<T>} provider
     * @memberof IContainer
     */
    bindProvider<T>(provide: Token<T>, provider: Token<T> | Factory<T>);

    /**
     * register stingleton type.
     *
     * @template T
     * @param {Token<T>} token
     * @param {Factory<T>} value
     *
     * @memberOf IContainer
     */
    registerSingleton<T>(token: Token<T>, value?: Factory<T>);

    /**
     * register decorator
     *
     * @param {Function} decorator
     * @param {ActionComponent} actions
     * @memberof IContainer
     */
    registerDecorator(decorator: Function, actions: ActionComponent);

    /**
     * is vaildate dependence type or not. dependence type must with class decorator.
     *
     * @template T
     * @param {any} target
     * @returns {boolean}
     * @memberof IContainer
     */
    isVaildDependence<T>(target: any): boolean;


    /**
     * get decorator type.
     *
     * @param {*} decorator
     * @returns {DecoratorType}
     * @memberof IContainer
     */
    getDecoratorType(decorator: any): DecoratorType;


    /**
     * get constructor parameters metadata.
     *
     * @template T
     * @param {Type<T>} type
     * @returns {Token<any>>[]}
     * @memberof IContainer
     */
    getConstructorParameter<T>(type: Type<T>): Token<any>[];

    /**
     * get method params metadata.
     *
     * @template T
     * @param {Type<T>} type
     * @param {T} instance
     * @param {(string | symbol)} propertyKey
     * @returns {Token<any>[]}
     * @memberof IContainer
     */
    getMethodParameters<T>(type: Type<T>, instance: T, propertyKey: string | symbol): Token<any>[];


}


/**
 * execution, invoke some type method
 *
 * @export
 * @interface IExecution
 */
export interface IMethodAccessor {

    /**
     * try to invoke the method of intance,  if no instance will create by type.
     *
     * @template T
     * @param {Type<any>} type  type of object
     * @param {(string | symbol)} propertyKey method name
     * @param {*} [instance] instance of type.
     * @param {...ParamProvider[]} providers param provider.
     * @returns {Promise<T>}
     * @memberof IMethodAccessor
     */
    invoke<T>(type: Type<any>, propertyKey: string | symbol, instance?: any, ...providers: ParamProvider[]): Promise<T>;
}

```


Documentation is available on the
[tsioc docs site](https://github.com/zhouhoujun/tsioc).

## License

MIT © [Houjun](https://github.com/zhouhoujun/)