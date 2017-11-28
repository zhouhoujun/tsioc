import 'mocha';
import { expect } from 'chai';
import { Method, Inject, ContainerBuilder, AutoWired, Injectable, Singleton, IContainer, ParameterMetadata, Param, Aspect, isFunction } from '../src';
import { async } from 'q';


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
        constructor() {

        }

        @Method()
        sayHello( @Inject(Child) person: Person) {
            return person.say();
        }
    }

    class MethodTest3 {
        constructor() {

        }

        @Method
        sayHello( @Inject(Child) personA: Person, personB: Person) {
            return personA.say() + ', '  + personB.say();
        }
    }

    let container: IContainer;
    beforeEach(() => {
        let builder = new ContainerBuilder();
        container = builder.create();
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
});
