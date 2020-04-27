import expect = require('expect');
import { ContainerBuilder } from '../src/ContainerBuilder';
import { IContainer } from '../src/IContainer';
import { Injectable, Inject } from '@tsdi/ioc';


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

describe('getService', () => {

    let container: IContainer;
    before(() => {
        let builder = new ContainerBuilder();
        container = builder.create();
        container.inject(DataProvider, CustomDataProvider, TestService);
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

    it('get service  with providers in option', () => {
        let tsr = container.getService({ token: TestService, providers: [{ provide: DataProvider, useClass: CustomDataProvider }] });
        expect(tsr).toBeInstanceOf(TestService);
        expect(tsr.flash()).toEqual('hi custom');
    })

});
