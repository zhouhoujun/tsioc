import { Inject, Autowired, Injectable, isFunction, Container, Providers, getClassRef, InvocationFactory, createInjector } from '../src';
import expect = require('expect');
// import { AnnotationAspect } from './aop/AnnotationAspect';
// import { CheckRightAspect } from './aop/CheckRightAspect';

describe('method exec test', () => {


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

        @Autowired()
        sayHello(person: Person) {
            return person.say();
        }
    }

    @Providers([
        { provide: Person, useClass: Child }
    ])
    class MethodTest2 {

        tester!: string;

        @Inject({ defaultValue: new Date() })
        testAt!: Date;

        constructor() {

        }
        
        @Autowired()
        sayHello(person: Person) {
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
    beforeEach(() => {
        container = createInjector();
    });

    it('show has prop metadata', () => {
        const refs = getClassRef(MethodTest2);
        expect(refs.hasMetadata(Inject, 'property')).toBeTruthy();
        expect(refs.hasMetadata(Inject, 'property', 'testAt')).toBeTruthy();
        expect(refs.hasMetadata(Inject, 'property', 'tester')).toBeFalsy();
        expect(refs.hasMetadata(Inject, 'method')).toBeFalsy();
    });

    it('show has method metadata', () => {
        const refs = getClassRef(MethodTest3);
        expect(refs.hasMetadata(Autowired, 'method')).toBeTruthy();
        expect(refs.hasMetadata(Autowired, 'method', 'sayHello')).toBeTruthy();
        expect(refs.hasMetadata(Autowired, 'method', 'sayHello2')).toBeFalsy();
    });

    it('show exec with type and instance', () => {
        // container.register(Person);
        container.getInject().register(MethodTest);
        const mtt = container.get(MethodTest);
        expect(isFunction(mtt.sayHello)).toBeTruthy();
        // expect(container.invoke(MethodTest, 'sayHello')).toEqual('I love you.');
        const typeRef = container.get(InvocationFactory).create(MethodTest);
        expect(typeRef.invoke('sayHello')).toEqual('I love you.');

    });

    it('show exec with specail param', () => {
        // container.register(Person);
        container.getInject().register(MethodTest2);
        // expect(container.invoke(MethodTest2, t => t.sayHello)).toEqual('Mama');
        const typeRef = container.get(InvocationFactory).create(MethodTest2);
        expect(typeRef.invoke(t => t.sayHello)).toEqual('Mama');

    });

    it('show exec with many params', () => {
        // container.register(Person);
        container.getInject().register(MethodTest3);
        // expect(container.invoke(MethodTest3, 'sayHello')).toEqual('Mama, I love you.');
        const typeRef = container.get(InvocationFactory).create(MethodTest3);
        expect(typeRef.invoke('sayHello')).toEqual('Mama, I love you.');

    });

    it('show exec with many params and invoke with string', () => {
        // container.register(Person);
        container.getInject().register(MethodTest3);
        // expect(container.invoke('Test3', 'sayHello')).toEqual('Mama, I love you.');
        const typeRef = container.get(InvocationFactory).create(container.getInject().getTokenProvider('Test3'));
        expect(typeRef.invoke('sayHello')).toEqual('Mama, I love you.');

    });


    // it('Aop anntotation test', () => {
    //     container.register(AnnotationAspect);
    //     container.register(CheckRightAspect);
    //     container.register(MethodTest3);
    //     expect(container.invoke('Test3', 'sayHello')).toEqual('Mama, I love you.');

    // });

    after(() => {
        container.destroy();
    });
});
