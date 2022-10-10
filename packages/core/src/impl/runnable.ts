import { Type, refl, TypeDef, isFunction, Injector, lang, DefaultReflectiveRef, InvokeArguments, DestroyCallback, InvocationContext, InvocationOption, InvokeOption, MethodType, OperationInvoker, Token } from '@tsdi/ioc';
import { BootstrapOption, RunnableFactory, RunnableFactoryResolver, RunnableRef } from '../runnable';
import { ModuleRef } from '../module.ref';
import { ApplicationRunners } from '../runners';

/**
 * runnableRef implement
 */
export class DefaultRunnableRef<T> extends RunnableRef<T> {

    private _instance: T | undefined;
    private _impl: DefaultReflectiveRef<T>;
    constructor(def: TypeDef<T>, injector: Injector, options?: InvokeArguments, private defaultInvoke = 'run') {
        super();
        this._impl = new DefaultReflectiveRef(def, injector, options);
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
        return this._impl.destroy();
    }


    get destroyed(): boolean {
        return this._impl.destroyed;
    }
    get injector(): Injector {
        return this._impl.injector;
    }
    resolve(): T;
    resolve<R>(token: Token<R>): R;
    resolve(token?: any): any {
        return this._impl.resolve(token);
    }
    get def(): TypeDef<T> {
        return this._impl.def;
    }
    get type(): Type<T> {
        return this._impl.type;
    }
    get context(): InvocationContext<any> {
        return this._impl.context;
    }

    invoke(method: MethodType<T>, option?: InvokeOption, instance?: T): any;
    invoke(method: MethodType<T>, context?: InvocationContext, instance?: T): any;
    invoke(method: MethodType<T>, context?: InvokeOption | InvocationContext, instance?: T): any {
        return this._impl.invoke(method, context, instance);
    }

    resolveArguments(method: MethodType<T>, context?: InvocationContext<any> | undefined): any[] {
        return this._impl.resolveArguments(method, context);
    }
    createInvoker(method: string, instance?: T | undefined): OperationInvoker<any> {
        return this._impl.createInvoker(method, instance);
    }
    createContext(option?: InvocationOption | undefined): InvocationContext<any>;
    createContext(injector: Injector, option?: InvocationOption | undefined): InvocationContext<any>;
    createContext(parant: InvocationContext<any>, option?: InvocationOption | undefined): InvocationContext<any>;
    createContext(parant?: any, option?: any): InvocationContext<any> {
        return this._impl.createContext(parant, option);
    }
    onDestroy(callback?: DestroyCallback | undefined): void | Promise<void> {
        return this._impl.onDestroy(callback);
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
