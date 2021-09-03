import { Container, Injector } from '../src';
import { MiddleSchoolStudent, Person, Student } from './debug';
import expect = require('expect');


describe('ModuleLoader test', () => {

    it('should has one instance via load module', async () => {
        let container = Container.create();
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
        container.destroy();
    });

    it('should load module via injector', async () => {

        const inj = Injector.create();

        const types = await inj.load({
            basePath: __dirname,
            files: 'debug.ts'
        });

        expect(types.length).toBeGreaterThan(0);

        const stu = inj.get(Student);
        expect(stu).toBeInstanceOf(MiddleSchoolStudent);

    });

});

