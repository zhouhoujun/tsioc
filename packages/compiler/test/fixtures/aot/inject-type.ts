import { Inject, Injectable, Injector } from '@tsdi/ioc';

@Injectable()
export class TypeInjectedService {
    constructor(@Inject() readonly injector: Injector) {}
}

@Injectable()
export class TypeInjectedPropertyService {
    @Inject()
    injector!: Injector;
}
