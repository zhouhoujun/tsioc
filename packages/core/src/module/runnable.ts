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
        const targetRef = new RunnableTargetRef(this._refl, injector);
        const target = targetRef.instance;
        const runable = ((target instanceof Runnable) ? target
            : injector.resolve({
                ...option,
                token: Runnable,
                target,
                values: [[TargetRef, targetRef]]
            })) as Runnable & Destroyable;

        if (context) {
            targetRef.onDestroy(() => {
                lang.remove(context.bootstraps, runable);
            });
            context.bootstraps.push(runable);
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

    constructor(readonly reflect: TypeReflect<T>, readonly injector: Injector, private _instance?: T) {
        super();
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this.injector.resolve({ token: this.type, regify: true, providers: [{ provide: TargetRef, useValue: this }] });
        }
        return this._instance;
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
                this._instance = null!;
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
