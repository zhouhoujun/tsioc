import 'mocha';
import { expect } from 'chai';
import { ContainerBuilder, AutoWired, Injectable, Singleton, IContainer, ParameterMetadata, Param } from '../src';
import { SimppleAutoWried, ClassRoom, MClassRoom, CollegeClassRoom } from './debug';

describe('Singleton test', () => {



    @Singleton
    class Person {
        name = 'testor';
    }

    let container: IContainer;
    beforeEach(async () => {
        let builder = new ContainerBuilder();
        container = await builder.build();
    });

    it('should has one instance', () => {
        container.register(Person);
        let instance = container.get(Person);
        expect(instance).not.undefined;
        expect(instance.name).eq('testor');
        instance.name = 'testor B';
        expect(instance.name).eq('testor B');

        let instanceB = container.get(Person);
        expect(instanceB.name).eq('testor B');
        expect(instance).eq(instanceB);
    });
});

