import {
    Method, Inject, Injectable, IocContainer, IIocContainer
} from '@ts-ioc/ioc';
import { AnnotationAspect } from './aop/AnnotationAspect';
import { CheckRightAspect } from './aop/CheckRightAspect';
import { IocLog } from './aop/IocLog';
import { AopModule } from '../src';
import expect = require('expect');
import { IContainer, ContainerBuilder } from '@ts-ioc/core';


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

    let container: IContainer;
    beforeEach(async () => {
        let build  = new ContainerBuilder();
        container =  build.create();
        container.loadModule(AopModule, IocLog);
    });

    it('Aop anntotation test', () => {

        container.register(AnnotationAspect);
        container.register(CheckRightAspect);
        container.register(MethodTest3);
        expect(container.syncInvoke('Test3', 'sayHello')).toEqual('Mama, I love you.');

    });
});
