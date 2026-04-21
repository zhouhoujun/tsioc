import { AbstractType } from '../types';
import { InvocationOptions, InvokeOptions } from '../context';
import { Invocation, InvocationFactory } from '../invocation';
import { DestroyCallback, OnDestroy } from '../destroy';
import { ClassRef } from '../metadata/class';
import { Injector, MethodType } from '../injector';
import { TokenOf } from '../tokens';
import { Runtime } from '../runtime';
import { Provider } from '../providers';
import { ResolveInterceptorLike } from '../resolver';
import { RunContext } from '../handlers/contexts';
/**
 * abstract invocation
 * implements {@link Invocation}
 */
export declare abstract class AbstractInvocation<T = any, TOpts extends InvocationOptions<T> = InvocationOptions<T>, TInj extends Injector = Injector, TRes = any> extends Invocation<T, TRes, TInj> implements OnDestroy {
    private _classRef;
    readonly injector: TInj;
    protected options?: TOpts | undefined;
    private _mthCtx;
    private _instance?;
    private _isResolve;
    order?: number | undefined;
    constructor(_classRef: ClassRef<T>, injector: TInj, options?: TOpts | undefined);
    get bootstrap(): boolean;
    get type(): AbstractType<T>;
    get classRef(): ClassRef<T>;
    get instance(): T;
    /**
     * Invoke the underlying operation using the class given {@link InvocationContext}.
     * @param context the context to use to invoke the operation
     */
    invoke(): TRes;
    /**
     * Invoke the underlying operation using the class given {@link InvocationContext}.
     * @param args the arguments to use to invoke the operation
     */
    invoke(args: any[]): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     */
    invoke(context?: TInj): TRes;
    /**
     * Invoke the underlying operation using the given {@link RunContext}.
     * @param context the resolve context to use to invoke the operation
     */
    invoke(context: RunContext): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param option invoke arguments.
     */
    invoke(options: InvokeOptions): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method method name.
     */
    invoke(method: MethodType<T>): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method method name.
     * @param context the context to use to invoke the operation
     */
    invoke(method: MethodType<T>, context?: TInj): TRes;
    /**
     * Invoke the underlying operation using the given {@link RunContext}.
     * @param method method name.
     * @param context the context to use to invoke the operation
     */
    invoke(method: MethodType<T>, context?: RunContext): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method method name.
     * @param options invoke arguments.
     */
    invoke(method: MethodType<T>, options?: InvokeOptions): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method method name.
     * @param args the arguments to use to invoke the operation
     */
    invoke(method: MethodType<T>, args?: any[]): TRes;
    protected abstract process(context?: TInj | InvokeOptions, resolveCtx?: RunContext): any;
    protected invokeMethod(name: string | symbol, options?: TInj | InvokeOptions, args?: any[], resolveCtx?: RunContext): any;
    protected createInjector(parent: Injector, options?: InvokeOptions): TInj;
    getInjector(propertyKey: string | symbol): TInj;
    protected createInvokeContext(propertyKey: string | symbol, options?: Injector | InvokeOptions): [TInj, Function | undefined, any];
    protected createInstance(context?: RunContext): T;
    equals(target: Invocation): boolean;
    /**
     * context destroyed or not.
     */
    get destroyed(): boolean;
    /**
     * destroy this.
     */
    destroy(): void | Promise<void>;
    protected clean(): void;
    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    onDestroy(callback?: DestroyCallback): void | Promise<void>;
    protected assertNotDestroyed(): void;
}
/**
 * default invocation.
 * extends {@link AbstractInvocation}
 */
export declare class DefaultInvocation<T = any, TOpts extends InvocationOptions<T> = InvocationOptions<T>, TInj extends Injector = Injector, TRes = any> extends AbstractInvocation<T, TOpts, TInj, TRes> {
    constructor(_classRef: ClassRef<T>, injector: TInj, options?: TOpts);
    protected process(option?: TInj | InvokeOptions, resolveCtx?: RunContext): any;
}
export declare abstract class AbstractInvocationFactory<TOpts extends InvocationOptions = InvocationOptions> implements InvocationFactory<TOpts> {
    protected runtime: Runtime;
    constructor(runtime: Runtime);
    create<T>(type: AbstractType<T> | ClassRef<T>, options?: TOpts): Invocation<T>;
    protected abstract createInstance<T>(typeRef: ClassRef<T>, injector: Injector, options?: TOpts): Invocation<T>;
    protected createInjector<T>(typeRef: ClassRef<T>, injector: Injector, options: TOpts): Injector;
    protected mergeProviders<T>(typeRef: ClassRef<T>, options?: TOpts): Provider[];
    protected mergeResolvers<T>(typeRef: ClassRef<T>, options?: TOpts): TokenOf<ResolveInterceptorLike>[];
    protected getInjector<T>(typeRef: ClassRef<T>, options?: TOpts): Injector;
}
export declare class DefaultInvocationFactory extends AbstractInvocationFactory implements InvocationFactory {
    protected createInstance<T>(typeRef: ClassRef<T>, context: Injector, options?: InvocationOptions<T>): Invocation<T>;
}
