import {
    Inject, Injectable, IocContainer, IContainer, AutoWired
} from '@tsdi/ioc';
import { AnnotationAspect } from './aop/AnnotationAspect';
import { CheckRightAspect } from './aop/CheckRightAspect';
import { IocLog } from './aop/IocLog';
import { AopModule } from '../src';
import expect = require('expect');


describe('aop test', () => {


    @Injectable
    class Person {
        constructor() {

        }
        say() {
            return 'I love you.'
        }
    }

    @Injectable
    class Child extends Person {
        constructor() {
            super();
        }
        say() {
            return 'Mama';
        }
    }

    class MethodTest {
        constructor() {

        }

        @AutoWired
        sayHello(person: Person) {
            return person.say();
        }
    }

    class MethodTest2 {

        tester: string;

        @Inject
        testAt: Date;
        constructor() {

        }

        @AutoWired()
        sayHello(@Inject(Child) person: Person) {
            return person.say();
        }

    }

    @Injectable('Test3')
    class MethodTest3 {
        constructor() {

        }

        @AutoWired
        sayHello(@Inject(Child) personA: Person, personB: Person) {
            return personA.say() + ', ' + personB.say();
        }

        sayHello2() {

        }
    }

    let container: IContainer;
    beforeEach(async () => {
        container = new IocContainer;
        container.inject(AopModule, IocLog);
    });

    it('Aop anntotation test', () => {

        container.register(AnnotationAspect);
        container.register(CheckRightAspect);
        container.register(MethodTest3);
        let mt3 = container.get('Test3');
        expect(mt3['around_constructor_After']).toBeTruthy();
        expect(container.invoke(mt3, 'sayHello')).toEqual('Mama, I love you.');
        expect(mt3['around_sayHello_Before']).toBeTruthy();
        expect(mt3['around_sayHello_After']).toBeTruthy();
        expect(mt3['authdata']).toEqual('authdata');

    });

    it('Aop ann with data', () => {
        container.register(AnnotationAspect);
        container.register(CheckRightAspect);
        container.register(MethodTest2);
        expect(container.invoke(MethodTest2, 'sayHello')).toEqual('Mama')

    })
});
