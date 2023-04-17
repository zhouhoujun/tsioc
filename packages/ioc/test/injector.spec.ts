import { EMPTY, Injectable, InjectFlags, Injector, isNumber, tokenId } from '@tsdi/ioc';
import expect = require('expect');
import { CollegeStudent, MiddleSchoolStudent, Student } from './debug';


class Person {
    constructor(public name: string, public age: number) { }
}

const GROUP1 = tokenId<Person[]>('GROUP1');

const Students = tokenId<Student[]>('Students');

@Injectable()
class PlcService {

    modle = 's700'
    read(add?: number) {
        return Math.random() * 100;
    }
}

class DeviceA {
    constructor(public service: PlcService) { }
}

describe('Injector test', () => {

    let inj: Injector;
    before(() => {
        inj = Injector.create([
            PlcService,
            { provide: Student, useClass: CollegeStudent },
            { provide: 'hi', useValue: 'hello world.' },
            { provide: Person, useFactory: (name: string, arg: number) => new Person(name, arg), deps: ['name', 'age'] },
            { provide: 'Hanke', useValue: new Person('Hanke', 2) },
            { provide: DeviceA, deps: [PlcService] },
            { provide: GROUP1, useValue: new Person('zhangsan', 20), multi: true },
            { provide: GROUP1, useValue: new Person('lisi', 21), multi: true },
            { provide: Students, useClass: CollegeStudent, multi: true },
            { provide: Students, useClass: MiddleSchoolStudent, multi: true },
        ]);
    });

    it('create injector with providers', () => {
        expect(inj).toBeInstanceOf(Injector);
        expect(inj.size).toBeGreaterThan(0);
    });

    it('use class provider in injector', () => {
        const std = inj.get(Student);
        expect(std).toBeInstanceOf(CollegeStudent);
        expect(std.sayHi()).toEqual('I am a college student');
        const std2 = inj.get(Student);
        expect(std2).toBeInstanceOf(CollegeStudent);
        expect(std === std2).toBeFalsy();

    });

    it('use value provider in injector', () => {
        expect(inj.get('hi')).toEqual('hello world.');
        const hanke = inj.get('Hanke');
        expect(hanke).toBeInstanceOf(Person);
        expect(hanke).toEqual(inj.get('Hanke'));
    });

    it('use factory provider in injector', () => {
        const p = inj.resolve(Person, { provide: 'name', useValue: 'zhangsan' }, { provide: 'age', useValue: 30 });
        expect(p).toBeInstanceOf(Person);
        expect(p.name).toEqual('zhangsan');
        expect(p.age).toEqual(30);
        const p2 = inj.resolve(Person, { provide: 'name', useValue: 'zhangsan' }, { provide: 'age', useValue: 30 });
        expect(p === p2).toBeFalsy();
    });

    it('use constructor provider in injector', () => {

        const device = inj.get(DeviceA);
        expect(device).toBeInstanceOf(DeviceA);
        expect(device.service).toBeInstanceOf(PlcService);
        expect(device.service.modle).toEqual('s700');

        const device1 = inj.get(DeviceA);
        expect(device === device1).toBeFalsy();
    });


    it('invoke by injector', () => {
        const device = inj.get(DeviceA);
        const data = inj.invoke(device.service, plc => plc.read);
        expect(isNumber(data)).toBeTruthy();
    });

    it('multi provider values in injector', () => {
        expect(inj.has(GROUP1)).toBeTruthy();
        const gp1 = inj.get(GROUP1);
        expect(Array.isArray(gp1)).toBeTruthy();
        expect(gp1[0]).toBeInstanceOf(Person);
        expect(gp1[0].name).toEqual('zhangsan');
        expect(gp1[1].name).toEqual('lisi');
    });

    it('multi provider classes in injector', () => {
        expect(inj.has(Students)).toBeTruthy();
        const stus = inj.get(Students);
        expect(Array.isArray(stus)).toBeTruthy();
        expect(inj.get(Student)).toBeInstanceOf(CollegeStudent);
        expect(stus[0]).toBeInstanceOf(CollegeStudent);
        expect(stus[1]).toBeInstanceOf(MiddleSchoolStudent);
        expect(inj.get(Student)).toBeInstanceOf(CollegeStudent);
    });


    describe('with inject flags', () => {

        it('resolve default flags', () => {
            const subinj = Injector.create([], inj);
            expect(subinj.get(Student)).toBeInstanceOf(CollegeStudent);
            expect(subinj.get(Student, undefined, InjectFlags.Default)).toBeInstanceOf(CollegeStudent);
            subinj.destroy();
            expect(subinj.destroyed).toBeTruthy();
        })

        it('resolve self flags', () => {
            const subinj = Injector.create([], inj);
            expect(subinj.get(Students, EMPTY, InjectFlags.Self)).toEqual(EMPTY);
            expect(subinj.get(Students, null, InjectFlags.Self)).toBeNull();
            subinj.destroy();
        })

        it('resolve skip self flags', () => {
            const subinj = Injector.create([], inj);
            const value = subinj.get(Students, EMPTY, InjectFlags.SkipSelf);
            expect(value).not.toEqual(EMPTY);
            expect(Array.isArray(value)).toBeTruthy();
            expect(value[0]).toBeInstanceOf(CollegeStudent);
            expect(value[1]).toBeInstanceOf(MiddleSchoolStudent);
            subinj.destroy();
        })

    });

    after(() => {
        inj.destroy();
    })
});

