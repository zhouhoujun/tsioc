import expect = require('expect');
import { Injectable, Inject, getToken, ProviderIn, refl, Injector } from '../src';


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
    private provider: DataProvider;

    flash() {
        return this.provider.fetch();
    }
}


@ProviderIn(TestService, DataProvider, 'tt')
export class TestServiceProvider extends DataProvider {
    override fetch(): any {
        return 'tt';
    }
}


describe('getService', () => {

    let injector: Injector;
    before(() => {

        injector = Injector.create([DataProvider, CustomDataProvider, TestService, TestServiceProvider]);
    });

    it('get', () => {
        let tsr = injector.get(TestService);
        expect(tsr).toBeInstanceOf(TestService);
        expect(tsr.flash()).toEqual('hi');
    })


    it('get service', () => {
        let tsr = injector.getService(TestService);
        expect(tsr).toBeInstanceOf(TestService);
        expect(tsr.flash()).toEqual('hi');
    })


    it('get service with providers', () => {
        let tsr = injector.getService(TestService, { provide: DataProvider, useClass: CustomDataProvider });
        expect(tsr).toBeInstanceOf(TestService);
        expect(tsr.flash()).toEqual('hi custom');
    })

    it('get service with providers in option', () => {
        let tsr = injector.getService({ token: TestService, providers: [{ provide: DataProvider, useClass: CustomDataProvider }] });
        expect(tsr).toBeInstanceOf(TestService);
        expect(tsr.flash()).toEqual('hi custom');
    })

    it('get service with alias in option', () => {
        let tsr = injector.getService({ token: getToken(DataProvider, 'tt'), target: TestService });
        expect(tsr).toBeInstanceOf(TestServiceProvider);
        expect(tsr.fetch()).toEqual('tt');
    })

    after(() => {
        injector.destroy();
    });

});
