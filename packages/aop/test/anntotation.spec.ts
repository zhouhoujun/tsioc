import {
    Method, Inject, Injectable, IocContainer, IIocContainer
} from '@ts-ioc/ioc';
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

        @Method
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

        @Method()
        sayHello(@Inject(Child) person: Person) {
            return person.say();
        }

    }

    @Injectable('Test3')
    class MethodTest3 {
        constructor() {

        }

        @Method
        sayHello(@Inject(Child) personA: Person, personB: Person) {
            return personA.say() + ', ' + personB.say();
        }

        sayHello2() {

        }
    }

    let container: IIocContainer;
    beforeEach(async () => {
        let builder = new IocContainer();
        container.register(AopModule);
        container.register(IocLog);
    });

    it('Aop anntotation test', () => {

        container.register(AnnotationAspect);
        container.register(CheckRightAspect);
        container.register(MethodTest3);
        expect(container.syncInvoke('Test3', 'sayHello')).toEqual('Mama, I love you.');

    });
});
