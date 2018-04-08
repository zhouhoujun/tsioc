
import 'mocha';
import { expect } from 'chai';
import { AutoWired, Injectable, IContainer, ParameterMetadata, Param, Registration, Inject, Singleton, DefaultContainerBuilder } from '../src';
import { SimppleAutoWried, ClassRoom, MClassRoom, CollegeClassRoom, MiddleSchoolStudent, CollegeStudent, Student, InjMClassRoom, InjCollegeClassRoom, InjCollegeAliasClassRoom, StingMClassRoom, StringIdTest, SymbolIdest, SymbolCollegeClassRoom } from './debug';

describe('custom register test', () => {

    let container: IContainer;
    beforeEach(async () => {
        let builder = new DefaultContainerBuilder();
        container = await builder.build();
    });

    it('decorator toString is decorator name', () => {
        expect(AutoWired.toString()).eq('@AutoWired');
        expect(Injectable.toString()).eq('@Injectable');
        expect(Inject.toString()).eq('@Inject');
        expect(Param.toString()).eq('@Param');
        expect(Singleton.toString()).eq('@Singleton');

    })

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
        // console.log(instance);
        expect(instance).not.undefined;
        expect(instance.service).not.undefined;
        expect(instance.service.current).instanceOf(Date);
    });

    it('should auto create prop with spec @Param class.', () => {
        container.register(MClassRoom);
        let instance = container.get(MClassRoom);
        expect(instance).not.undefined;
        expect(instance.leader).not.undefined;
        expect(instance.leader.sayHi()).eq('I am a middle school student');
    });

    it('should auto create constructor params with spec @Param class.', () => {
        container.register(CollegeClassRoom);
        let instance = container.get(CollegeClassRoom);
        expect(instance).not.undefined;
        expect(instance.leader).not.undefined;
        expect(instance.leader.sayHi()).eq('I am a college student');
    });

    it('should auto create prop with spec @Inject class.', () => {
        container.register(MiddleSchoolStudent);
        container.register(InjMClassRoom);
        let instance = container.get(InjMClassRoom);
        expect(instance).not.undefined;
        expect(instance.leader).not.undefined;
        expect(instance.leader.sayHi()).eq('I am a middle school student');
    });

    it('should auto create constructor params with spec @Inject class.', () => {
        container.register(InjCollegeClassRoom);
        let instance = container.get(InjCollegeClassRoom);
        expect(instance).not.undefined;
        expect(instance.leader).not.undefined;
        expect(instance.leader.sayHi()).eq('I am a college student');
    });

    it('should auto create constructor params with spec @Inject class with alias.', () => {
        container.register(CollegeStudent);
        container.register(InjCollegeAliasClassRoom);
        let instance = container.get(InjCollegeAliasClassRoom);
        expect(instance).not.undefined;
        expect(instance.leader).not.undefined;
        expect(instance.leader.sayHi()).eq('I am a college student');
    });

    it('should provider implement sub class to abstract class', () => {
        container.register(MiddleSchoolStudent);
        container.register(CollegeStudent);

        let instance = container.get(Student);
        expect(instance).not.undefined;
        expect(instance.sayHi()).eq('I am a middle school student');

        let instance2 = container.get(new Registration(Student, 'college'));
        expect(instance2).not.undefined;
        expect(instance2.sayHi()).eq('I am a college student');
    });


    it('should work with sting id to get class', () => {
        container.register(MiddleSchoolStudent);
        container.register(StingMClassRoom);
        container.register(StringIdTest);

        let instance = container.get(StringIdTest);
        expect(instance).not.undefined;
        expect(instance.room).not.undefined;
        expect(instance.room.leader).not.undefined;
        expect(instance.room.leader.sayHi()).eq('I am a middle school student');

    });

    it('should work with Symbol id to get class', () => {
        container.register(SymbolCollegeClassRoom);
        container.register(SymbolIdest);

        let instance = container.get(SymbolIdest);
        expect(instance).not.undefined;
        expect(instance.room).not.undefined;
        expect(instance.room.leader).not.undefined;
        expect(instance.room.leader.sayHi()).eq('I am a college student');

    });

});
