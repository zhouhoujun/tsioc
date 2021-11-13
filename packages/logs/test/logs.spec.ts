import { Injectable, Inject, AutoWired, Container, Injector } from '@tsdi/ioc';
import { LogModule, Logger } from '../src';
import { DebugLogAspect } from './DebugLogAspect';
import { AnntotationLogAspect } from './AnntotationLogAspect';
import expect = require('expect');

@Injectable()
class Person {
    constructor() {

    }
    say() {
        return 'I love you.'
    }
}

@Injectable()
class Child extends Person {
    constructor() {
        super();
    }
    override say() {
        return 'Mama';
    }
}

class MethodTest {
    constructor() {

    }

    @AutoWired()
    sayHello(person: Person) {
        return person.say();
    }
}

class MethodTest2 {

    tester!: string;

    @Inject()
    testAt!: Date;
    constructor() {

    }

    @Logger('Hanmm', 'it is test mesasge.')
    sayHello(@Inject(Child) person: Person) {
        console.log(person.say());
        return person.say();
    }

}

@Injectable('Test3')
class MethodTest3 {
    constructor() {

    }

    @AutoWired()
    sayHello(@Inject(Child) personA: Person, personB: Person) {
        return personA.say() + ', ' + personB.say();
    }

    sayHello2() {

    }
}

describe('logging test', () => {

    let container: Container;
    beforeEach(async () => {
        container = Injector.create();
        await container.use(LogModule);
    });

    it('Aop log test', () => {
        container.register(DebugLogAspect);
        container.register(MethodTest3);
        expect(container.invoke('Test3', 'sayHello')).toEqual('Mama, I love you.');

    });

    it('Aop anntotation log test', () => {
        container.register(AnntotationLogAspect);
        console.log(container.has(AnntotationLogAspect));
        container.register(MethodTest2);
        expect(container.invoke(MethodTest2, 'sayHello')).toEqual('Mama');

    });

    after(() => {
        container.destroy();
    });

});

