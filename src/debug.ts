import 'reflect-metadata';
import { ContainerBuilder, AutoWired, Injectable, Param } from './index';
class SimppleAutoWried {
    constructor() {
    }

    @AutoWired
    dateProperty: Date;
}

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

@Injectable
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
let container = builder.build();
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
