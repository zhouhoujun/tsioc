import { AutoWired, Injectable, Singleton, ParameterMetadata, Param, Container } from '../src';
import { SimppleAutoWried, ClassRoom, MClassRoom, CollegeClassRoom, Person } from './debug';
import expect = require('expect');

describe('Singleton test', () => {



    it('should has one instance',  () => {
        let container = Container.create();
        container.register(Person);
        let instance = container.get(Person);
        expect(instance).toBeDefined();
        expect(instance.name).toEqual('testor');
        instance.name = 'testor B';
        expect(instance.name).toEqual('testor B');

        let instanceB = container.get(Person);
        expect(instanceB.name).toEqual('testor B');
        expect(instance).toEqual(instanceB);
    });

    it('should has one instance via load module',  async () => {
        let container =  Container.create();
        await container.load({
            basePath: __dirname,
            files: 'debug.ts'
        });

        expect(container.has(Person)).toBeTruthy();
        let instance = container.get(Person);
        expect(instance).toBeDefined();
        expect(instance.name).toEqual('testor');
        instance.name = 'testor B';
        expect(instance.name).toEqual('testor B');

        let instanceB = container.get(Person);
        expect(instanceB.name).toEqual('testor B');
        expect(instance).toEqual(instanceB);
    });
});

