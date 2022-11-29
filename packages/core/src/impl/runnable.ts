import {
    Type, refl, TypeDef, isFunction, Injector, lang, DestroyCallback,
    InvocationContext, ReflectiveFactory, ReflectiveRef, InvokeArguments, Reflective
} from '@tsdi/ioc';
import { BootstrapOption, RunnableFactory, RunnableRef } from '../runnable';
import { ModuleRef } from '../module.ref';
import { ApplicationRunners } from '../runners';

/**
 * runnableRef implement
 */
export class DefaultRunnableRef<T> extends RunnableRef<T> {

    private _instance: T | undefined;
    private _ref: ReflectiveRef<T>;
    private _moduleRef?: ModuleRef;
    constructor(ref: ReflectiveRef<T>, moduleRef?: ModuleRef, options?: InvokeArguments, protected defaultInvoke = 'run') {
        super();
        this._ref = ref;
        this._moduleRef = moduleRef;
        this.context.setValue(RunnableRef, this);
    }

    get instance(): T {
        if (!this._instance) {
            this._instance = this.createInstance();
        }
        return this._instance
    }

    run() {
        const runnables = this.ref.typeRef.runnables.filter(r => !r.auto);
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

    get moduleRef(): ModuleRef {
        if (!this._moduleRef) {
            this._moduleRef = this.injector.get(ModuleRef);
        }
        return this._moduleRef;
    }

    get typeRef(): Reflective<T> {
        return this._ref.typeRef;
    }
    get type(): Type<T> {
        return this._ref.type;
    }
    get context(): InvocationContext<any> {
        return this._ref.getContext();
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

    constructor(protected moduleRef?: ModuleRef) {
        super()
    }

    override create(type: Type<T> | Reflective<T>, injector: Injector, option?: BootstrapOption) {

        const runnableRef = this.createInstance(isFunction(type) ? refl.get(type) : type, injector ?? this.moduleRef, option, option?.defaultInvoke);

        const runners = injector.get(ApplicationRunners);
        runners.attach(runnableRef);
        return runnableRef
    }

    protected createInstance(typeRef: Reflective<T>, injector: Injector, options?: InvokeArguments, invokeMethod?: string): RunnableRef<T> {
        const ref = injector.get(ReflectiveFactory).create(typeRef, injector, options);
        return new DefaultRunnableRef(ref, this.moduleRef, options, invokeMethod)
    }

}

