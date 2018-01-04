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

class name First char must be UpperCase.

## New Features

* 1.1.4
    1. add isBoolean isNull isDate check.  update task uglify tsioc.umd.js
* 1.1.3
    1. update Symbol Class Check, to support IE9+
    2. `IE9 or lower only check name of class first word is UpperCase.`

* 1.1.2
    1. add custom MapSet to support browser without Map.

* 1.1.1
    1. refactor.
    2. support browser, use `bundles/tsioc.umd.js`.

* 0.6.21
    1. improvement method invoker, ParamProvider match name and index faild, will match provider via type of param is equal.
    2. improvement AOP advice invoker, add more param provider.
    3. have not register Type, container.get now will return null;
* 0.6.18
    1. complie src to es5, support in browser. fix class check bug in es5 model. class name First char must be UpperCase.
* 0.6.15
    1. add resolve. support resolve instance with providers. `resolve<T>(token: Token<T>, notFoundValue?: T, ...providers: ParamProvider[]);`
    2. add `createSyncParams(params: IParameter[], ...providers: ParamProvider[]): any[]` and `createParams(params: IParameter[], ...providers: AsyncParamProvider[]): Promise<any[]>`
* 0.6.12
    1. support Method paramerter name opertor.  Method Invoker ParamProvider can setting  index  as  paramerter name.


## Ioc

1. Register one class will auto register depdence class (must has a class decorator).

2. get Instance can auto create constructor param.  (must has a class decorator or register in container).

### create Container

* in browser can not:
    1. use syncBuild
    2. syncLoadModule
    3. can not use minimatch to match file.

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

It's a dynamic aop base on ioc.

define a Aspect class, must with decorator:

* @Aspect

define advice decorator have

* @Before(matchstring|RegExp)

* @After(matchstring|RegExp)

* @Around(matchstring|RegExp)

* AfterThrowing(matchstring|RegExp)

* AfterReturning(matchstring|RegExp)

```ts
import { Joinpoint, Around, Aspect } from 'tsioc';


@Aspect
export class DebugLog {

    @Before(/\w+Controller.\w+$/)
    // @Before('execution(*Controller.*)')
    Beforlog(joinPoint: Joinpoint) {
        console.log('aspect Before log:', joinPoint.fullName);
    }

    @Around('execution(*Controller.*)')
    log(joinPoint: Joinpoint) {
        console.log('aspect Around log, method name:', joinPoint.fullName, ' state:', joinPoint.state, ' Args:', joinPoint.args, ' returning:', joinPoint.returning, ' throwing:', joinPoint.throwing);
    }
}



```

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
 let lifeScope = container.get<LifeScope>(symbols.LifeScope);
 let factory = new AopActionFactory();
 lifeScope.addAction(factory.create(AopActions.registAspect), DecoratorType.Class, IocState.design);


// 3. register decorator
lifeScope.registerDecorator(Aspect, AopActions.registAspect);

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
     * get life scope of container.
     *
     * @returns {LifeScope}
     * @memberof IContainer
     */
    getLifeScope(): LifeScope;

}


import { Metadate, ProviderMetadata, ActionComponent, ActionData, DecoratorType } from './core';
import { Type } from './Type';
import { Token, Express } from './types';
import { IParameter } from './index';

/**
 * Decorator summary.
 *
 * @export
 * @interface DecorSummary
 */
export interface DecorSummary {
    /**
     * decorator name.
     *
     * @type {string}
     * @memberof DecorSummary
     */
    name: string;
    /**
     * decorator types.
     *
     * @type {string}
     * @memberof DecorSummary
     */
    types: string;
    /**
     * decorator registed actions.
     *
     * @type {string[]}
     * @memberof DecorSummary
     */
    actions: string[];
}

/**
 * life scope of decorator.
 *
 * @export
 * @interface LifeScope
 */
export interface LifeScope {

    /**
     * execute the action work.
     *
     * @template T
     * @param {DecoratorType} type action for decorator type.
     * @param {ActionData<T>} data execute data;
     * @param {string} names execute action name.
     * @memberof ActionComponent
     */
    execute<T>(type: DecoratorType, data: ActionData<T>, ...names: string[]);

    /**
     * register action.
     *
     * @param {ActionComponent} action the action.
     * @param {DecoratorType} type action for decorator type.
     * @param {...string[]} express the path  of action point to add the action.
     * @returns {LifeScope}
     * @memberof LifeScope
     */
    addAction(action: ActionComponent, type: DecoratorType, ...nodepaths: string[]): LifeScope;

    /**
     * register decorator.
     *
     * @param {Function} decorator decorator
     * @param {...string[]} actions action names.
     * @memberof LifeScope
     */
    registerDecorator(decorator: Function, ...actions: string[]): LifeScope;

    /**
     * register decorator.
     *
     * @param {Function} decorator decorator
     * @param {DecoratorType} type  custom set decorator type.
     * @param {...string[]} actions action names.
     * @memberof LifeScope
     */
    registerCustomDecorator(decorator: Function, type: DecoratorType, ...actions: string[]): LifeScope;

    /**
     * filter match decorators.
     *
     * @param {Express<DecorSummary, boolean>} express
     * @returns {DecorSummary[]}
     * @memberof LifeScope
     */
    filerDecorators(express: Express<DecorSummary, boolean>): DecorSummary[];

    getClassDecorators(match?: Express<DecorSummary, boolean>): DecorSummary[];

    getMethodDecorators(match?: Express<DecorSummary, boolean>): DecorSummary[];

    getPropertyDecorators(match?: Express<DecorSummary, boolean>): DecorSummary[];

    getParameterDecorators(match?: Express<DecorSummary, boolean>): DecorSummary[];


    /**
     * get decorator type.
     *
     * @param {*} decorator
     * @returns {DecoratorType}
     * @memberof LifeScope
     */
    getDecoratorType(decorator: any): DecoratorType;

    /**
     * is vaildate dependence type or not. dependence type must with class decorator.
     *
     * @template T
     * @param {any} target
     * @returns {boolean}
     * @memberof LifeScope
     */
    isVaildDependence<T>(target: any): boolean;

    /**
     * is singleton or not.
     *
     * @template T
     * @param {Type<T>} type
     * @returns {boolean}
     * @memberof LifeScope
     */
    isSingletonType<T>(type: Type<T>): boolean;

    /**
     * get action by name.
     *
     * @param {string} name
     * @returns {ActionComponent}
     * @memberof LifeScope
     */
    getAtionByName(name: string): ActionComponent;

    /**
     * get class action.
     *
     * @returns {ActionComponent}
     * @memberof LifeScope
     */
    getClassAction(): ActionComponent;

    /**
     * get method action.
     *
     * @returns {ActionComponent}
     * @memberof LifeScope
     */
    getMethodAction(): ActionComponent;

    /**
     * get propert action.
     *
     * @returns {ActionComponent}
     * @memberof LifeScope
     */
    getPropertyAction(): ActionComponent;

    /**
     * get parameter action.
     *
     * @returns {ActionComponent}
     * @memberof LifeScope
     */
    getParameterAction(): ActionComponent;


    /**
     * get constructor parameters metadata.
     *
     * @template T
     * @param {Type<T>} type
     * @returns {IParameter[]}
     * @memberof IContainer
     */
    getConstructorParameters<T>(type: Type<T>): IParameter[];

    /**
     * get method params metadata.
     *
     * @template T
     * @param {Type<T>} type
     * @param {T} instance
     * @param {(string | symbol)} propertyKey
     * @returns {IParameter[]}
     * @memberof IContainer
     */
    getMethodParameters<T>(type: Type<T>, instance: T, propertyKey: string | symbol): IParameter[];
}



/**
 * execution, invoke some type method
 *
 * @export
 * @interface IExecution
 */
export interface IMethodAccessor {

    /**
     * try to async invoke the method of intance,  if no instance will create by type.
     *
     * @template T
     * @param {Type<any>} targetType  type of object
     * @param {(string | symbol)} propertyKey method name
     * @param {*} [target] instance of type.
     * @param {...AsyncParamProvider[]} providers param provider.
     * @returns {Promise<T>}
     * @memberof IMethodAccessor
     */
    invoke<T>(targetType: Type<any>, propertyKey: string | symbol, target?: any, ...providers: AsyncParamProvider[]): Promise<T>;

    /**
     * try to invoke the method of intance,  if no instance will create by type.
     *
     * @template T
     * @param {Type<any>} targetType
     * @param {(string | symbol)} propertyKey
     * @param {*} [target]
     * @param {...ParamProvider[]} providers
     * @returns {T}
     * @memberof IMethodAccessor
     */
    syncInvoke<T>(targetType: Type<any>, propertyKey: string | symbol, target?: any, ...providers: ParamProvider[]): T;


    /**
     * create params instances with IParameter and provider.
     *
     * @param {IParameter[]} params
     * @param {...ParamProvider[]} providers
     * @returns {any[]}
     * @memberof IMethodAccessor
     */
    createSyncParams(params: IParameter[], ...providers: ParamProvider[]): any[];

    /**
     * create params instances with IParameter and provider
     *
     * @param {IParameter[]} params
     * @param {...AsyncParamProvider[]} providers
     * @returns {Promise<any[]>}
     * @memberof IMethodAccessor
     */
    createParams(params: IParameter[], ...providers: AsyncParamProvider[]): Promise<any[]>;

}

```


Documentation is available on the
[tsioc docs site](https://github.com/zhouhoujun/tsioc).

## License

MIT © [Houjun](https://github.com/zhouhoujun/)