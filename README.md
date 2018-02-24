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

## Ioc

1. Register one class will auto register depdence class (must has a class decorator).

2. get Instance can auto create constructor param.  (must has a class decorator or register in container).

### create Container

* in browser can not:
    1. use syncBuild
    2. syncLoadModule
    3. can not use minimatch to match file.
    4. support es5 uglify, use [typescript-class-annotations](https://www.npmjs.com/package/typescript-class-annotations) to get class annotations before typescript compile.

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

see interface [IContainer](https://github.com/zhouhoujun/tsioc/blob/master/src/IContainer.ts)

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

you can use yourself `MethodAccessor` by implement IMethodAccessor, register `symbols.IMethodAccessor` with your `MethodAccessor` in container,   see interface [IMethodAccessor](https://github.com/zhouhoujun/tsioc/blob/master/src/IMethodAccessor.ts).

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

## AOP

It's a dynamic aop base on ioc.

define a Aspect class, must with decorator:

* @Aspect

define advice decorator have

* @Before(matchstring|RegExp)

* @After(matchstring|RegExp)

* @Around(matchstring|RegExp)

* @AfterThrowing(matchstring|RegExp)

* @AfterReturning(matchstring|RegExp)

* @Pointcut(matchstring|RegExp)

see [simples](https://github.com/zhouhoujun/tsioc/tree/master/test/aop)

```ts
import { Joinpoint, Around, Aspect , Pointcut, TypeMetadata, IClassMethodDecorator, createClassMethodDecorator} from 'tsioc';

export const Authorization: IClassMethodDecorator<TypeMetadata> = createClassMethodDecorator<TypeMetadata>('Authorization');

// auth check simple.
@Aspect
export class AuthAspect {
    // pointcut for method has @Authorization decorator.
    @Pointcut('@annotation(Authorization)', 'authAnnotation')
    auth(joinPoint: Joinpoint, authAnnotation:MethodMetadata[]) {
        console.log('aspect annotation Before log, method name:', joinPoint.fullName, ' state:', joinPoint.state, ' returning:', joinPoint.returning, ' throwing:', joinPoint.throwing);
    }
}

@Aspect
export class SecrityAspect {
    // before AuthAspect.auth check some.
    @Before('execution(AuthAspect.auth)', 'authAnnotation')
    sessionCheck(authAnnotation:MethodMetadata[],joinPoint: Joinpoint) {
        console.log('aspect execution check session secrity Before AnnotationAspect.auth, method name:', joinPoint.fullName, ' state:', joinPoint.state, ' returning:', joinPoint.returning, ' throwing:', joinPoint.throwing);
    }
}

// Log simple
@Singleton
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

## New Features

* 1.3.16
    1. set only with `@Component` decorator have bind `CoreActions.componentBeforeInit, CoreActions.componentInit` actions. auto invoke `beforeInit`, `onInit` hooks

* 1.3.15
    1. support es5 uglify.  modify isClass  check  way to support uglify min js.  use [typescript-class-annotations](https://www.npmjs.com/package/typescript-class-annotations) to get class annotations before typescript compile.

* 1.3.14
    1. fix bug, object provider `{xxx:'MyClassName'}` string val equals to class alias will auto create Class instance. if want create the class instance, use Provider.create ...

* 1.3.13
    1. fix inherit sub class constructor and method param type and param name match error bug, confuse with the parent class param.

* 1.3.12
    1. add cache able features. Class metadata add `expires` to set class instance cache timeout when not used, via `CacheManager`.
    2. implement `ComponentLifecycle` `onDestory` hook for cache class instance.
    3. `@Injectable`, `@Component` and `@Abstract` decorator have bind `CoreActions.componentCache` actions.

* 1.3.11
    1. fix isNull type check bug.
    2. add [`ComponentLifecycle`](https://github.com/zhouhoujun/tsioc/blob/master/src/core/ComponentLifecycle.ts) lifecycle hooks for decorator (the decorator had bind liefcycle action) class to invoke auto. now only implement `beforeInit`, `onInit` hooks.

* 1.3.8
    1. fix bug of method params not match with providers when have not method decorator.
    2. fix function param can not invoke bug.
    
* 1.3.7
    1. fix error imports. remove unused code.
* 1.3.6
    1. refactor components, add generic type. `GComponent<T extends IComponent>`, `GComposite<T extends IComponent>` for extends easy.
    
* 1.3.5
    1. fix bug inherit property not auto inject in browser.  set param, method and property metadata will store all metadata include base class.
* 1.3.4
    1. class, method metadata only get own
    2. fix bug two dectorator match  * infinite loop error,  * only match class without @Aspcet.
* 1.3.3
    1. param provider name type match first. last with index order.
* 1.3.2
    1. refactor provider. improve to better code in browser.
    2. improve class check.
    3. add @Abstract decorator to declare Abstract class.

* 1.3.0
    1. refactor AOP. add Object instance entends action.
    2. support @annotation pointcut, add Pointcut decorator
    3. Aspect is not default singleton.
    4. add Pointcut decorator.
    5. Aspect can advice Aspect method or self pointcut method.
    

* 1.2.11
    1. improvement `hasPropertyMetadata`, `hasMethodMetadata`  has metadata check special propertyKey

* 1.2.10
    1. add `getTokenImpl` in `IContainer`, to get implement class Type for token.
    2. method invoke can use token, `invoke<T>(token: Token<any>, propertyKey: string | symbol, target?: any, ...providers: Providers[]): Promise<T>; syncInvoke<T>(token: Token<any>, propertyKey: string | symbol, target?: any, ...providers: Providers[]): T;`

* 1.2.8
    1. fix bug inherit decorator metadata from base with same decorator.
    2. add `getOwnTypeMetadata`, `getOwnMethodMetadata`,`getOwnPropertyMetadata`, `getOwnParamMetadata`.
    3. add feature, inject property and bindProvider can resolve with providers.

* 1.2.6
    1. fix bug metadata covered, use same decorator on method, property and paramerter.
    2. add `hasClassMetadata`, `hasMethodMetadata`, `hasPropertyMetadata` and `hasParamMetadata` to check if has decorator metadata.
* 1.2.5
    1. fix get invok when get method name.
    2. add get set advice aop.
* 1.2.4
    1. fix aop bugs.
    2. fix param name match bug.

* 1.2.2
    fix @NonePointcut zip error in tsioc.umd.js
* 1.2.1
    1. Refactor service provider, add ProviderMap, enable to config provider map options.
    eg. 
        `container.invoke(Geet, 'print', null,
        {hi: 'How are you.', name:'zhou' },
        { hi: (container: IContainer)=> 'How are you.' }, ... },
        { hi:{type: Token<any>, value: any |(container: IContainer)=>any }},
        {index:'name', value：'zhou'},
        {index:'hi', value:'Hello'}
        ...
        )

        container.resolve(Geet,
        {name: 'zhou' },
        { name: (container: IContainer)=>any } },
        {name:{type: Token<any>, value: any|(container: IContainer)=>any }})`

    2. add @NonePointcut decorator for class, to skip Aop aspect advice work.

    3. add @Component decorator for class.

* 1.2.0
    remove unused `notFoundValue` param in `get`, `resolve` method in container. if not register the token will return `null`.
    
* 1.1.7
    1. add isBoolean isNull isDate check. fix zip error, uglify tsioc.umd.js.
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
    1. add `resolve`. support `resolve` instance with `providers`. `resolve<T>(token: Token<T>, ...providers: ParamProvider[]);`
    2. add `createSyncParams(params: IParameter[], ...providers: ParamProvider[]): any[]` and `createParams(params: IParameter[], ...providers: AsyncParamProvider[]): Promise<any[]>`
* 0.6.12
    1. support Method paramerter name opertor.  Method Invoker ParamProvider can setting  index  as  paramerter name.



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

see interface [LifeScope](https://github.com/zhouhoujun/tsioc/blob/master/src/LifeScope.ts)
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

* [IMethodAccessor](https://github.com/zhouhoujun/tsioc/blob/master/src/IMethodAccessor.ts).
* [IContainer](https://github.com/zhouhoujun/tsioc/blob/master/src/IContainer.ts)
* [LifeScope](https://github.com/zhouhoujun/tsioc/blob/master/src/LifeScope.ts)

Documentation is available on the
[tsioc docs site](https://github.com/zhouhoujun/tsioc).

## License

MIT © [Houjun](https://github.com/zhouhoujun/)