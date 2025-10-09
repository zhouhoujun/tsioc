import {
    Inject, Injectable, Autowired, Container,
    createInjector,
    getClassRef
} from '@tsdi/ioc';
import { AnnotationAspect } from './aop/AnnotationAspect';
import { CheckRightAspect } from './aop/CheckRightAspect';
import { IocLog } from './aop/IocLog';
import { AopModule, BoolExpression } from '../src';
import expect = require('expect');
import { ChangedAspect } from './aop/ChangedAspect';


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

        @Inject({ defaultValue: new Date() })
        testAt!: Date;
        constructor() {
            console.log('create MethodTest2')
        }

        @Autowired()
        sayHello(@Inject(Child) person: Person) {
            return person.say();
        }

    }

    @Injectable()
    class PersonComponet {
        @Inject('personFullName', { defaultValue: ''})
        public personFullName = '';

        fulChange: any;

        @Inject('props',{defaultValue: {name: 'xx'}})
        public props: {name: string} = {
            name: 'xx'
        }
        changed?:any;
    
        constructor() {

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
        container = createInjector();
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

    it('annaction expression test', () => {

        const exp = new BoolExpression('@annotation(Authorization:class) && @annotation(RouteMapping:method)');
        // const fns = exp.tokens.map(t => );
        const argnames = exp.tokens.map((t, i) => 'arg' + i);
        const body = exp.toString((t, i, tkidx) => 'arg' + tkidx + '()');

        console.log(exp, body, argnames);
        expect(argnames).toEqual(['arg0', 'arg1'])
        expect(body).toEqual('arg0() && arg1()')
    })

    it('annaction expression with () test', () => {

        const exp = new BoolExpression('@annotation(Authorization:class) && (@annotation(RouteMapping:method) || @annotation(Route:method))');
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

    it('Aop property change', () => {
        container.register(ChangedAspect);
        container.register(PersonComponet);
        const comp = container.get(PersonComponet);
        comp.personFullName = 'name1';
        expect(comp.fulChange).toEqual({oldValue:'', newValue:'name1'});

        comp.props.name = 'mm';
        expect(comp.changed).toEqual({oldValue:'xx', newValue:'mm'});
        // expect(container.invoke(MethodTest2,'sayHello')).toEqual('Mama')
    });

    after(() => {
        container.destroy();
    });
});
