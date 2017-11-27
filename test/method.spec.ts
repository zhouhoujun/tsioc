import 'mocha';
import { expect } from 'chai';
import { Runner, ContainerBuilder, AutoWired, Injectable, Singleton, IContainer, ParameterMetadata, Param, Execute, Aspect, isFunction } from '../src';


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

        @Runner
        sayHello(person: Person) {
            return person.say();
        }
    }

    let container: IContainer;
    beforeEach(() => {
        let builder = new ContainerBuilder();
        container = builder.create();
    });

    it('show exec with type and instance', () => {
        // container.register(Person);
        container.register(MethodTest);
        let mtt = container.get(MethodTest);
        expect(isFunction(mtt.sayHello)).is.true;
        let runner = new Execute(container);
        expect(runner.exec(MethodTest, 'sayHello', mtt)).eq('hello word.');

    });

    it('show exec with only type', () => {
        // container.register(Person);
        container.register(MethodTest);
        let runner = new Execute(container);
        expect(runner.exec(MethodTest, 'sayHello')).eq('hello word.');

    });
});
