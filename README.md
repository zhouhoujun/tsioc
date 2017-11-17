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

class SimppleAutoWried {
    constructor() {
    }

    @AutoWired
    dateProperty: Date;
}

@Singleton
@Injectable
class RoomService {
    constructor() {

    }
    @AutoWired
    current: Date;
}

@Injectable()
class ClassRoom {
    constructor(public service: RoomService) {

    }
}

abstract class Student {
    constructor() {
    }
    abstract sayHi(): string;
}

@Injectable()
class MiddleSchoolStudent extends Student {
    constructor() {
        super();
    }
    sayHi() {
        return 'I am a middle school student';
    }
}

@Injectable()
class MClassRoom {
    @AutoWired({ type: MiddleSchoolStudent })
    leader: Student;
    constructor() {

    }
}


@Injectable()
class CollegeStudent extends Student {
    constructor() {
        super();
    }
    sayHi() {
        return 'I am a college student';
    }
}

@Injectable()
class CollegeClassRoom {
    constructor(
        @Param({ type: CollegeStudent })
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

container.register(MClassRoom);
console.log(container.get(MClassRoom).leader.sayHi());

container.register(CollegeClassRoom);
console.log(container.get(CollegeClassRoom).leader.sayHi());


```

Documentation is available on the
[type-autofac docs site](https://github.com/zhouhoujun/type-autofac).

## License

MIT © [Houjun](https://github.com/zhouhoujun/)