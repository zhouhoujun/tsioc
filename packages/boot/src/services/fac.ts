import { lang, Type, createInjector, refl, isFunction } from '@tsdi/ioc';
import { BootContext, BootstrapOption, IService, Runnable, ServiceFactory, ServiceFactoryResolver, Configurable, ApplicationContext } from '../Context';
import { AnnotationReflect } from '../metadata/ref';
import { DefaultBootContext } from './ctx';
import { Service } from './service';

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

    protected createService(ctx: BootContext) {
        if (isFunction(ctx.instance)) {
            return ctx.instance;
        }
        return ctx.injector.resolve({ token: Service, target: ctx.instance }) ?? ctx.instance;
    }

    async create(option: BootstrapOption, appContext?: ApplicationContext) {
        const injector = createInjector(option.injector, option.providers);
        const ctx = new DefaultBootContext(this._refl, injector);
        const serv = this.createService(ctx) as IService & Configurable<T> & Runnable<T>;
        if (isFunction(serv.configureService)) {
            await serv.configureService(ctx);
        }
        if (!appContext) {
            appContext = injector.get(ApplicationContext);
        }
        ctx.onDestroy(() => {
            serv.destroy?.()
            lang.remove(appContext.bootstraps, ctx);
        });
        appContext.bootstraps.push(ctx);
        if (isFunction(serv.run)) {
            await serv.run(ctx);
        }
        return ctx;
    }
}

export class DefaultServiceFactoryResolver extends ServiceFactoryResolver {

    resolve<T>(type: Type<T>) {
        return new DefaultServiceFactory(refl.get(type));
    }
}