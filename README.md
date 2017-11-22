# packaged type-autofac

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/type-autofac).

`type-autofac` is ioc container, via typescript decorator.



## Install

```shell

npm install type-autofac

```

## Documentation

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

// 3.  you can load modules by self
builder.loadModule(container, {
  files: [__dirname +'/controller/**/*.ts', __dirname + '/*.model.js'],
  moudles:['node-modules-name', ClassType]
})

```

### Extend decorator

You can extend yourself decorator via:

```ts
registerDecorator(decirator: Function, actions: ActionComponent);

//eg.
let container = builder.create();
container.registerDecorator<InjectMetadata>(Inject,
    builder.build(Inject.toString(), this.getDecoratorType(Inject),
        ActionType.resetParamType, ActionType.resetPropType));

```

more see interface. all document is typescript .d.ts.

eg.

```ts
/**
 * container interface.
 *
 * @export
 * @interface IContainer
 */
export interface IContainer {

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
     * bind provider
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Token<T>} provider
     * @memberof IContainer
     */
    bindProvider<T>(provide: Token<T>, provider: Token<T>);

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
     * @param {Function} decirator
     * @param {ActionComponent} actions
     * @memberof IContainer
     */
    registerDecorator(decirator: Function, actions: ActionComponent);

    /**
     * is vaildate dependence type or not. dependence type must with @Injectable decorator.
     *
     * @template T
     * @param {any} target
     * @returns {boolean}
     * @memberof IContainer
     */
    isVaildDependence<T>(target: any): boolean;

}
```

### demo

```ts

import { ContainerBuilder, AutoWired, Injectable, Param } from 'type-autofac';


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

@Singleton
@Injectable
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
    leader: Student;
    constructor() {

    }
}


@Injectable
export class InjCollegeClassRoom {
    // @Inject(CollegeStudent)// @Inject({ type: CollegeStudent })
    // public leader: Student
    constructor(
        @Inject(CollegeStudent)// @Inject({ type: CollegeStudent })
        public leader: Student
    ) {

    }
}



let builder = new ContainerBuilder();
let container = builder.create();

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

Documentation is available on the
[type-autofac docs site](https://github.com/zhouhoujun/type-autofac).

## License

MIT © [Houjun](https://github.com/zhouhoujun/)