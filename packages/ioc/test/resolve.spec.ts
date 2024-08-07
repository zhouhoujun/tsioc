import expect = require('expect');
import { Injectable, Inject, getToken, ProvidedIn, Injector, ReflectiveFactory } from '../src';


@Injectable()
export class DataProvider {
    constructor() {

    }
    fetch(): any {
        return 'hi';
    }
}
@Injectable()
export class CustomDataProvider extends DataProvider {
    override fetch(): any {
        return 'hi custom';
    }
}

@Injectable()
export class TestService {
    constructor() {

    }

    @Inject()
    private provider!: DataProvider;

    flash() {
        return this.provider.fetch();
    }
}


@ProvidedIn(TestService, DataProvider, 'tt')
export class TestServiceProvider extends DataProvider {
    override fetch(): any {
        return 'tt';
    }
}


describe('resolve', () => {

    let injector: Injector;
    before(() => {

        injector = Injector.create([DataProvider, CustomDataProvider, TestService, TestServiceProvider]);
    });

    it('get', () => {
        const tsr = injector.get(TestService);
        expect(tsr).toBeInstanceOf(TestService);
        expect(tsr.flash()).toEqual('hi');
    })


    it('get service', () => {
        const tsr = injector.resolve(TestService);
        expect(tsr).toBeInstanceOf(TestService);
        expect(tsr.flash()).toEqual('hi');
    })


    it('get service with providers', () => {
        const tsr = injector.resolve(TestService, { provide: DataProvider, useClass: CustomDataProvider });
        expect(tsr).toBeInstanceOf(TestService);
        expect(tsr.flash()).toEqual('hi custom');
    })

    it('get service with providers in option', () => {
        const tsr = injector.resolve(TestService, {  providers: [{ provide: DataProvider, useClass: CustomDataProvider }] });
        expect(tsr).toBeInstanceOf(TestService);
        expect(tsr.flash()).toEqual('hi custom');
    })

    it('get service with alias in option', () => {
        const tsr = injector.get(ReflectiveFactory).create(TestService).resolve(getToken(DataProvider, 'tt'));
        expect(tsr).toBeInstanceOf(TestServiceProvider);
        expect(tsr.fetch()).toEqual('tt');
    })

    after(() => {
        injector.destroy();
    });

});
