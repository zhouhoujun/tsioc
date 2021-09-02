import expect = require('expect');
import { ContainerBuilder } from '../src';
import { Injectable, Inject, Container, getToken, ProviderIn, refl } from '@tsdi/ioc';


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

    let container: Container;
    before(() => {
        let builder = new ContainerBuilder();
        container = builder.create();
        container.inject(DataProvider, CustomDataProvider, TestService, TestServiceProvider);
    });

    it('get', () => {
        let tsr = container.get(TestService);
        expect(tsr).toBeInstanceOf(TestService);
        expect(tsr.flash()).toEqual('hi');
    })


    it('get service', () => {
        let tsr = container.getService(TestService);
        expect(tsr).toBeInstanceOf(TestService);
        expect(tsr.flash()).toEqual('hi');
    })


    it('get service with providers', () => {
        let tsr = container.getService(TestService, { provide: DataProvider, useClass: CustomDataProvider });
        expect(tsr).toBeInstanceOf(TestService);
        expect(tsr.flash()).toEqual('hi custom');
    })

    it('get service with providers in option', () => {
        let tsr = container.getService({ token: TestService, providers: [{ provide: DataProvider, useClass: CustomDataProvider }] });
        expect(tsr).toBeInstanceOf(TestService);
        expect(tsr.flash()).toEqual('hi custom');
    })

    it('get service with alias in option', () => {
        let tsr = container.getService({ token: getToken(DataProvider, 'tt'), target: TestService });
        expect(tsr).toBeInstanceOf(TestServiceProvider);
        expect(tsr.fetch()).toEqual('tt');
    })

    after(()=>{
        container.destroy();
    });

});
