import { lang, Type, createInjector, refl } from '@tsdi/ioc';
import { BootstrapOption, ServiceFactory, ServiceFactoryResolver } from '../Context';
import { AnnotationReflect } from '../metadata/ref';
import { DefaultBootContext } from './ctx';
import { Service } from './service';

/**
 * runable boot factory.
 */
 export class RunableServiceFactory<T = any> extends ServiceFactory<T> {

    constructor(private refl: AnnotationReflect<T>) {
        super();
    }

    get type() {
        return this.refl.type;
    }

    async create(option: BootstrapOption) {
        const injector = createInjector(option.injector, option.providers);
        const ctx = new DefaultBootContext(this.refl, injector);
        const startup = ctx.instance;
        if (startup instanceof Service) {
            await startup.configureService(ctx);
        }
        const app = ctx.getRoot();
        ctx.onDestroy(() => {
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