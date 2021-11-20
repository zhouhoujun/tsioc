import { getToken, Injector } from '@tsdi/ioc';
import { SimppleAutoWried, ClassRoom, MClassRoom, CollegeClassRoom, Student, InjCollegeClassRoom, InjMClassRoom, StringIdTest, SymbolIdest } from './debug';

import expect = require('expect');
import { ServerBootstrapModule } from '../src';
import { Application, ApplicationContext } from '@tsdi/core';



describe('auto register with build', () => {

    let injector: Injector;
    let ctx: ApplicationContext;

    before(async () => {
        ctx = await Application.run({
            type: ServerBootstrapModule,
            loads: [
                {
                    files: __dirname + '/debug.ts'
                }
            ]
        });
        injector = ctx.injector;
    });

    it('should auto wried property', () => {
        let instance = injector.get(SimppleAutoWried);
        expect(instance).toBeDefined();
        expect(instance.dateProperty).toBeDefined();
        expect(instance.dateProperty instanceof Date).toBeTruthy();
    });

    it('should auto create constructor params', () => {
        let instance = injector.get(ClassRoom);
        // console.log(instance);
        expect(instance).toBeDefined();
        expect(instance.service).toBeDefined();
        expect(instance.service.current instanceof Date).toBeTruthy();
    });

    it('should auto create prop with spec @Param() class.', () => {
        let instance = injector.get(MClassRoom);
        expect(instance).toBeDefined();
        expect(instance.leader).toBeDefined();
        expect(instance.leader.join instanceof Date).toBeTruthy();
        expect(instance.leader.sayHi()).toEqual('I am a middle school student');
    });

    it('should auto create constructor params with spec @Param() class.', () => {
        let instance = injector.get(CollegeClassRoom);
        expect(instance).toBeDefined();
        expect(instance.leader).toBeDefined();
        expect(instance.leader.join instanceof Date).toBeTruthy();
        expect(instance.leader.sayHi()).toEqual('I am a college student');
    });

    it('should auto create prop with spec @Inject() class.', () => {
        let instance = injector.get(InjMClassRoom);
        expect(instance).toBeDefined();
        expect(instance.leader).toBeDefined();
        expect(instance.leader.join instanceof Date).toBeTruthy();
        expect(instance.leader.sayHi()).toEqual('I am a middle school student');
    });

    it('should auto create constructor params with spec @Inject() class.', () => {
        let instance = injector.get(InjCollegeClassRoom);
        expect(instance).toBeDefined();
        expect(instance.leader).toBeDefined();
        expect(instance.leader.join instanceof Date).toBeTruthy();
        expect(instance.leader.sayHi()).toEqual('I am a college student');
    });

    it('should provider implement sub class to abstract class', () => {

        let instance = injector.get(Student);
        expect(instance).toBeDefined();
        // console.log(instance.sayHi());
        expect(instance.join instanceof Date).toBeTruthy();
        expect(instance.sayHi()).toEqual('I am a middle school student');

        let instance2 = injector.get(getToken(Student, 'college'));
        // console.log(instance2);
        expect(instance2).toBeDefined();
        expect(instance2.join instanceof Date).toBeTruthy();
        expect(instance2.sayHi()).toEqual('I am a college student');
    });


    it('should work with sting id to get class', () => {

        let instance = injector.get(StringIdTest);
        expect(instance).toBeDefined();
        expect(instance.room).toBeDefined();
        expect(instance.room.leader).toBeDefined();
        expect(instance.room.leader.join instanceof Date).toBeTruthy();
        expect(instance.room.leader.sayHi()).toEqual('I am a middle school student');

    });

    it('should work with Symbol id to get class', () => {

        let instance = injector.get(SymbolIdest);
        expect(instance).toBeDefined();
        expect(instance.container).toBeDefined();
        expect(instance.room).toBeDefined();
        expect(instance.room.leader).toBeDefined();
        expect(instance.room.leader.join instanceof Date).toBeTruthy();
        expect(instance.room.leader.container).toBeDefined();
        expect(instance.room.leader.sayHi()).toEqual('I am a college student');

    });

    after(() => {
        ctx.destroy();
    })

});
