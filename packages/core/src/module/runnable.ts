import { Type, refl, Destroyable, lang, Injector, TypeReflect, DestroyCallback, isFunction } from '@tsdi/ioc';
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
        const target = injector.resolve({ token: this.type, regify: true });
        let targetRef: TargetRef | undefined;
        const runable = ((target instanceof Runnable) ? target
            : injector.resolve({
                ...option,
                token: Runnable,
                target,
                values: [[TargetRef, targetRef = new RunnableTargetRef(this._refl, target, injector)]]
            })) as Runnable & Destroyable;

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

    constructor(readonly reflect: TypeReflect<T>, readonly instance: T, readonly injector: Injector) {
        super();
    }

    get type(): Type<T> {
        return this.reflect.type as Type;
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
                (this as any).instance = null!;
                (this as any).reflect = null!;
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
