import { Person } from './debug';
import expect = require('expect');
import { ContainerBuilder } from '../src';

describe('Singleton test', () => {

    it('should has one instance via build container',  async () => {
        let builder = new ContainerBuilder();
        let container = await builder.build({
            basePath: __dirname,
            files: 'debug.ts'
        });
        // container.register(Person);
        let instance = container.get(Person);
        expect(instance).toBeDefined();
        expect(instance.name).toEqual('testor');
        instance.name = 'testor B';
        expect(instance.name).toEqual('testor B');

        let instanceB = container.get(Person);
        expect(instanceB.name).toEqual('testor B');
        expect(instance).toEqual(instanceB);

        container.destroy();
    });

});

