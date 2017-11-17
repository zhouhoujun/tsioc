import { AutoWired, Injectable, Param, Singleton, Inject, Registration, ContainerBuilder } from './index';


export class SimppleAutoWried {
    constructor() {
    }

    @AutoWired
    dateProperty: Date;
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
        @Param({ type: CollegeStudent })
        public leader: Student) {

    }
}


@Injectable
export class InjMClassRoom {
    @Inject({ type: MiddleSchoolStudent })
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
