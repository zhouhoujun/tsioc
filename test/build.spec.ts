import 'mocha';
import { expect } from 'chai';
import { ContainerBuilder, AutoWired, Injectable, IContainer, ParameterMetadata, Param } from '../src';
import { SimppleAutoWried, ClassRoom, MClassRoom, CollegeClassRoom } from './debug';

describe('auto register with build', () => {

    let container: IContainer;
    beforeEach(async () => {
        let builder = new ContainerBuilder();
        container = await builder.build({
            files: __dirname + '/debug.ts'
        });
    });

    it('should auto wried property', () => {
        let instance = container.get(SimppleAutoWried);
        expect(instance).not.undefined;
        expect(instance.dateProperty).not.undefined;
        expect(instance.dateProperty).instanceOf(Date);
    });

    it('should auto create constructor params', () => {
        let instance = container.get(ClassRoom);
        // console.log(instance);
        expect(instance).not.undefined;
        expect(instance.service).not.undefined;
        expect(instance.service.current).instanceOf(Date);
    });

    it('should auto create prop with spec implement sub class.', () => {
        let instance = container.get(MClassRoom);
        expect(instance).not.undefined;
        expect(instance.leader).not.undefined;
        expect(instance.leader.sayHi()).eq('I am a middle school student');
    });

    it('should auto create constructor params with spec implement sub class.', () => {
        let instance = container.get(CollegeClassRoom);
        expect(instance).not.undefined;
        expect(instance.leader).not.undefined;
        expect(instance.leader.sayHi()).eq('I am a college student');
    });

});
