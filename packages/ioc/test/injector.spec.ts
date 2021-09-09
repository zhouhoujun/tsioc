import { Injectable, Injector, isNumber } from '@tsdi/ioc';
import expect = require('expect');
import { CollegeStudent, Student } from './debug';

class Person {
    constructor(public name: string, public age: number) { }
}

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
            { provide: Person, useFactory: (name:string, arg: number) => new Person(name, arg), deps: ['name', 'age'] },
            { provide: 'Hanke', useValue: new Person('Hanke', 2) },
            { provide: DeviceA, deps: [PlcService] }
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
        const data =  inj.invoke(device.service, plc=> plc.read);
        expect(isNumber(data)).toBeTruthy();
    });

    after(()=>{
        inj.destroy();
    })
});

