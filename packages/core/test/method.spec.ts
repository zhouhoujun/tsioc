import { Inject, AutoWired, Injectable, Container, Singleton, ParameterMetadata, Param, isFunction, refl } from '@tsdi/ioc';
import { ContainerBuilder } from '../src';
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

        sayHello( @Inject(Child) person: Person) {
            return person.say();
        }

    }

    @Injectable('Test3')
    class MethodTest3 {
        constructor() {

        }

        @AutoWired()
        sayHello( @Inject(Child) personA: Person, personB: Person) {
            return personA.say() + ', ' + personB.say();
        }

        sayHello2() {

        }
    }

    let container: Container;
    beforeEach(() => {
        let builder = new ContainerBuilder();
        container = builder.create();
    });

    it('show has prop metadata', () => {
        let refs = refl.get(MethodTest2);
        expect(refs.class.hasMetadata(Inject, 'property')).toBeTruthy();
        expect(refs.class.hasMetadata(Inject, 'property',  'testAt')).toBeTruthy();
        expect(refs.class.hasMetadata(Inject, 'property', 'tester')).toBeFalsy();
        expect(refs.class.hasMetadata(Inject, 'method')).toBeFalsy();
    });

    it('show has method metadata', () => {
        let refs = refl.get(MethodTest3);
        expect(refs.class.hasMetadata(AutoWired, 'method')).toBeTruthy();
        expect(refs.class.hasMetadata(AutoWired, 'method', 'sayHello')).toBeTruthy();
        expect(refs.class.hasMetadata(AutoWired, 'method', 'sayHello2')).toBeFalsy();
    });

    it('show exec with type and instance', async () => {
        // container.register(Person);
        container.register(MethodTest);
        let mtt = container.get(MethodTest);
        expect(isFunction(mtt.sayHello)).toBeTruthy();
        expect(await container.invoke(mtt, 'sayHello')).toEqual('I love you.');

    });

    it('show exec with specail param', async () => {
        // container.register(Person);
        container.register(MethodTest2);
        expect(await container.invoke(MethodTest2, 'sayHello')).toEqual('Mama');

    });

    it('show exec with many params', async () => {
        // container.register(Person);
        container.register(MethodTest3);
        expect(await container.invoke(MethodTest3, 'sayHello')).toEqual('Mama, I love you.');

    });

    it('show exec with many params and invoke with string', async () => {
        // container.register(Person);
        container.register(MethodTest3);
        expect(await container.invoke('Test3', 'sayHello')).toEqual('Mama, I love you.');

    });


    // it('Aop anntotation test', () => {
    //     container.register(AnnotationAspect);
    //     container.register(CheckRightAspect);
    //     container.register(MethodTest3);
    //     expect(container.invoke('Test3', 'sayHello')).toEqual('Mama, I love you.');

    // });

    after(()=>{
        container.destroy();
    });
});
