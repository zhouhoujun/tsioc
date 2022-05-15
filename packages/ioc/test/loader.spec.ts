import { Container, getToken, Injector } from '../src';
import * as debuModules from './debug';
import { ClassRoom, CollegeClassRoom, InjCollegeClassRoom, InjMClassRoom, MClassRoom, MiddleSchoolStudent, Person, SimppleAutoWried, StingMClassRoom, StringIdTest, Student, SymbolIdest } from './debug';
import expect = require('expect');


describe('ModuleLoader test', () => {

    it('should has one instance via load module', async () => {
        const container = Injector.create();
        await container.load({
            basePath: __dirname,
            files: 'debug.ts'
        });

        expect(container.has(Person)).toBeTruthy();
        const instance = container.get(Person);
        expect(instance).toBeDefined();
        expect(instance.name).toEqual('testor');
        instance.name = 'testor B';
        expect(instance.name).toEqual('testor B');

        const instanceB = container.get(Person);
        expect(instanceB.name).toEqual('testor B');
        expect(instance).toEqual(instanceB);
        container.destroy();
    });

    it('should load module via injector', async () => {

        const inj = Injector.create();

        const types = await inj.load({
            basePath: __dirname,
            files: 'debug.ts'
        });

        expect(types.length).toBeGreaterThan(0);

        const stu = inj.get(Student);
        expect(stu).toBeInstanceOf(MiddleSchoolStudent);

    });



    describe('auto register by loader', () => {

        let container: Container;
        before(async () => {
            container = Injector.create();
            await container.load(debuModules);
            container.setValue(Date, new Date());
        });

        it('should auto wried property', () => {
            expect(container.has(SimppleAutoWried)).toBeTruthy();
            const instance = container.get(SimppleAutoWried);
            expect(instance).toBeDefined();
            expect(instance.dateProperty).toBeDefined();
            // expect(instance.dateProperty instanceof Date).toBeTruthy();
        });

        it('should auto create constructor params', () => {
            const instance = container.get(ClassRoom);
            // console.log(instance);
            expect(instance).toBeDefined();
            expect(instance.service).toBeDefined();
            expect(instance.service.current).toBeDefined();
        });

        it('should auto create prop with spec @Param() class.', () => {
            const instance = container.get(MClassRoom);
            expect(instance).toBeDefined();
            expect(instance.leader).toBeDefined();
            expect(instance.leader.sayHi()).toEqual('I am a middle school student');
        });

        it('should auto create constructor params with spec @Param() class.', () => {
            const instance = container.get(CollegeClassRoom);
            expect(instance).toBeDefined();
            expect(instance.leader).toBeDefined();
            expect(instance.leader.sayHi()).toEqual('I am a college student');
        });

        it('should auto create prop with spec @Inject() class.', () => {
            const instance = container.get(InjMClassRoom);
            expect(instance).toBeDefined();
            expect(instance.leader).toBeDefined();
            expect(instance.leader.sayHi()).toEqual('I am a middle school student');
        });

        it('should auto create constructor params with spec @Inject() class.', () => {
            const instance = container.get(InjCollegeClassRoom);
            expect(instance).toBeDefined();
            expect(instance.leader).toBeDefined();
            expect(instance.leader.sayHi()).toEqual('I am a college student');
        });

        it('should provider implement sub class to abstract class', () => {

            const instance = container.get(Student);
            expect(instance).toBeDefined();
            // console.log(instance.sayHi());
            expect(instance.sayHi()).toEqual('I am a middle school student');

            const instance2 = container.get(getToken(Student, 'college'));
            // console.log(instance2);
            expect(instance2).toBeDefined();
            expect(instance2.sayHi()).toEqual('I am a college student');
        });


        it('should work with sting id to get class', () => {

            const instance = container.get(StringIdTest);
            expect(instance).toBeDefined();
            expect(instance.room).toBeDefined();
            expect(instance.room.leader).toBeDefined();
            expect(instance.room.leader.sayHi()).toEqual('I am a middle school student');

        });

        it('should work with Symbol id to get class', () => {
            const instance = container.get(SymbolIdest);
            expect(instance).toBeDefined();
            expect(instance.room).toBeDefined();
            expect(instance.room.leader).toBeDefined();
            expect(instance.room.leader.sayHi()).toEqual('I am a college student');

        });

        after(() => {
            container.destroy();
        });
    });

});
