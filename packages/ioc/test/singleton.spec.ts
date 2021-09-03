import { Container } from '../src';
import { Person } from './debug';
import expect = require('expect');

describe('Singleton test', () => {



    it('should has one instance', () => {
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
        container.destroy();
    });

});
