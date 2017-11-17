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

1. via create.
let container = builder.create();
//with BuildOptions to auto register module.
let container = await builder.build({
  files: [__dirname +'/controller/**/*.ts, '__dirname + '/*.model.js],
  moudles:['node-modules-name', ClassType]
});

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

@Injectable({ provider: Student })
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
    @AutoWired({ type: MiddleSchoolStudent })
    leader: Student;
    constructor() {

    }
}


@Injectable({ provider: Student, alias: 'college' })
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
        @AutoWired({ type: CollegeStudent })
        @Param({ type: CollegeStudent })
        public leader: Student) {

    }
}


@Injectable
export class InjMClassRoom {
    @Inject // @Inject({ type: MiddleSchoolStudent })
    leader: Student;
    constructor() {

    }
}


@Injectable
export class InjCollegeClassRoom {
    constructor(
        @Inject({ type: CollegeStudent })
        public leader: Student) {

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


builder.build({
    files: __dirname + '/debug.js'
})
    .then(container => {
        let instance = container.get(Student);
        console.log(instance.sayHi());

        let instance2 = container.get(new Registration(Student, 'college'));
        console.log(instance2.sayHi())
    });



```

Documentation is available on the
[type-autofac docs site](https://github.com/zhouhoujun/type-autofac).

## License

MIT © [Houjun](https://github.com/zhouhoujun/)