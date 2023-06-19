import { Injector } from '../src';
import * as mds from './extends-test';
import { Person, Home } from './extends-test';
import expect = require('expect');

describe('extends test', () => {
    let injector: Injector;
    
    before(async () => {
        injector = Injector.create();
        injector.use(mds);
    });

    it('should auto wried base class property', () => {
        expect(injector.has(Person)).toBeTruthy();
        const instance = injector.get(Person);
        expect(instance.home).not.toBeUndefined();
        expect(instance.container).not.toBeUndefined();
        expect(instance.container.has(Home)).toEqual(true);
        expect(instance.home instanceof Home).toEqual(true);
        expect(instance.back()).toEqual('back home');
    });


    it('resolve ctor param same name overrid of basic class', ()=> {
        const service = injector.get(mds.StudentService);
        expect(service.person).toBeInstanceOf(mds.Student);
        expect((service.person as mds.Student).type).toEqual(3);
    })

    after(()=>{
        injector.destroy();
    });

});

