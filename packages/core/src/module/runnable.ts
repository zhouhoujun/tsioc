import { Type, refl, lang, TypeReflect, DestroyCallback, isFunction, OperationInvokerFactory, InvocationContext, OperationInvokerFactoryResolver, InvokeArguments } from '@tsdi/ioc';
import { ApplicationContext, BootstrapOption } from '../Context';
import { ModuleRef } from '../module.ref';
import { Runnable, RunnableFactory, RunnableFactoryResolver, TargetRef } from '../runnable';



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
        const factory = injector.get(OperationInvokerFactoryResolver).create(this._refl);
        const ctx = factory.createContext(injector, option);
        context && ctx.setValue(ApplicationContext, context);

        const target = injector.resolve({ token: this.type, regify: true, context: ctx });
        let targetRef: TargetRef | undefined;
        let runable: Runnable;
        if (target instanceof Runnable) {
            runable = target;
        } else {
            targetRef = new RunnableTargetRef(factory, ctx, target);
            ctx.setValue(TargetRef, targetRef);
            runable = injector.resolve({
                token: Runnable,
                context: ctx
            });
        }

        if (context) {
            (targetRef || injector).onDestroy(() => {
                lang.remove(context.bootstraps, runable);
            });
            context.bootstraps.push(runable);
            if (targetRef) {
                injector.onDestroy(targetRef);
            }
        }

        return runable;
    }
}



/**
 * target ref for {@link Runnable}.
 */
export class RunnableTargetRef<T = any> extends TargetRef<T>  {

    private _destroyed = false;
    private _dsryCbs = new Set<DestroyCallback>();

    constructor(readonly invokerFactory: OperationInvokerFactory<T>, readonly context: InvocationContext, readonly instance: T) {
        super();
    }

    get type(): Type<T> {
        return this.invokerFactory.targetType;
    }

    get reflect(): TypeReflect<T> {
        return this.invokerFactory.targetReflect;
    }

    invoke(method: string, option?: InvokeArguments): any {
        const context = this.invokerFactory.createContext(this.context.injector, { ...option, parent: this.context })
        const result = this.invokerFactory.create(method, this.instance).invoke(context);
        context.destroy();
        return result;
    }

    get destroyed() {
        return this._destroyed;
    }

    /**
     * Destroys the component instance and all of the data structures associated with it.
     */
    destroy(): void {
        if (!this._destroyed) {
            this._destroyed = true;
            try {
                this._dsryCbs.forEach(cb => isFunction(cb) ? cb() : cb?.destroy());
            } finally {
                this._dsryCbs.clear();
                this.context.destroy();
                (this as any).context = null;
                (this as any).instance = null;
                (this as any).invokerFactory = null;
            }
        }
    }

    /**
     * A lifecycle hook that provides additional developer-defined cleanup
     * functionality for the component.
     * @param callback A handler function that cleans up developer-defined data
     * associated with this component. Called when the `destroy()` method is invoked.
     */
    onDestroy(callback: DestroyCallback): void {
        this._dsryCbs.add(callback);
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
