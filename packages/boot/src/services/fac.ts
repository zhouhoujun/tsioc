import { lang, Type, createInjector, refl, isFunction } from '@tsdi/ioc';
import { BootstrapOption, IService, ServiceFactory, ServiceFactoryResolver } from '../Context';
import { AnnotationReflect } from '../metadata/ref';
import { DefaultBootContext } from './ctx';

/**
 * runable boot factory.
 */
 export class RunableServiceFactory<T = any> extends ServiceFactory<T> {

    constructor(private _refl: AnnotationReflect<T>) {
        super();
    }

    get type() {
        return this._refl.type;
    }

    async create(option: BootstrapOption) {
        const injector = createInjector(option.injector, option.providers);
        const ctx = new DefaultBootContext(this._refl, injector);
        const startup = ctx.instance as T & IService;
        if (isFunction(startup.configureService)) {
            await startup.configureService(ctx);
        }
        const app = ctx.getRoot();
        ctx.onDestroy(() => {
            startup.destroy?.()
            lang.remove(app.bootstraps, ctx);
        });
        app.bootstraps.push(ctx);
        return ctx;
    }
}

export class DefaultServiceFactoryResolver extends ServiceFactoryResolver {

    resolve<T>(type: Type<T>) {
        return new RunableServiceFactory(refl.get(type));
    }
}