import 'mocha';
import { expect } from 'chai';
import { Method, Inject, DefaultContainerBuilder, AutoWired, Injectable, Singleton, IContainer, ParameterMetadata, Param, isFunction } from '../src';
import { hasOwnMethodMetadata, hasPropertyMetadata } from '../src';
// import { AnnotationAspect } from './aop/AnnotationAspect';
// import { CheckRightAspect } from './aop/CheckRightAspect';


describe('method exec test', () => {


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
        sayHello( @Inject(Child) person: Person) {
            return person.say();
        }

    }

    @Injectable('Test3')
    class MethodTest3 {
        constructor() {

        }

        @Method
        sayHello( @Inject(Child) personA: Person, personB: Person) {
            return personA.say() + ', ' + personB.say();
        }

        sayHello2() {

        }
    }

    let container: IContainer;
    beforeEach(() => {
        let builder = new DefaultContainerBuilder();
        container = builder.create();
    });

    it('show has prop metadata', () => {
        expect(hasPropertyMetadata(Inject, MethodTest2)).to.be.true;
        expect(hasPropertyMetadata(Inject, MethodTest2, 'testAt')).to.be.true;
        expect(hasPropertyMetadata(Inject, MethodTest2, 'tester')).to.be.false;
        expect(hasOwnMethodMetadata(Inject, MethodTest3)).to.be.false;
    });

    it('show has method metadata', () => {
        expect(hasOwnMethodMetadata(Method, MethodTest3)).to.be.true;
        expect(hasOwnMethodMetadata(Method, MethodTest3, 'sayHello')).to.be.true;
        expect(hasOwnMethodMetadata(Method, MethodTest3, 'sayHello2')).to.be.false;
    });

    it('show exec with type and instance', async () => {
        // container.register(Person);
        container.register(MethodTest);
        let mtt = container.get(MethodTest);
        expect(isFunction(mtt.sayHello)).is.true;
        expect(await container.invoke(MethodTest, 'sayHello', mtt)).eq('I love you.');

    });

    it('show exec with specail param', async () => {
        // container.register(Person);
        container.register(MethodTest2);
        expect(await container.invoke(MethodTest2, 'sayHello')).eq('Mama');

    });

    it('show exec with many params', async () => {
        // container.register(Person);
        container.register(MethodTest3);
        expect(await container.invoke(MethodTest3, 'sayHello')).eq('Mama, I love you.');

    });

    it('show exec with many params and invoke with string', async () => {
        // container.register(Person);
        container.register(MethodTest3);
        expect(await container.invoke('Test3', 'sayHello')).eq('Mama, I love you.');

    });


    // it('Aop anntotation test', () => {
    //     container.register(AnnotationAspect);
    //     container.register(CheckRightAspect);
    //     container.register(MethodTest3);
    //     expect(container.syncInvoke('Test3', 'sayHello')).eq('Mama, I love you.');

    // });
});
