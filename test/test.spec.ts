
import 'reflect-metadata';
import 'mocha';
import { expect } from 'chai';
import { ContainerBuilder, AutoWired, Injectable } from '../src';

describe('AutoWried test', () => {

    @Injectable()
    class RoomService {
        constructor() {

        }
        @AutoWired()
        current: Date;
    }

    @Injectable()
    class ClassRoom {
        constructor(public service: RoomService) {

        }
    }

    class SimppleAutoWried {
        constructor() {
        }

        @AutoWired()
        dateProperty: Date;
    }

    it('should auto wried property', () => {
        let builder = new ContainerBuilder();
        let container = builder.build();
        container.register(SimppleAutoWried);
        let instance = container.get(SimppleAutoWried);
        expect(instance).not.undefined;
        expect(instance.dateProperty).not.undefined;
        expect(instance.dateProperty).instanceOf(Date);
    });

    it('should auto create constructor params', () => {
        let builder = new ContainerBuilder();
        let container = builder.build();
        container.register(ClassRoom);
        let instance = container.get(ClassRoom);
        expect(instance).not.undefined;
        expect(instance.service).not.undefined;
        expect(instance.service.current).instanceOf(Date);
    });

});
