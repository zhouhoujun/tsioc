import { Type, createInjector, refl } from '@tsdi/ioc';
import { BootstrapOption, RunnableFactory, RunnableFactoryResolver } from '../Context';
import { AnnotationReflect } from '../metadata/ref';
import { DefaultRunner } from './runner';

/**
 * runable boot factory.
 */
export class DefaultRunnableFactory<T = any> extends RunnableFactory<T> {

    constructor(private _refl: AnnotationReflect<T>) {
        super();
    }

    get type() {
        return this._refl.type;
    }

    create(option: BootstrapOption) {
        const injector = createInjector(option.injector, option.providers);
        return new DefaultRunner(this._refl, injector);
    }
}

export class DefaultServiceFactoryResolver extends RunnableFactoryResolver {

    resolve<T>(type: Type<T>) {
        return new DefaultRunnableFactory(refl.get(type));
    }
}