import {
    Type, refl, TypeDef, isFunction, Injector, lang, InvokeArguments, DestroyCallback,
    InvocationContext, ReflectiveResolver, ReflectiveRef
} from '@tsdi/ioc';
import { BootstrapOption, RunnableFactory, RunnableFactoryResolver, RunnableRef } from '../runnable';
import { ModuleRef } from '../module.ref';
import { ApplicationRunners } from '../runners';

/**
 * runnableRef implement
 */
export class DefaultRunnableRef<T> extends RunnableRef<T> {

    private _instance: T | undefined;
    private _ref: ReflectiveRef<T>;
    constructor(def: TypeDef<T>, injector: Injector, options?: InvokeArguments, protected defaultInvoke = 'run') {
        super();
        this._ref = injector.get(ReflectiveResolver).resolve(def, injector, options);
        this.context.setValue(RunnableRef, this);
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this.createInstance();
        }
        return this._instance
    }

    run() {
        const runnables = this.def.class.runnables.filter(r => !r.auto);
        if (runnables.length === 1) {
            const runable = runnables[0];
            return this._ref.invoke(runable.method, runable.args, this.instance)
        } else if (runnables.length) {
            return lang.step(runnables.map(r => () => this._ref.invoke(r.method, r.args, this.instance)))
        } else {
            return this._ref.invoke(this.defaultInvoke, undefined, this.instance)
        }
    }

    override destroy(): void | Promise<void> {
        if (this.destroyed) return;
        this._instance = null!
        return this._ref.destroy();
    }

    get ref() {
        return this._ref;
    }


    get destroyed(): boolean {
        return this._ref.destroyed;
    }
    get injector(): Injector {
        return this._ref.injector;
    }

    get def(): TypeDef<T> {
        return this._ref.def;
    }
    get type(): Type<T> {
        return this._ref.type;
    }
    get context(): InvocationContext<any> {
        return this._ref.context;
    }

    onDestroy(callback?: DestroyCallback | undefined): void | Promise<void> {
        return this._ref.onDestroy(callback);
    }

    protected createInstance() {
        return this._ref.resolve();
    }

}

/**
 * factory for {@link RunnableRef}.
 */
export class DefaultRunnableFactory<T = any> extends RunnableFactory<T> {

    constructor(readonly def: TypeDef<T>, private moduleRef?: ModuleRef) {
        super()
    }

    override create(injector: Injector, option?: BootstrapOption) {

        const runnableRef = this.createInstance(this.def, injector ?? this.moduleRef, option, option?.defaultInvoke);

        const runners = injector.get(ApplicationRunners);
        runners.attach(runnableRef);
        return runnableRef
    }

    protected createInstance(def: TypeDef<T>, injector: Injector, options?: InvokeArguments, invokeMethod?: string): RunnableRef<T> {
        return new DefaultRunnableRef(def, injector, options, invokeMethod)
    }

}


/**
 * factory resolver for {@link RunnableFactory}.
 */
export class DefaultRunnableFactoryResolver extends RunnableFactoryResolver {
    constructor(private moduleRef?: ModuleRef) {
        super()
    }

    override resolve<T>(type: Type<T> | TypeDef<T>) {
        return new DefaultRunnableFactory(isFunction(type) ? refl.get(type) : type, this.moduleRef)
    }
}
