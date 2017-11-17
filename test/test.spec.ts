
import 'mocha';
import { expect } from 'chai';
import { ContainerBuilder, AutoWired, Injectable, IContainer, ParameterMetadata, Param, Registration } from '../src';
import { SimppleAutoWried, ClassRoom, MClassRoom, CollegeClassRoom, MiddleSchoolStudent, CollegeStudent, Student, InjMClassRoom, InjCollegeClassRoom } from './debug';

describe('custom register test', () => {

    let container: IContainer;
    beforeEach(async () => {
        let builder = new ContainerBuilder();
        container = await builder.build();
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

});
