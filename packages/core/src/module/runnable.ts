import { Type, refl, lang, TypeReflect, OperationFactoryResolver, EMPTY } from '@tsdi/ioc';
import { Runner, RunnableFactory, RunnableFactoryResolver, Runnable } from '../runnable';
import { ApplicationContext, BootstrapOption } from '../context';
import { ModuleRef } from '../module.ref';


/**
 * factory for {@link Runnable}.
 */
export class DefaultRunnableFactory<T = any> extends RunnableFactory<T> {

    constructor(private _refl: TypeReflect<T>, private moduleRef?: ModuleRef) {
        super();
    }

    override get type() {
        return this._refl.type as Type;
    }

    override create(option: BootstrapOption, context?: ApplicationContext) {
        const injector = this.moduleRef ?? option.injector ?? context?.injector!;
        const factory = injector.get(OperationFactoryResolver)
            .resolve(this._refl, injector,  context ? {
                ...option,
                values: [option?.values || EMPTY as any, [ApplicationContext, context]]
            } : option);

        const target = factory.resolve();
        let runable: Runnable;
        if (target instanceof Runner) {
            runable = target;
        } else {
            runable = injector.resolve({
                token: Runner,
                context: factory.context
            });
        }

        if (context) {
            // runnableRef.onDestroy(() => {
            //     lang.remove(context.bootstraps, runable);
            // });
            context.bootstraps.push(runable);
        }

        return runable;
    }
}


/**
 * factory resolver for {@link RunnableFactory}.
 */
export class DefaultRunnableFactoryResolver extends RunnableFactoryResolver {

    constructor(private moduleRef?: ModuleRef) {
        super();
    }

    override resolve<T>(type: Type<T>) {
        return new DefaultRunnableFactory(refl.get(type), this.moduleRef);
    }
}
