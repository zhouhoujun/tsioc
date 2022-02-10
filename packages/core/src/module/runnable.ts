import { Type, refl, TypeReflect, OperationFactoryResolver, EMPTY, isFunction, Injector, OperationFactory, DestroyCallback, lang } from '@tsdi/ioc';
import { Runnable, RunnableFactory, RunnableFactoryResolver, RunnableRef } from '../runnable';
import { ApplicationContext, BootstrapOption } from '../context';
import { ModuleRef } from '../module.ref';


export class DefaultRunnableRef<T> extends RunnableRef<T> {
    private _destroyed = false;
    private _dsryCbs = new Set<DestroyCallback>();

    private _instance: T | undefined;
    constructor(protected factory: OperationFactory<T>) {
        super();
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

    async run() {
        if (isFunction((this.instance as T & Runnable).run)) {
            return await this.factory.invoke('run', undefined, this.instance);
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

        const runnableRef = factory.resolve(RunnableRef) ?? new DefaultRunnableRef(factory);

        const context = injector.get(ApplicationContext);
        if (context) {
            runnableRef.onDestroy(() => {
                lang.remove(context.bootstraps, runnableRef);
            });
            context.bootstraps.push(runnableRef);
        }

        return runnableRef;
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
