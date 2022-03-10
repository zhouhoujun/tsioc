import { Type, refl, TypeReflect, OperationFactoryResolver, isFunction, Injector, OperationFactory, DestroyCallback, lang } from '@tsdi/ioc';
import { RunnableFactory, RunnableFactoryResolver, RunnableRef } from '../runnable';
import { ApplicationContext, BootstrapOption } from '../context';
import { ModuleRef } from '../module.ref';

/**
 * runnableRef implement
 */
export class DefaultRunnableRef<T> extends RunnableRef<T> {
    private _destroyed = false;
    private _dsryCbs = new Set<DestroyCallback>();

    private _instance: T | undefined;
    constructor(protected factory: OperationFactory<T>) {
        super();
        this.factory.context.setValue(RunnableRef, this);
    }

    get type() {
        return this.factory.type;
    }

    get reflect() {
        return this.factory.reflect;
    }

    get injector() {
        return this.factory.injector;
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this.factory.resolve();
        }
        return this._instance;
    }

    run() {
        const runnables = this.reflect.class.runnables.filter(r => !r.auto);
        if (runnables.length === 1) {
            let runable = runnables[0];
            return this.factory.invoke(runable.method, runable.args, this.instance);
        } else if (runnables.length) {
            return lang.step(runnables.map(r => () => this.factory.invoke(r.method, r.args, this.instance)));
        } else {
            return this.factory.invoke('run', undefined, this.instance);
        }
    }

    get destroyed() {
        return this._destroyed;
    }

    destroy(): void {
        if (!this._destroyed) {
            this._destroyed = true;
            try {
                this._dsryCbs.forEach(cb => isFunction(cb) ? cb() : cb?.onDestroy());
            } finally {
                this._dsryCbs.clear();
                this.factory.onDestroy();
                this.factory = null!;
                this._instance = null!;
            }
        }
    }

    onDestroy(callback?: DestroyCallback): void {
        if (callback) {
            this._dsryCbs.add(callback);
        } else {
            return this.destroy();
        }
    }
}

/**
 * factory for {@link RunnableRef}.
 */
export class DefaultRunnableFactory<T = any> extends RunnableFactory<T> {

    constructor(readonly reflect: TypeReflect<T>, private moduleRef?: ModuleRef) {
        super();
    }

    override create(injector: Injector, option?: BootstrapOption) {

        const factory = injector.get(OperationFactoryResolver).resolve(this.reflect, injector, option);

        const runnableRef = this.createInstance(factory);

        const context = injector.get(ApplicationContext);
        if (context) {
            runnableRef.onDestroy(() => {
                lang.remove(context.bootstraps, runnableRef);
            });
            context.bootstraps.push(runnableRef);
        }

        return runnableRef;
    }

    protected createInstance(factory: OperationFactory<T>): RunnableRef<T> {
        return new DefaultRunnableRef(factory);
    }
}


/**
 * factory resolver for {@link RunnableFactory}.
 */
export class DefaultRunnableFactoryResolver extends RunnableFactoryResolver {
    constructor(private moduleRef?: ModuleRef) {
        super();
    }
    override resolve<T>(type: Type<T> | TypeReflect<T>) {
        return new DefaultRunnableFactory(isFunction(type) ? refl.get(type) : type, this.moduleRef);
    }
}
