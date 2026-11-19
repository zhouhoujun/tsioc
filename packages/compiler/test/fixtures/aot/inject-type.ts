import { Autorun, Inject, Injectable, Injector } from '@tsdi/ioc';

@Injectable()
export class TypeInjectedService {
    constructor(@Inject() readonly injector: Injector) {}
}

@Injectable()
export class TypeInjectedPropertyService {
    @Inject()
    injector!: Injector;
}

@Injectable()
@Autorun({ propertyKey: 'setup' })
export class TypeInjectedMethodService {
    ready = false;
    setup(@Inject() injector: Injector) {
        this.ready = !!injector;
    }
}
