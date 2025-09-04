import { AbstractType, Type, Annotation } from '../types';
import { ModuleWithProviders, Provider } from '../providers';
import {
    ProvidersMetadata, PropertyMetadata, ParameterMetadata, AnnotationMetadata
} from './meta';
import { InvocationContext, InvocationOptions, InvokeArguments } from '../context';
import { Token } from '../tokens';
import { ResolveInterceptorLike } from '../resolver';
import { forIn, hasItem } from '../utils/lang';
import { getClassAnnotation } from '../utils/util';
import { isFunction, isString } from '../utils/chk';
import { ARGUMENT_NAMES, STRIP_COMMENTS } from '../utils/exps';
import { Exception } from '../exception';
import { Injector, InstanceOf, MethodType, Resolve } from '../injector';
import { HandlerFn } from '../handler';
import { DesignContext, RuntimeContext } from '../lifescope/ctx';
import { Invocation, InvocationFactory } from '../invocation';
import { DecorContext, MetadataKeys } from './refl';




/**
 * decorator funcation.
 */
export interface DecoratorFn extends Function {
    /**
     * decorator name.
     */
    decorator?: string;
    /**
     * decorator name
     */
    toString(): string;
    /**
     * get decorator handlers.
     * @param type decorator type.
     */
    getHandler?(type: DecoratorType): HandlerFn<DecorContext> | undefined;
    /**
     * get decorator runtime handlers.
     * @param type decorator type.
     */
    getRuntimeHandler?(type: DecoratorScope): HandlerFn<RuntimeContext> | undefined;
    /**
     * get decorator design handlers.
     * @param type decorator type.
     */
    getDesignHandler?(type: DecoratorScope): HandlerFn<DesignContext> | undefined;
}


/**
 * auto run define.
 */
export interface RunableDefine {
    /**
     * the method as runnable.
     */
    propertyKey: string;
    /**
     * run order.
     */
    order?: number;
    // /**
    //  * runnable invoke args.
    //  */
    // args?: InvokeArguments<any>;
    /**
     * is auto run when created instance.
     */
    auto?: boolean;
    /**
     * decorator type.
     */
    decorType?: DecoratorType;
}

export type DecorMemberType = 'property' | 'method' | 'parameter';
export type DecoratorType = 'class' | DecorMemberType;


/**
 * decorator scopes.
 *
 * Annoation: annoation actions for design time.
 * AfterAnnoation: after annoation actions for design time.
 */
export type DecoratorScope = DecoratorType
    | 'beforeAnnoation' | 'afterAnnoation';

export const ctorName = 'constructor';
export namespace Decors {
    export const CLASS = 'class';
    export const property = 'property';
    export const method = 'method';
    export const parameter = 'parameter';
    export const beforeAnnoation = 'beforeAnnoation';
    export const afterAnnoation = 'afterAnnoation';
}

export type ActionType = 'inject' | 'annoation' | 'declaration' | 'runnable' | 'providers';

export namespace ActionTypes {
    export const inject = 'inject';
    export const annoation = 'annoation';
    export const declaration = 'declaration';
    export const runnable = 'runnable';
    export const providers = 'providers';
}

/**
 * decorator define.
 */
export interface DecorDefine<T = any> {
    /**
     * decorator Fn
     */
    readonly decor: DecoratorFn;
    /**
     * current decorator type.
     */
    readonly decorType: DecoratorType;
    /**
     * property key.
     */
    propertyKey: string;
    /**
     * paramter index.
     */
    readonly parameterIndex?: number;
    /**
     * decorator metadata.
     */
    readonly metadata: T;

    // /**
    //  * provider services of the class.
    //  *
    //  * @type {KeyValue<Token, Token>}
    //  */
    // providers?: Provider[];
}


/**
 * type def metadata.
 */
export interface TypeDef<T = any> extends Annotation<T>, AnnotationMetadata {

}


/**
 * module def metadata.
 * 
 * 模块元数据
 */
export interface ModuleDef<T = any> extends TypeDef<T> {
    /**
     * is module or not.
     */
    module?: boolean;
    baseURL?: string,
    debug?: boolean,
    /**
     * imports types.
     */
    imports?: (Type | ModuleWithProviders)[];
    /**
     * exports.
     */
    exports?: Type[];
    /**
     *  components, directives, pipes ... of current module.
     */
    declarations?: Type[];
    /**
     * the module bootstraps.
     */
    bootstrap?: AbstractType[] | null;
    /**
    * module extends providers.
    */
    providers?: Provider[];
}

export const proxyTag = Symbol('__proxy');

/**
 * type class reflective.
 * 
 * 类反射
 */
export class Class<T = any> {

    /**
     * class name.
     */
    className: string;

    readonly classDecors: DecoratorFn[];
    readonly propDecors: DecoratorFn[];
    readonly methodDecors: DecoratorFn[];
    readonly paramDecors: DecoratorFn[];

    private annotation: TypeDef<T>;
    private params!: Map<string, any[]>;
    /**
     * class provides.
     */
    readonly provides: Token[];
    /**
     * class extends providers.
     */
    readonly providers: Provider[];
    /**
     * class resolvers.
     *
     * @type {InstanceOf<ArgumentResolver>[]}
     */
    readonly resolvers: ResolveInterceptorLike[];
    /**
     * method providers.
     *
     * @type {Map<string, InvokeArguments>}
     */
    private methodOptions: Map<string | symbol, InvokeArguments>;
    /**
     * runnable defines.
     */
    readonly runnables: RunableDefine[];

    private invocationFactory?: Resolve<InvocationFactory>;

    constructor(public readonly type: AbstractType<T>, annotation: TypeDef<T>, private parent?: Class) {
        this.annotation = annotation ?? getClassAnnotation(type)! ?? {};
        this.className = this.annotation?.name || type.name;
        this.classDecors = [];
        if (parent) {
            this.propDecors = parent.propDecors.slice(0);
            this.methodDecors = parent.methodDecors.slice(0);
            this.paramDecors = parent.paramDecors.slice(0)
        } else {
            this.propDecors = [];
            this.methodDecors = [];
            this.paramDecors = []
        }
        this.provides = [];
        this.providers = parent ? parent.providers.slice(0) : [];
        this.resolvers = parent ? parent.resolvers.slice(0) : [];
        this.runnables = parent ? parent.runnables.slice(0) : [];
        this.methodOptions = new Map();
    }

    setInvocationFactory(factory: Resolve<InvocationFactory>) {
        this.invocationFactory = factory;
    }

    getInvocationFactory(injector: Injector): InvocationFactory {
        return this.invocationFactory?.(injector) ?? injector.get(InvocationFactory);
    }

    createInvocation(injector: Injector, options?: InvocationOptions): Invocation<T> {
        const factory = this.getInvocationFactory(injector);
        return factory.create(this, { ...options, injector, targetType: this.type });
    }

    getAnnotation<TAnn extends TypeDef<T>>(): TAnn {
        return this.annotation as TAnn;
    }

    setAnnotation(records: Record<string, any>) {
        if (!records) return;
        Object.assign(this.annotation, records);
    }

    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method invoke the method named with.
     * @param context the context to use to invoke the operation
     * @param instance the method of instance 
     * @param args invoke with args
     */
    invoke(method: string | symbol, context: InvocationContext, instance?: T, args?: any[]) {
        const type = this.type;
        const inst: any = instance ?? context.resolve(type);
        if (!inst || !isFunction(inst[method])) {
            throw new Exception(`type: ${type} has no method ${method.toString()}.`)
        }
        if (!args) {
            args = this.resolveArguments(method, context);
        }
        const hasPointcut = inst[proxyTag];
        if (hasPointcut) {
            args.push(context)
        }
        return inst[method](...args);
    }

    getDefines<T = any>(decor: DecoratorFn): DecorDefine<T>[] {
        return (Reflect.getMetadata(decor, this.type) ?? []).concat(this.parent?.getDefines(decor) ?? []);
    }

    /**
     * resolve args.
     * 
     * @param method invoke the method named with.
     * @param context invocation context.
     */
    resolveArguments(method: string | symbol, context: InvocationContext): any[] {
        const parameters = this.getParameters(method) ?? [];
        const args = parameters.map(p => context.resolveArgument(p, this.type));
        return args;
    }

    hasOwnParameters(method: string | symbol): boolean {
        return Reflect.hasOwnMetadata(MetadataKeys.METHOD_PARAMS, this.type, method);
    }

    getParameters(method: string | symbol): ParameterMetadata[] | undefined {
        return Reflect.getMetadata(MetadataKeys.METHOD_PARAMS, this.type, method) ?? this.parent?.getParameters(method)
    }

    getReturnning(method: string | symbol): AbstractType | undefined {
        return Reflect.getMetadata(MetadataKeys.METHOD_RETURNS, this.type, method) ?? this.parent?.getReturnning(method)
    }

    eachProperty(callback: (value: DecorDefine<PropertyMetadata>) => void) {
        (Reflect.getMetadata(MetadataKeys.PROPERTY_METADATA, this.type) as DecorDefine<PropertyMetadata>[])?.forEach(callback)
        this.parent?.eachProperty(callback)
    }

    hasMethodOptions(method: string | symbol): boolean {
        return this.methodOptions.has(method)
    }
    getMethodOptions<T>(method: string | symbol): InvokeArguments | undefined {
        return this.methodOptions.get(method) ?? this.parent?.getMethodOptions(method)
    }
    setMethodOptions<T>(method: string | symbol, options: InvokeArguments) {
        if (this.methodOptions.has(method)) {
            const eopt = this.methodOptions.get(method)!;
            if (hasItem(options.providers)) {
                if (!eopt.providers) eopt.providers = [];
                eopt.providers.push(options.providers!)
            }
            if (hasItem(options.resolvers)) {
                if (!eopt.resolvers) eopt.resolvers = [];
                eopt.resolvers.push(...options.resolvers!)
            }
            if (hasItem(options.values)) {
                if (!eopt.values) eopt.values = [];
                eopt.values.push(...options.values!);
            }
            if (options.request) {
                eopt.request = eopt.request ? { ...eopt.request, ...options.request } : options.request
            }
        } else {
            this.methodOptions.set(method, options)
        }
    }

    hasDecor(decor: string | DecoratorFn) {
        if (typeof decor === 'string') {
            return this.hasSomeDecor(d => d.decorator === decor);
        }
        return this.hasSomeDecor(d => d === decor);
    }

    hasSomeDecor(predicate: (value: DecoratorFn) => boolean): boolean {
        return this.classDecors.some(r => predicate(r))
            || this.methodDecors.some(r => predicate(r))
            || this.propDecors.some(r => predicate(r))
            || this.paramDecors.some(r => predicate(r));
    }

    findDecor(predicate: (value: DecoratorFn) => boolean, type?: DecoratorType | null): DecoratorFn | undefined {
        if (type) {
            switch (type) {
                case 'class':
                    return this.classDecors.find(r => predicate(r));
                case 'method':
                    return this.methodDecors.find(r => predicate(r));
                case 'property':
                    return this.propDecors.find(r => predicate(r));
                case 'parameter':
                    return this.paramDecors.find(r => predicate(r));
                default:
                    break;
            }
        }
        return this.classDecors.find(r => predicate(r))
            ?? this.methodDecors.find(r => predicate(r))
            ?? this.propDecors.find(r => predicate(r))
            ?? this.paramDecors.find(r => predicate(r))
    }

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
    hasMetadata(decor: string | DecoratorFn, type?: DecoratorType | null, propertyKey?: string | symbol): boolean {
        type = (type === null) ? null : (type ?? Decors.CLASS);
        const decorator = this.findDecor(isString(decor) ? d => d.decorator === decor : d => d === decor, type);
        if (!decorator) {
            return false;
        }
        const defines = this.getDefines(decorator);
        return propertyKey ? defines.some(d => d.propertyKey == propertyKey) : defines.length > 0;
    }

    /**
     * get class defines.
     * @param filter custom filter.
     */
    getClassdDefines<T = any>(filter?: (d: DecorDefine<T>) => boolean): DecorDefine<T>[] {
        const defines = Reflect.getMetadata(MetadataKeys.CLASS_METADATA, this.type) ?? [];
        return filter ? defines.filter(filter) : defines;
    }

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
    getMethodDefines<T = any>(arg?: any, filter?: (d: DecorDefine<T>) => boolean): DecorDefine<T>[] {
        let propertyKey: string | symbol | undefined;
        if (isFunction(arg)) {
            filter = arg;
        } else {
            propertyKey = arg;
            if (filter) {
                const perFlter = filter;
                filter = (d: DecorDefine<T>) => d.propertyKey === propertyKey && perFlter(d);
            } else {
                filter = (d: DecorDefine<T>) => d.propertyKey === propertyKey;
            }
        }

        let defines = Reflect.getMetadata(MetadataKeys.METHOD_METADATA, this.type)?.filter(filter) ?? [];
        if (this.parent) {
            defines = defines.concat(this.parent.getMethodDefines(filter));
        }
        return defines;

    }

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
    getPropDefines(arg?: any, filter?: (d: DecorDefine<T>) => boolean) {
        let propertyKey: string | symbol | undefined;
        if (isFunction(arg)) {
            filter = arg;
        } else {
            propertyKey = arg;
            if (filter) {
                const perFlter = filter;
                filter = (d: DecorDefine<T>) => d.propertyKey === propertyKey && perFlter(d);
            } else {
                filter = (d: DecorDefine<T>) => d.propertyKey === propertyKey;
            }
        }

        let defines = Reflect.getMetadata(MetadataKeys.PROPERTY_METADATA, this.type)?.filter(filter) ?? [];
        if (this.parent) {
            defines = defines.concat(this.parent.getPropDefines(filter));
        }
        return defines;
    }

    getParamDefines<T extends ParameterMetadata>(method: string | symbol): DecorDefine<T>[] {
        return Reflect.getMetadata(MetadataKeys.METHOD_PARAMS_METADATA, this.type, method) ?? this.parent?.getParamDefines(method) ?? []
    }


    /**
     * get class metadata.
     * @param decor decoractor or decoractor name.
     */
    getMetadata<T = any>(decor: DecoratorFn): T {
        return this.getDefines(decor).find(d => d.decorType === 'class' && d.metadata)?.metadata;
    }


    private _extends!: AbstractType[];
    get extendTypes(): AbstractType[] {
        if (!this._extends) {
            if (this.parent) {
                this._extends = this.parent.extendTypes.slice(0);
                this._extends.unshift(this.type)
            } else {
                this._extends = [this.type]
            }
        }
        return this._extends
    }

    getParamName(method: string | symbol, idx: number): string {
        const names = this.getParamNames(method);
        if (idx >= 0 && names.length > idx) {
            return names[idx]
        }
        return ''
    }

    getParamNames(method: string | symbol): string[] {
        const prop = method ?? ctorName;
        return this.getParams().get(prop) || []
    }

    getParams(): Map<string | symbol, any[]> {
        if (!this.params) {
            this.params = this.parent ? new Map(this.parent.getParams()) : new Map();
            this.setParam(this.params)
        }
        return this.params
    }

    protected setParam(params: Map<string | symbol, any[]>) {
        const classAnnations = this.annotation;
        if (classAnnations && classAnnations.methods) {
            forIn(classAnnations.methods, (p, n) => {
                params.set(n, p.params)
            })
        } else {
            const descriptors = Object.getOwnPropertyDescriptors(this.type.prototype);
            forIn(descriptors, (item, n) => {
                if (item.value) {
                    params.set(n, getParamNames(item.value))
                }
                if (item.set) {
                    params.set(n, getParamNames(item.value))
                }
            })
        }
    }

    getPropertyName(descriptor: TypedPropertyDescriptor<any>) {
        if (!descriptor) {
            return ''
        }
        let pty = (descriptor as DefineDescriptor).__name;
        if (!pty) {
            const decs = this.getPropertyDescriptors();
            forIn(decs, (dec, n) => {
                if (dec === descriptor) {
                    pty = n;
                    return false
                }
            })
        }
        return pty
    }

    hasMethod(...names: string[]): boolean {
        const descs = this.getPropertyDescriptors();
        return !names.some(name => !isFunction(descs[name]?.value))
    }

    getMethodName(method: MethodType<T>) {
        return isFunction(method) ? this.getPropertyName(method(this.getPropertyDescriptors() as any)) : method;
    }

    getDescriptor(name: string | symbol): TypedPropertyDescriptor<any> {
        return this.getPropertyDescriptors()[name]
    }

    private descriptos!: Record<string | symbol, TypedPropertyDescriptor<any>>;
    getPropertyDescriptors(): Record<string | symbol, TypedPropertyDescriptor<any>> {
        if (!this.descriptos) {
            const descriptos = this.parent ? { ...this.parent.getPropertyDescriptors() } : {};
            forIn(Object.getOwnPropertyDescriptors(this.type.prototype), (d, n) => {
                (d as DefineDescriptor).__name = n;
                descriptos[n] = d
            });
            this.descriptos = descriptos
        }
        return this.descriptos
    }

    isExtends(type: AbstractType): boolean {
        return this.extendTypes.indexOf(type) >= 0
    }
}

interface DefineDescriptor<T = any> extends TypedPropertyDescriptor<T> {
    __name: string;
}

function getParamNames(func: Function) {
    if (!isFunction(func)) {
        return []
    }
    const fnStr = func.toString().replace(STRIP_COMMENTS, '');
    const result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    return result ?? []
}

// function getDectorId(decor: string | Function): string {
//     return isString(decor) ? decor : decor.toString()
// }

// function isEqual(decor1: string | DecoratorFn, decor2: string | DecoratorFn) {
//     if (decor1 == decor2) return true;
//     return getDectorId(decor1) == getDectorId(decor2);
// }
