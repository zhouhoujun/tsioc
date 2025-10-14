import { Autowired, Injectable, Param, Inject, Singleton, Container, getToken, createInjector, Operator } from '../src';
import { SimppleAutoWried, ClassRoom, MClassRoom, CollegeClassRoom, MiddleSchoolStudent, CollegeStudent, Student, InjMClassRoom, InjCollegeClassRoom, InjCollegeAliasClassRoom, StingMClassRoom, StringIdTest, SymbolIdest, SymbolCollegeClassRoom } from './debug';
import expect = require('expect');

describe('custom register test', () => {

    let container: Container;
    beforeEach(async () => {
        container = createInjector();
        Operator.setValue(container, Date, new Date());
    });

    it('decorator toString is decorator name', () => {
        expect(Autowired.toString()).toEqual('@Autowired');
        expect(Injectable.toString()).toEqual('@Injectable');
        expect(Inject.toString()).toEqual('@Inject');
        expect(Param.toString()).toEqual('@Param');
        expect(Singleton.toString()).toEqual('@Singleton');

    })

    it('should auto wried property', () => {
        Operator.register(container, SimppleAutoWried);
        const instance = container.get(SimppleAutoWried);
        expect(instance).toBeDefined();
        expect(instance.dateProperty).toBeDefined();
        // expect(instance.dateProperty instanceof Date).toBeTruthy();
    });

    it('should auto create constructor params', () => {
        Operator.register(container, ClassRoom);
        const instance = container.get(ClassRoom);
        expect(instance).toBeDefined();
        expect(instance.service).toBeDefined();
        expect(instance.service.current).toBeDefined();
    });

    it('should auto create prop with spec @Autowired() class.', () => {
        Operator.register(container, MClassRoom);
        const instance = container.get(MClassRoom);
        expect(instance).toBeDefined();
        expect(instance.leader).toBeDefined();
        expect(instance.leader.sayHi()).toEqual('I am a middle school student');
    });

    it('should auto create constructor params with spec @Param() class.', () => {
        Operator.register(container, CollegeClassRoom);
        const instance = container.get(CollegeClassRoom);
        expect(instance).toBeDefined();
        expect(instance.leader).toBeDefined();
        expect(instance.leader.sayHi()).toEqual('I am a college student');
    });

    it('should auto create prop with spec @Inject() class.', () => {
        Operator.register(container, MiddleSchoolStudent);
        Operator.register(container, InjMClassRoom);
        const instance = container.get(InjMClassRoom);
        expect(instance).toBeDefined();
        expect(instance.leader).toBeDefined();
        expect(instance.leader.sayHi()).toEqual('I am a middle school student');
    });

    it('should auto create constructor params with spec @Inject() class.', () => {
        Operator.register(container, InjCollegeClassRoom);
        const instance = container.get(InjCollegeClassRoom);
        expect(instance).toBeDefined();
        expect(instance.leader).toBeDefined();
        expect(instance.leader.sayHi()).toEqual('I am a college student');
    });

    it('should auto create constructor params with spec @Inject() class with alias.', () => {
        Operator.register(container, CollegeStudent);
        Operator.register(container, InjCollegeAliasClassRoom);
        const instance = container.get(InjCollegeAliasClassRoom);
        expect(instance).toBeDefined();
        expect(instance.leader).toBeDefined();
        expect(instance.leader.sayHi()).toEqual('I am a college student');
    });

    it('should provider implement sub class to abstract class', () => {
        Operator.register(container, MiddleSchoolStudent);
        Operator.register(container, CollegeStudent);

        const instance = container.get(Student);
        expect(instance).toBeDefined();
        expect(instance.sayHi()).toEqual('I am a middle school student');

        const instance2 = container.get(getToken(Student, 'college'));
        expect(instance2).toBeDefined();
        expect(instance2.sayHi()).toEqual('I am a college student');
    });


    it('should work with sting id to get class', () => {
        Operator.register(container, MiddleSchoolStudent);
        Operator.register(container, StingMClassRoom);
        Operator.register(container, StringIdTest);

        const instance = container.get(StringIdTest);
        expect(instance).toBeDefined();
        expect(instance.room).toBeDefined();
        expect(instance.room.leader).toBeDefined();
        expect(instance.room.leader.sayHi()).toEqual('I am a middle school student');

    });

    it('should work with Symbol id to get class', () => {
        Operator.register(container, SymbolCollegeClassRoom);
        Operator.register(container, MiddleSchoolStudent);
        Operator.register(container, StingMClassRoom);
        Operator.register(container, SymbolIdest);

        const instance = container.get(SymbolIdest);
        expect(instance).toBeDefined();
        expect(instance.room).toBeDefined();
        expect(instance.room.leader).toBeDefined();
        expect(instance.room.leader.sayHi()).toEqual('I am a college student');

    });

});
