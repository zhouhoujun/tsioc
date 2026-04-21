import { AbstractType } from '../types';
import { Provider } from '../providers';
import { PropertyMetadata, ParameterMetadata } from './meta';
import { InvocationOptions, InvokeOptions } from '../context';
import { Token, TokenOf } from '../tokens';
import { ResolveInterceptorLike } from '../resolver';
import { Injector, MethodType, Resolve } from '../injector';
import { Invocation, InvocationFactory } from '../invocation';
import { TypeDef } from './type.def';
import { DecoratorFn, DecoratorType, DecorDefine, RunableDefine } from './define';
import { RunContext } from '../handlers/contexts';
/**
 * type class reflective.
 *
 * 类反射
 */
export declare class ClassRef<T = any> {
    readonly type: AbstractType<T>;
    private parent?;
    /**
     * class name.
     */
    get className(): string;
    private _classDecors?;
    get classDecors(): DecoratorFn[];
    private _propDecors?;
    get propDecors(): DecoratorFn[];
    private _methodDecors?;
    get methodDecors(): DecoratorFn[];
    private _paramDecors?;
    get paramDecors(): DecoratorFn[];
    private annotation;
    private params;
    /**
     * class provides.
     */
    get provides(): Token[];
    /**
     * class extends providers.
     */
    get providers(): Provider[];
    /**
     * class resolvers.
     *
     * @type {InstanceOf<ArgumentResolver>[]}
     */
    get resolvers(): TokenOf<ResolveInterceptorLike>[];
    /**
     * runnable defines.
     */
    get runnables(): RunableDefine[];
    get exportProviders(): Provider[];
    private invocationFactory?;
    constructor(type: AbstractType<T>, annotation: Partial<TypeDef<T>>, parent?: ClassRef | undefined);
    setInvocationFactory(factory: Resolve<InvocationFactory>): void;
    getInvocationFactory(injector: Injector): InvocationFactory;
    createInvocation(injector: Injector, options?: InvocationOptions): Invocation<T>;
    protected initAnnotation(annotation: Partial<TypeDef<T>>): TypeDef<T>;
    getAnnotation<TAnn extends TypeDef<T>>(): Readonly<TAnn>;
    assignAnnotation(records: Record<string, any>): void;
    /**
     * Invoke the underlying operation using the given {@code injector}.
     * @param method invoke the method named with.
     * @param injector the injector to use to invoke the method
     * @param instance the method of instance
     * @param args invoke with args
     */
    invoke(method: string | symbol, injector: Injector, instance?: T, args?: any[]): any;
    /**
     * Invoke the underlying operation using the given {@code injector}.
     * @param method invoke the method named with.
     * @param injector the injector to use to invoke the method
     * @param instance the method of instance
     * @param context arguments resolve context.
     */
    invoke(method: string | symbol, injector: Injector, instance?: T, context?: RunContext): any;
    storage(define: DecorDefine): void;
    protected saveMetadata(maps: DecorDefine[], define: DecorDefine, unshift?: boolean): void;
    protected saveMetadata(maps: Map<any, DecorDefine[]>, define: DecorDefine, unshift: boolean, key: any): void;
    getDefines<T = any>(decor: DecoratorFn): DecorDefine<T>[];
    /**
     * resolve args.
     *
     * @param method invoke the method named with.
     * @param injector invocation injector.
     */
    resolveArguments(method: string | symbol, injector: Injector, context?: RunContext): any[];
    hasOwnParameters(method: string | symbol): boolean;
    getParameters(method: string | symbol): ParameterMetadata[] | undefined;
    getReturnning(method: string | symbol): AbstractType | undefined;
    getMethodOptions<T>(method: string | symbol): InvokeOptions | undefined;
    setMethodOptions<T>(method: string | symbol, options: InvokeOptions): void;
    hasDecor(decor: string | DecoratorFn): boolean;
    hasSomeDecor(predicate: (value: DecoratorFn) => boolean): boolean;
    findDecor(predicate: (value: DecoratorFn) => boolean, type?: DecoratorType | null): DecoratorFn | undefined;
    /**
     * has decorator metadata.
     * @param decor
     * @param type
     */
    hasMetadata(decor: string | DecoratorFn): boolean;
    /**
     * has decorator metadata.
     * @param decor
     * @param type
     */
    hasMetadata(decor: string | DecoratorFn, type: DecoratorType | null, propertyKey?: string | symbol): boolean;
    eachPropertyProviders(callback: (value: PropertyMetadata[], key: string | symbol) => void, excludes?: (string | symbol)[]): void;
    /**
     * get class defines.
     * @param filter custom filter.
     */
    getClassdDefines<T = any>(filter?: (d: DecorDefine<T>) => boolean): DecorDefine<T>[];
    /**
     * get method defines.
     * @param filter custom filter.
     */
    getMethodDefines<T = any>(filter?: (d: DecorDefine<T>) => boolean): DecorDefine<T>[];
    /**
     * get method metadata.
     * @param decor decoractor or decoractor name.
     * @param propertyKey custom filter.
     */
    getMethodDefines<T = any>(propertyKey: string | symbol, filter?: (d: DecorDefine<T>) => boolean): DecorDefine<T>[];
    /**
     * get property defines.
     * @param filter custom filter.
     */
    getPropDefines<T = any>(filter?: (d: DecorDefine<T>) => boolean): DecorDefine<T>[];
    /**
     * get property metadata.
     * @param propertyKey property name
     * @param filter custom filter.
     */
    getPropDefines<T = any>(propertyKey: string | symbol, filter?: (d: DecorDefine<T>) => boolean): DecorDefine<T>[];
    getParamDefines<T extends ParameterMetadata>(method: string | symbol): DecorDefine<T>[];
    /**
     * get class metadata.
     * @param decor decoractor or decoractor name.
     */
    getMetadata<T = any>(decor: DecoratorFn): T;
    private _extends;
    get extendTypes(): AbstractType[];
    getParamName(method: string | symbol, idx: number): string;
    getParamNames(method: string | symbol): string[];
    protected getParams(): Map<string | symbol, any[]>;
    protected setParam(params: Map<string | symbol, any[]>): void;
    getPropertyName(descriptor: TypedPropertyDescriptor<any>): string;
    hasMethod(...names: string[]): boolean;
    getMethodName(method: MethodType<T>): string | symbol;
    getDescriptor(name: string | symbol): TypedPropertyDescriptor<any>;
    private descriptos;
    getPropertyDescriptors(): Record<string | symbol, TypedPropertyDescriptor<any>>;
    isExtends(type: AbstractType): boolean;
}
export declare function getClassRef<T = any>(type: AbstractType<T>): ClassRef<T>;
export declare function getClassify<T>(type: AbstractType<T> | ClassRef<T> | T): ClassRef<T>;
