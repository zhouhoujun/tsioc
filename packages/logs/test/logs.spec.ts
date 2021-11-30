import { Injectable, Inject, Autowired, Container, Injector, refl } from '@tsdi/ioc';
import { LogModule, Logger, ILogger } from '../src';
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
    constructor(@Logger() readonly logger1: ILogger) {

    }

    @Logger() readonly logger2!: ILogger

    @Autowired()
    sayHello(person: Person) {
        return person.say();
    }
}

class MethodTest2 {

    tester!: string;

    @Inject()
    testAt!: Date;

    constructor(@Logger(MethodTest2) readonly logger: ILogger) {

    }

    @Logger('Hanmm', 'it is test mesasge, for MethodTest2 sayHello invoked.')
    sayHello(@Inject(Child) person: Person) {
        console.log(person.say());
        return person.say();
    }

}

@Injectable('Test3')
class MethodTest3 {

    @Logger(MethodTest3)
    logger!: ILogger;

    constructor() {

    }

    @Autowired()
    @Logger('Test3', 'it is test mesasge, for MethodTest3 sayHello invoked.')
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
        container.use(LogModule);
        container.setValue(Date, new Date());
    });

    it('Aop log test', () => {
        container.register(AnntotationLogAspect);
        container.register(DebugLogAspect);
        container.register(MethodTest3);
        expect(container.invoke('Test3', 'sayHello')).toEqual('Mama, I love you.');
    });

    it('property injected logger', () => {
        container.register(MethodTest3);
        const mt3 = container.get(MethodTest3);
        expect(mt3).toBeDefined();
        expect(mt3.logger).toBeDefined();
        expect(mt3.logger.constructor.name).toEqual('ConsoleLog');
        mt3.logger.log('property injected!')
    })

    it('parameter injected logger', () => {
        container.register(MethodTest2);
        const mt2 = container.get(MethodTest2);
        expect(mt2).toBeDefined();
        expect(mt2.logger).toBeDefined();
        expect(mt2.logger.constructor.name).toEqual('ConsoleLog');
        mt2.logger.log('parameter injected!')
    })

    it('default class name logger injected', () => {
        container.register(MethodTest);
        const mt2 = container.get(MethodTest);
        expect(mt2).toBeDefined();
        expect(mt2.logger1).toBeDefined();
        expect(mt2.logger1.constructor.name).toEqual('ConsoleLog');

        expect(mt2.logger2).toBeDefined();
        expect(mt2.logger2.constructor.name).toEqual('ConsoleLog');
        expect(mt2.logger1).toEqual(mt2.logger2);
    })

    it('Aop anntotation log test', () => {
        container.register(AnntotationLogAspect);
        container.register(MethodTest2);
        expect(container.invoke(MethodTest2, 'sayHello')).toEqual('Mama');

    });

    after(() => {
        container.destroy();
    });

});

