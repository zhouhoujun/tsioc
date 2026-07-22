import { Injectable, Inject, Autowired, Container, Injector, createInjector, InjectUtil } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { LoggerModule, InjectLog, Logger, provideLogger } from '../src';
import { ConsoleLog } from '../src/manager';
import { DebugLog1Aspect } from './debugLog';
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
    constructor(@InjectLog() readonly logger1: Logger) {

    }

    @InjectLog() readonly logger2!: Logger

    @Autowired()
    sayHello(person: Person) {
        return person.say();
    }
}

class MethodTest2 {

    tester!: string;

    @Inject()
    testAt!: Date;

    constructor(@InjectLog(MethodTest2) readonly logger: Logger) {

    }

    @InjectLog('it is test mesasge, for MethodTest2 sayHello invoked.', 'Hanmm')
    sayHello(@Inject(Child) person: Person) {
        console.log(person.say());
        return person.say();
    }

}

@Injectable('Test3')
class MethodTest3 {

    @InjectLog(MethodTest3)
    logger!: Logger;

    constructor() {

    }

    @Autowired()
    @InjectLog('it is test mesasge, for MethodTest3 sayHello invoked.', 'Test3')
    sayHello(@Inject(Child) personA: Person, personB: Person) {
        return personA.say() + ', ' + personB.say();
    }

    sayHello2() {

    }
}

describe('logging test', () => {

    let container: Container;
    beforeEach(async () => {
        container = createInjector();
        InjectUtil.setValue(container, Date, new Date());
        InjectUtil.use(container, AopModule, LoggerModule)
    });

    it('Aop log test', () => {
        InjectUtil.register(container,
            AnntotationLogAspect,
            DebugLog1Aspect,
            MethodTest3);
        expect(InjectUtil.invoke(container, 'Test3', 'sayHello')).toEqual('Mama, I love you.');
    });

    it('property injected logger', () => {
        InjectUtil.register(container, MethodTest3);
        const mt3 = container.get(MethodTest3);
        expect(mt3).toBeDefined();
        expect(mt3.logger).toBeDefined();
        expect(mt3.logger.constructor.name).toEqual('ConsoleLog');
        mt3.logger.log('property injected!')
    })

    it('parameter injected logger', () => {
        InjectUtil.register(container, MethodTest2);
        const mt2 = container.get(MethodTest2);
        expect(mt2).toBeDefined();
        expect(mt2.logger).toBeDefined();
        expect(mt2.logger.constructor.name).toEqual('ConsoleLog');
        mt2.logger.log('parameter injected!')
    })

    it('default class name logger injected', () => {
        InjectUtil.register(container, MethodTest);
        const mt2 = container.get(MethodTest);
        expect(mt2).toBeDefined();
        expect(mt2.logger1).toBeDefined();
        expect(mt2.logger1.constructor.name).toEqual('ConsoleLog');

        expect(mt2.logger2).toBeDefined();
        expect(mt2.logger2.constructor.name).toEqual('ConsoleLog');
        expect(mt2.logger1).toEqual(mt2.logger2);
    })

    it('Aop anntotation log test', () => {
        InjectUtil.register(container, AnntotationLogAspect, MethodTest2);
        expect(InjectUtil.invoke(container, MethodTest2, 'sayHello')).toEqual('Mama');

    });

    it('provideLogger returns providers and LoggerModule.withOptions returns module metadata', () => {
        const providers = provideLogger({ adapter: 'console' });
        expect(Array.isArray(providers)).toBe(true);
        expect(providers.length).toBeGreaterThan(0);

        const result = LoggerModule.withOptions({ adapter: 'console' });
        expect(result.module).toBe(LoggerModule);
        expect(Array.isArray(result.providers)).toBe(true);
        expect(result.providers?.length).toBeGreaterThan(0);
    });

    it('provideLogger works when registered directly without importing LoggerModule', () => {
        const direct = createInjector(provideLogger({ adapter: 'console' }));
        try {
            InjectUtil.register(direct, MethodTest3);
            const mt3 = direct.get(MethodTest3);
            expect(mt3.logger).toBeDefined();
            expect(mt3.logger.constructor.name).toEqual('ConsoleLog');
        } finally {
            direct.destroy();
        }
    });

    it('console logger defaults to info level', () => {
        const logger = new ConsoleLog('test');
        expect(logger.level).toEqual('info');
    });

    after(() => {
        container.destroy();
    });

});
