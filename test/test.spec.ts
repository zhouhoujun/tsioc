
import 'reflect-metadata';
import 'mocha';
import { expect } from 'chai';
import { ContainerBuilder, AutoWired, Injectable, IContainer } from '../src';

describe('AutoWried test', () => {

    class SimppleAutoWried {
        constructor() {
        }

        @AutoWired()
        dateProperty: Date;
    }

    @Injectable()
    class RoomService {
        constructor() {

        }
        @AutoWired()
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
            @AutoWired({ type: CollegeStudent })
            public leader: Student) {

        }
    }


    let container: IContainer;
    beforeEach(() => {
        let builder = new ContainerBuilder();
        container = builder.build();
    });

    it('should auto wried property', () => {
        container.register(SimppleAutoWried);
        let instance = container.get(SimppleAutoWried);
        expect(instance).not.undefined;
        expect(instance.dateProperty).not.undefined;
        expect(instance.dateProperty).instanceOf(Date);
    });

    it('should auto create constructor params', () => {
        container.register(ClassRoom);
        let instance = container.get(ClassRoom);
        expect(instance).not.undefined;
        expect(instance.service).not.undefined;
        expect(instance.service.current).instanceOf(Date);
    });

    it('should auto create constructor params', () => {
        container.register(ClassRoom);
        let instance = container.get(ClassRoom);
        expect(instance).not.undefined;
        expect(instance.service).not.undefined;
        expect(instance.service.current).instanceOf(Date);
    });


    it('should auto create prop with spec implement sub class.', () => {
        container.register(MClassRoom);
        let instance = container.get(MClassRoom);
        expect(instance).not.undefined;
        expect(instance.leader).not.undefined;
        expect(instance.leader.sayHi()).eq('I am a middle school student');
    });

    it('should auto create constructor params with spec implement sub class.', () => {
        container.register(CollegeClassRoom);
        let instance = container.get(CollegeClassRoom);
        expect(instance).not.undefined;
        expect(instance.leader).not.undefined;
        expect(instance.leader.sayHi()).eq('I am a college student');
    });

});
