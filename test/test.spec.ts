
import 'reflect-metadata';
import 'mocha';
import { expect } from 'chai';
import { ContainerBuilder, AutoWired } from '../src';
import { async } from 'q';

describe('AutoWried test', () => {

    class SimppleAutoWried {
        @AutoWired()
        dateProperty: Date;
    }

    it('should auto wried property', async () => {
        let builder = new ContainerBuilder();
        let container = builder.build();
        container.register(SimppleAutoWried);
        let instance = container.get(SimppleAutoWried);
        expect(instance).not.undefined;
        console.log(instance.dateProperty);
        expect(instance.dateProperty).not.undefined;
    })

});
