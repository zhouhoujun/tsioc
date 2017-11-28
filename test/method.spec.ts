import 'mocha';
import { expect } from 'chai';
import { Method, ContainerBuilder, AutoWired, Injectable, Singleton, IContainer, ParameterMetadata, Param, Execution, Aspect, isFunction } from '../src';
import { async } from 'q';


describe('method exec test', () => {


    @Injectable
    class Person {
        constructor() {

        }
        say() {
            return 'hello word.'
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
        let runner = new Execution(container);
        expect(await runner.exec(MethodTest, 'sayHello', mtt)).eq('hello word.');

    });

    it('show exec with only type', async () => {
        // container.register(Person);
        container.register(MethodTest);
        let runner = new Execution(container);
        expect(await runner.exec(MethodTest, 'sayHello')).eq('hello word.');

    });
});
