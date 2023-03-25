import {
    Inject, Injectable, Autowired, Container
} from '@tsdi/ioc';
import { AnnotationAspect } from './aop/AnnotationAspect';
import { CheckRightAspect } from './aop/CheckRightAspect';
import { IocLog } from './aop/IocLog';
import { AopModule, BoolExpression } from '../src';
import expect = require('expect');


describe('aop test', () => {


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
        say() {
            return 'Mama';
        }
    }

    class MethodTest {
        constructor() {

        }

        @Autowired()
        sayHello(person: Person) {
            return person.say();
        }
    }

    class MethodTest2 {

        tester!: string;

        @Inject({ defaultValue: new Date()})
        testAt!: Date;
        constructor() {

        }

        @Autowired()
        sayHello(@Inject(Child) person: Person) {
            return person.say();
        }

    }

    @Injectable('Test3')
    class MethodTest3 {
        constructor() {

        }

        @Autowired()
        sayHello(@Inject(Child) personA: Person, personB: Person) {
            return personA.say() + ', ' + personB.say();
        }

        sayHello2() {

        }
    }

    let container: Container;
    beforeEach(async () => {
        container = Container.create();
        container.use(AopModule, IocLog);
    });

    it('BoolExpression test', () => {

        const exp = new BoolExpression(('dobj.do(c, f) && (tz || tf)'), exp => exp.startsWith('dobj.do'));
        // const fns = exp.tokens.map(t => );
        const argnames = exp.tokens.map((t, i) => 'arg' + i);
        const body = exp.toString((t, i, tkidx) => 'arg' + tkidx + '()');

        console.log(exp, body, argnames);
        expect(argnames).toEqual(['arg0', 'arg1', 'arg2'])
        expect(body).toEqual('arg0() && ( arg1() || arg2() )')
    })

    it('Aop anntotation test', () => {

        container.register(AnnotationAspect);
        container.register(CheckRightAspect);
        container.register(MethodTest3);
        const mt3 = container.get('Test3') as any;
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

    });

    after(() => {
        container.destroy();
    });
});
