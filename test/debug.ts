import { AutoWired, Injectable, Param, Singleton, Registration, Inject } from '../src';

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
