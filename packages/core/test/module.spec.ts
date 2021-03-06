import { ContainerBuilder, IContainer } from '../src';
import * as debuModules from './debug';
import { SimppleAutoWried, ClassRoom, MClassRoom, CollegeClassRoom, Student, InjCollegeClassRoom, InjMClassRoom, StringIdTest, SymbolIdest } from './debug';
import expect = require('expect');

describe('auto register with build', () => {

    let container: IContainer;
    before(async () => {
        let builder = new ContainerBuilder();
        container = await builder.build(debuModules);
    });

    it('should auto wried property', () => {
        expect(container.has(SimppleAutoWried)).toBeTruthy();
        let instance = container.get(SimppleAutoWried);
        expect(instance).toBeDefined();
        expect(instance.dateProperty).toBeDefined();
        expect(instance.dateProperty instanceof Date).toBeTruthy();
    });

    it('should auto create constructor params', () => {
        let instance = container.get(ClassRoom);
        // console.log(instance);
        expect(instance).toBeDefined();
        expect(instance.service).toBeDefined();
        expect(instance.service.current instanceof Date).toBeTruthy();
    });

    it('should auto create prop with spec @Param class.', () => {
        let instance = container.get(MClassRoom);
        expect(instance).toBeDefined();
        expect(instance.leader).toBeDefined();
        expect(instance.leader.sayHi()).toEqual('I am a middle school student');
    });

    it('should auto create constructor params with spec @Param class.', () => {
        let instance = container.get(CollegeClassRoom);
        expect(instance).toBeDefined();
        expect(instance.leader).toBeDefined();
        expect(instance.leader.sayHi()).toEqual('I am a college student');
    });

    it('should auto create prop with spec @Inject class.', () => {
        let instance = container.get(InjMClassRoom);
        expect(instance).toBeDefined();
        expect(instance.leader).toBeDefined();
        expect(instance.leader.sayHi()).toEqual('I am a middle school student');
    });

    it('should auto create constructor params with spec @Inject class.', () => {
        let instance = container.get(InjCollegeClassRoom);
        expect(instance).toBeDefined();
        expect(instance.leader).toBeDefined();
        expect(instance.leader.sayHi()).toEqual('I am a college student');
    });

    it('should provider implement sub class to abstract class', () => {

        let instance = container.get(Student);
        expect(instance).toBeDefined();
        // console.log(instance.sayHi());
        expect(instance.sayHi()).toEqual('I am a middle school student');

        let instance2 = container.get(Student, 'college');
        // console.log(instance2);
        expect(instance2).toBeDefined();
        expect(instance2.sayHi()).toEqual('I am a college student');
    });


    it('should work with sting id to get class', () => {

        let instance = container.get(StringIdTest);
        expect(instance).toBeDefined();
        expect(instance.room).toBeDefined();
        expect(instance.room.leader).toBeDefined();
        expect(instance.room.leader.sayHi()).toEqual('I am a middle school student');

    });

    it('should work with Symbol id to get class', () => {

        let instance = container.get(SymbolIdest);
        expect(instance).toBeDefined();
        expect(instance.room).toBeDefined();
        expect(instance.room.leader).toBeDefined();
        expect(instance.room.leader.sayHi()).toEqual('I am a college student');

    });

});
