import 'mocha';
import { expect } from 'chai';
import { ContainerBuilder, AutoWired, Injectable, Singleton, IContainer, ParameterMetadata, Param } from '../src';
import { SimppleAutoWried, ClassRoom, MClassRoom, CollegeClassRoom, Person } from './debug';

describe('Singleton test', () => {



    it('should has one instance',  () => {
        let builder = new ContainerBuilder();
        let container = builder.create();
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

    it('should has one instance',  async () => {
        let builder = new ContainerBuilder();
        let container = await builder.build({
            files: __dirname + '/debug.ts'
        });

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

