import { Type, refl, TypeDef, isFunction, Injector, lang, DefaultReflectiveRef, InvokeArguments } from '@tsdi/ioc';
import { BootstrapOption, RunnableFactory, RunnableFactoryResolver, RunnableRef } from '../runnable';
import { ModuleRef } from '../module.ref';
import { ApplicationRunners } from '../runners';

/**
 * runnableRef implement
 */
export class DefaultRunnableRef<T> extends DefaultReflectiveRef<T> implements RunnableRef<T> {

    private _instance: T | undefined;
    constructor(def: TypeDef<T>, injector: Injector, options?: InvokeArguments, private defaultInvoke = 'run') {
        super(def, injector, options);
        this.context.setValue(RunnableRef, this);
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this.resolve()
        }
        return this._instance
    }

    run() {
        const runnables = this.def.class.runnables.filter(r => !r.auto);
        if (runnables.length === 1) {
            const runable = runnables[0];
            return this.invoke(runable.method, runable.args, this.instance)
        } else if (runnables.length) {
            return lang.step(runnables.map(r => () => this.invoke(r.method, r.args, this.instance)))
        } else {
            return this.invoke(this.defaultInvoke, undefined, this.instance)
        }
    }

    override destroy(): void | Promise<void> {
        if (this.destroyed) return;
        this._instance = null!
        return super.destroy();
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
