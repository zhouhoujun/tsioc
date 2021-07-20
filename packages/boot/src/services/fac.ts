import { Type, createInjector, refl, Destroyable, lang, IInjector } from '@tsdi/ioc';
import { ApplicationContext, BootstrapOption, Runnable, RunnableFactory, RunnableFactoryResolver, TargetRef } from '../Context';
import { AnnotationReflect } from '../metadata/ref';


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

    create(option: BootstrapOption, context?: ApplicationContext) {
        const injector = createInjector(option.injector, option.providers);
        const targetRef = new RunnableTargetRef(this._refl, injector);
        injector.inject({ provide: TargetRef, useValue: targetRef })
        const target = targetRef.instance;
        const runable = ((target instanceof Runnable) ? target : injector.resolve({ token: Runnable, target }, { provide: TargetRef, useValue: targetRef })) as Runnable & Destroyable;

        if (context) {
            targetRef.onDestroy(() => {
                runable.destroy?.();
                lang.remove(context.bootstraps, runable);
                lang.cleanObj(runable);
            });
            context.bootstraps.push(runable);
        } else {
            targetRef.onDestroy(() => {
                runable.destroy?.();
                lang.cleanObj(runable);
            });
        }

        return runable;
    }
}



/**
 * target ref.
 */
export class RunnableTargetRef<T = any> extends TargetRef<T>  {
    constructor(readonly reflect: AnnotationReflect<T>, readonly injector: IInjector, private _instance?: T) {
        super();
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this.injector.resolve({ token: this.type, regify: true }, { provide: TargetRef, useValue: this });
        }
        return this._instance;
    }

    get type(): Type<T> {
        return this.reflect.type;
    }

    /**
     * Destroys the component instance and all of the data structures associated with it.
     */
    destroy(): void {
        this.injector.destroy();
        lang.cleanObj(this);
    }

    /**
     * A lifecycle hook that provides additional developer-defined cleanup
     * functionality for the component.
     * @param callback A handler function that cleans up developer-defined data
     * associated with this component. Called when the `destroy()` method is invoked.
     */
    onDestroy(callback: () => void): void {
        this.injector.onDestroy(callback);
    }
}


export class DefaultServiceFactoryResolver extends RunnableFactoryResolver {

    resolve<T>(type: Type<T>) {
        return new DefaultRunnableFactory(refl.get(type));
    }
}