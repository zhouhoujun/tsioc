import expect = require('expect');
import { ContainerBuilder } from '../src';
import { Injectable, Inject, Refs, IContainer, getToken} from '@tsdi/ioc';


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
    fetch(): any {
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


@Refs(TestService, DataProvider, 'tt')
export class TestServiceProvider extends DataProvider {
    fetch(): any {
        return 'tt';
    }
}


describe('getService', () => {

    let container: IContainer;
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
        let tsr = container.getService({ token: TestService }, { provide: DataProvider, useClass: CustomDataProvider });
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

});
