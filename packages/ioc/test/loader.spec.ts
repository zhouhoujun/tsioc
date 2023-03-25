import { Container, getToken, Injector } from '../src';
import * as debuModules from './debug';
import { ClassRoom, CollegeClassRoom, InjCollegeClassRoom, InjMClassRoom, MClassRoom, MiddleSchoolStudent, Person, SimppleAutoWried, StingMClassRoom, StringIdTest, Student, SymbolIdest } from './debug';
import expect = require('expect');



describe('injector use ', () => {

    let injector: Injector;
    before(async () => {
        injector = Injector.create();
        await injector.use(debuModules);
        injector.setValue(Date, new Date());
    });

    it('should auto wried property', () => {
        expect(injector.has(SimppleAutoWried)).toBeTruthy();
        const instance = injector.get(SimppleAutoWried);
        expect(instance).toBeDefined();
        expect(instance.dateProperty).toBeDefined();
        // expect(instance.dateProperty instanceof Date).toBeTruthy();
    });

    it('should auto create constructor params', () => {
        const instance = injector.get(ClassRoom);
        // console.log(instance);
        expect(instance).toBeDefined();
        expect(instance.service).toBeDefined();
        expect(instance.service.current).toBeDefined();
    });

    it('should auto create prop with spec @Param() class.', () => {
        const instance = injector.get(MClassRoom);
        expect(instance).toBeDefined();
        expect(instance.leader).toBeDefined();
        expect(instance.leader.sayHi()).toEqual('I am a middle school student');
    });

    it('should auto create constructor params with spec @Param() class.', () => {
        const instance = injector.get(CollegeClassRoom);
        expect(instance).toBeDefined();
        expect(instance.leader).toBeDefined();
        expect(instance.leader.sayHi()).toEqual('I am a college student');
    });

    it('should auto create prop with spec @Inject() class.', () => {
        const instance = injector.get(InjMClassRoom);
        expect(instance).toBeDefined();
        expect(instance.leader).toBeDefined();
        expect(instance.leader.sayHi()).toEqual('I am a middle school student');
    });

    it('should auto create constructor params with spec @Inject() class.', () => {
        const instance = injector.get(InjCollegeClassRoom);
        expect(instance).toBeDefined();
        expect(instance.leader).toBeDefined();
        expect(instance.leader.sayHi()).toEqual('I am a college student');
    });

    it('should provider implement sub class to abstract class', () => {

        const instance = injector.get(Student);
        expect(instance).toBeDefined();
        // console.log(instance.sayHi());
        expect(instance.sayHi()).toEqual('I am a middle school student');

        const instance2 = injector.get(getToken(Student, 'college'));
        // console.log(instance2);
        expect(instance2).toBeDefined();
        expect(instance2.sayHi()).toEqual('I am a college student');
    });


    it('should work with sting id to get class', () => {

        const instance = injector.get(StringIdTest);
        expect(instance).toBeDefined();
        expect(instance.room).toBeDefined();
        expect(instance.room.leader).toBeDefined();
        expect(instance.room.leader.sayHi()).toEqual('I am a middle school student');

    });

    it('should work with Symbol id to get class', () => {
        const instance = injector.get(SymbolIdest);
        expect(instance).toBeDefined();
        expect(instance.room).toBeDefined();
        expect(instance.room.leader).toBeDefined();
        expect(instance.room.leader.sayHi()).toEqual('I am a college student');

    });

    after(() => {
        injector.destroy();
    });
});
