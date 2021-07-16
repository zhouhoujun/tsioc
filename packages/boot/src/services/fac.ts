import { Type, createInjector, refl } from '@tsdi/ioc';
import { BootstrapOption, ServiceFactory, ServiceFactoryResolver } from '../Context';
import { AnnotationReflect } from '../metadata/ref';
import { DefaultRunner } from './runner';

/**
 * runable boot factory.
 */
export class DefaultServiceFactory<T = any> extends ServiceFactory<T> {

    constructor(private _refl: AnnotationReflect<T>) {
        super();
    }

    get type() {
        return this._refl.type;
    }

    create(option: BootstrapOption) {
        const injector = createInjector(option.injector, option.providers);
        const ctx = new DefaultRunner(this._refl, injector);
        return ctx;
    }
}

export class DefaultServiceFactoryResolver extends ServiceFactoryResolver {

    resolve<T>(type: Type<T>) {
        return new DefaultServiceFactory(refl.get(type));
    }
}