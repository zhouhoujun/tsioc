import {
    Method, Inject, Injectable, IContainer, ContainerBuilder,
} from '@ts-ioc/core';
import { LogModule, Logger } from '../src';
import { DebugLogAspect } from './DebugLogAspect';
import { AnntotationLogAspect } from './AnntotationLogAspect';
import expect = require('expect');

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

    @Logger('Hanmm')
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

describe('logging test', () => {

    let container: IContainer;
    beforeEach(async () => {
        let builder = new ContainerBuilder();
        container = builder.create();
        await container.use(LogModule);
    });

    it('Aop log test', () => {
        container.register(DebugLogAspect);
        container.register(MethodTest3);
        expect(container.syncInvoke('Test3', 'sayHello')).toEqual('Mama, I love you.');

    });

    it('Aop anntotation log test', () => {
        container.register(AnntotationLogAspect);
        container.register(MethodTest2);
        expect(container.syncInvoke(MethodTest2, 'sayHello')).toEqual('Mama');

    });


});

