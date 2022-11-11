import { ClassType, Annotation, EMPTY, Type } from '../types';
import { Handler } from '../handler';
import { DesignContext, RuntimeContext } from '../actions/ctx';
import { ModuleWithProviders, ProviderType } from '../providers';
import {
    PatternMetadata, ProvidersMetadata, ProvidedInMetadata, ModuleMetadata,
    PropertyMetadata, ParameterMetadata, MethodMetadata
} from './meta';
import { InvocationContext, InvokeArguments } from '../context';
import { Token } from '../tokens';
import { ArgumentResolver, Parameter } from '../resolver';
import { getClassAnnotation } from '../utils/util';
import { isFunction, isString } from '../utils/chk';
import { forIn } from '../utils/lang';
import { ARGUMENT_NAMES, STRIP_COMMENTS } from '../utils/exps';
import { Execption } from '../execption';
import { AsyncLike, Proceed } from '../operation';

/**
 * auto run define.
 */
export interface RunableDefine {
    /**
     * the method as runnable.
     */
    method: string;
    /**
     * run order.
     */
    order?: number;
    /**
     * runnable invoke args.
     */
    args?: InvokeArguments;
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
export type DecoratorScope = 'beforeAnnoation' | DecoratorType
    | 'beforeConstructor' | 'afterConstructor' | 'annoation' | 'afterAnnoation';

export const ctorName = 'constructor';
export namespace Decors {
    export const CLASS = 'class';
    export const property = 'property';
    export const method = 'method';
    export const parameter = 'parameter';
    export const beforeAnnoation = 'beforeAnnoation';
    export const beforeConstructor = 'beforeConstructor';
    export const afterConstructor = 'afterConstructor';
    export const annoation = 'annoation';
    export const afterAnnoation = 'afterAnnoation';
}

export namespace ActionTypes {
    export const propInject = 'propInject';
    export const paramInject = 'paramInject';
    export const annoation = 'annoation';
    export const runnable = 'runnable';
    export const typeProviders = 'typeProviders';
    export const methodProviders = 'methodProviders';
}

/**
 * decorator define.
 */
export interface DecorDefine<T = any> extends ProvidersMetadata {
    /**
     * decorator name.
     */
    name: string;
    /**
     * decorator name with '@'
     */
    decor: string;
    /**
     * get decorator handle.
     * @param type decorator type.
     */
    getHandle(type: DecoratorType): Handler<DecorContext>[];
    /**
     * get decorator runtime handle.
     * @param type decorator type.
     */
    getRuntimeHandle(type: DecoratorScope): Handler<RuntimeContext>[];
    /**
     * get decorator design handle.
     * @param type decorator type.
     */
    getDesignHandle(type: DecoratorScope): Handler<DesignContext>[];
    /**
     * decorator type.
     */
    decorType: DecoratorType;
    /**
     * property key.
     */
    propertyKey: string;
    /**
     * paramter index.
     */
    parameterIndex?: number;
    /**
     * decorator metadata.
     */
    metadata: T;
}

/**
 * decorator context.
 */
export interface DecorContext extends DecorDefine {
    target: any;
    def: TypeDef;
}

/**
 * type def metadata.
 */
export interface TypeDef<T = any> extends ProvidedInMetadata, PatternMetadata, Annotation {
    /**
     * class reflective.
     */
    class: Reflective<T>;
    /**
     * annotation metadata.
     */
    annotation?: any;
}


/**
 * is type def or not.
 * @param target 
 * @returns 
 */
export function isTypeDef(target: any): target is TypeDef {
    return target && isFunction(target.type) && target.type === target.class?.type
}


/**
 * module def metadata.
 */
export interface ModuleDef<T = any> extends TypeDef<T> {
    /**
     * is module or not.
     */
    module: boolean;
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
    bootstrap?: Type[];
    /**
    * module extends providers.
    */
    providers?: ProviderType[];
    /**
     * module annoation metadata.
     */
    annotation?: ModuleMetadata
}

/**
 * type reflective.
 */
export class Reflective<T = any> {
    className: string;

    readonly decors: DecorDefine[];
    readonly classDecors: DecorDefine[];
    readonly propDecors: DecorDefine<PropertyMetadata>[];
    readonly methodDecors: DecorDefine<MethodMetadata>[];
    readonly paramDecors: DecorDefine<ParameterMetadata>[];

    readonly annotation: Annotation;
    private params!: Map<string, any[]>;

    /**
     * is abstract or not.
     */
    abstract = false;
    /**
     * class provides.
     */
    readonly provides: Token[];
    /**
     * class extends providers.
     */
    readonly providers: ProviderType[];
    /**
     * class resolvers.
     *
     * @type {ArgumentResolver[]}
     */
    readonly resolvers: ArgumentResolver[];
    /**
     * property metadata.
     *
     * @type {Map<string, PropertyMetadata[]>}
     */
    private propMetadatas: Map<string, PropertyMetadata[]>;
    /**
     * method params.
     *
     * @type {Map<IParameter[]>}
     */
    private methodParams: Map<string, ParameterMetadata[]>;
    /**
     * method resturn type.
     *
     * @type {Map<IParameter[]>}
     */
    private methodReturns: Map<string, ClassType>;
    /**
     * method providers.
     *
     * @type {Map<ProviderType[]>}
     */
    private methodProviders: Map<string, ProviderType[]>;
    /**
     * method resolvers.
     *
     * @type {Map<ProviderType[]>}
     */
    private methodResolvers: Map<string, ArgumentResolver[]>;
    /**
     * runnable defines.
     */
    readonly runnables: RunableDefine[];

    constructor(public readonly type: ClassType<T>, annotation?: Annotation, private parent?: Reflective) {
        this.annotation = annotation ?? getClassAnnotation(type)!;
        this.className = this.annotation?.name || type.name;
        this.classDecors = [];
        if (parent) {
            this.decors = parent.decors.filter(d => d.decorType !== 'class');
            this.propDecors = parent.propDecors.slice(0);
            this.methodDecors = parent.methodDecors.slice(0);
            this.paramDecors = parent.paramDecors.slice(0)
        } else {
            this.decors = [];
            this.propDecors = [];
            this.methodDecors = [];
            this.paramDecors = []
        }
        this.provides = [];
        this.providers = parent ? parent.providers.slice(0) : [];
        this.resolvers = parent ? parent.resolvers.slice(0) : [];
        this.runnables = parent ? parent.runnables.slice(0) : [];
        this.propMetadatas = new Map();
        this.methodParams = new Map();
        this.methodProviders = new Map();
        this.methodResolvers = new Map();
        this.methodReturns = new Map()
    }

    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method invoke the method named with.
     * @param context the context to use to invoke the operation
     * @param proceed proceeding invoke with hooks
     */
    invoke(method: string, context: InvocationContext, instance?: T, proceed?: Proceed) {
        const type = this.type;
        const inst: any = instance ?? context.resolve(type);
        if (!inst || !isFunction(inst[method])) {
            throw new Execption(`type: ${type} has no method ${method}.`)
        }

        const hasPointcut = inst[method]['_proxy'] == true;
        if (proceed) {
            return proceed(context, (ctx) => {
                const args = this.resolveArguments(method, ctx);
                if (hasPointcut) {
                    args.push(ctx)
                }
                return inst[method](...args);
            })
        } else {
            const args = this.resolveArguments(method, context);
            if (hasPointcut) {
                args.push(context)
            }
            return inst[method](...args);
        }

    }

    /**
     * resolve args.
     * 
     * @param method invoke the method named with.
     * @param context invocation context.
     */
    resolveArguments(method: string, context: InvocationContext): any[] {
        const parameters = this.getParameters(method) ?? EMPTY;
        this.validate(method, context, parameters);
        return parameters.map(p => context.resolveArgument(p, this.type))
    }

    protected validate(method: string, context: InvocationContext, parameters: Parameter[]) {
        const missings = parameters.filter(p => this.isisMissing(context, p));
        if (missings.length) {
            throw context.missingExecption(missings, this.type, method)
        }
    }

    protected isisMissing(context: InvocationContext, parameter: Parameter) {
        return !context.canResolve(parameter)
    }

    hasParameters(method: string): boolean {
        return this.methodParams.has(method)
    }

    getParameters(method: string): ParameterMetadata[] | undefined {
        return this.methodParams.get(method) ?? this.parent?.getParameters(method)
    }

    setParameters(method: string, metadatas: ParameterMetadata[]) {
        this.methodParams.set(method, metadatas)
    }

    hasReturnning(method: string): boolean {
        return this.methodReturns.has(method)
    }

    getReturnning(method: string): ClassType | undefined {
        return this.methodReturns.get(method) ?? this.parent?.getReturnning(method)
    }

    setReturnning(method: string, returnType: ClassType) {
        this.methodReturns.set(method, returnType)
    }

    hasProperyProviders(prop: string): boolean {
        return this.propMetadatas.has(prop)
    }
    getProperyProviders(prop: string): PropertyMetadata[] | undefined {
        return this.propMetadatas.get(prop) ?? this.parent?.getProperyProviders(prop)
    }
    setProperyProviders(prop: string, metadatas: PropertyMetadata[]) {
        if (this.propMetadatas.has(prop)) {
            this.propMetadatas.get(prop)?.push(...metadatas)
        } else {
            this.propMetadatas.set(prop, metadatas)
        }
    }

    eachProperty(callback: (value: PropertyMetadata[], key: string) => void) {
        this.propMetadatas.size && this.propMetadatas.forEach(callback);
        this.parent?.eachProperty(callback)
    }


    hasMethodProviders(method: string): boolean {
        return this.methodProviders.has(method)
    }
    getMethodProviders(method: string): ProviderType[] | undefined {
        return this.methodProviders.get(method) ?? this.parent?.getMethodProviders(method)
    }
    setMethodProviders(method: string, providers: ProviderType[]) {
        if (this.methodProviders.has(method)) {
            this.methodProviders.get(method)?.push(...providers)
        } else {
            this.methodProviders.set(method, providers)
        }
    }

    getMethodResolvers(method: string): ArgumentResolver[] | undefined {
        return this.methodResolvers.get(method) ?? this.parent?.getMethodResolvers(method)
    }
    setMethodResolvers(method: string, metadatas: ArgumentResolver[]) {
        if (this.methodResolvers.has(method)) {
            this.methodResolvers.get(method)?.push(...metadatas)
        } else {
            this.methodResolvers.set(method, metadatas)
        }
    }


    private currprop: string | undefined;
    private currpropidx!: number;
    addDefine(define: DecorDefine) {
        switch (define.decorType) {
            case Decors.CLASS:
                this.classDecors.unshift(define);
                break;
            case Decors.method:
                if (this.currprop === define.propertyKey) {
                    this.methodDecors.splice(this.currpropidx, 0, define)
                } else {
                    this.currpropidx = this.methodDecors.length;
                    this.currprop = define.propertyKey;
                    this.methodDecors.push(define)
                }
                break;
            case Decors.property:
                if (this.currprop === define.propertyKey) {
                    this.propDecors.splice(this.currpropidx, 0, define)
                } else {
                    this.currpropidx = this.propDecors.length;
                    this.currprop = define.propertyKey;
                    this.propDecors.push(define)
                }
                break;
            case Decors.parameter:
                this.paramDecors.unshift(define);
                break;
        }
        this.decors.unshift(define)
    }

    /**
     * has decorator metadata.
     * @param decor
     * @param type
     */
    hasMetadata(decor: string | Function): boolean;
    /**
     * has decorator metadata.
     * @param decor
     * @param type
     */
    hasMetadata(decor: string | Function, type: DecoratorType, propertyKey?: string): boolean;
    hasMetadata(decor: string | Function, type?: DecoratorType, propertyKey?: string): boolean {
        type = type || Decors.CLASS;
        decor = getDectorId(decor);
        const filter = (propertyKey && type !== Decors.CLASS) ? (d: DecorDefine) => d.decor === decor && d.propertyKey === propertyKey : (d: DecorDefine) => d.decor === decor;
        switch (type) {
            case Decors.CLASS:
                return this.classDecors.some(filter)
            case Decors.method:
                return this.methodDecors.some(filter)
            case Decors.property:
                return this.propDecors.some(filter)
            case Decors.parameter:
                return this.paramDecors.some(filter)
            default:
                return false
        }
    }

    getDecorDefine<T = any>(decor: string | Function): DecorDefine<T> | undefined;
    getDecorDefine<T = any>(decor: string | Function, type: DecorMemberType): DecorDefine<T> | undefined;
    getDecorDefine<T = any>(decor: string | Function, propertyKey: string, type: DecorMemberType): DecorDefine<T> | undefined;
    getDecorDefine(decor: string | Function, type?: DecoratorType | string, propertyKey?: string | DecorMemberType): DecorDefine | undefined {
        type = type || Decors.CLASS;
        decor = getDectorId(decor);
        const filter = (propertyKey && type !== Decors.CLASS) ? (d: DecorDefine) => d.decor === decor && d.propertyKey === propertyKey : (d: DecorDefine) => d.decor === decor;
        switch (type) {
            case Decors.CLASS:
                return this.classDecors.find(filter)
            case Decors.method:
                return this.methodDecors.find(filter)
            case Decors.property:
                return this.propDecors.find(filter)
            case Decors.parameter:
                return this.paramDecors.find(filter)
            default:
                return
        }
    }

    /**
     * get all class decorator defines.
     * @param decor
     */
    getDecorDefines(decor: string | Function): DecorDefine[];
    /**
     * get all decorator defines.
     * @param decor decorator.
     * @param type  decorator type.
     */
    getDecorDefines<T = any>(decor: string | Function, type: DecorMemberType): DecorDefine<T>[];
    getDecorDefines(decor: string | Function, type?: DecoratorType): DecorDefine[] {
        decor = getDectorId(decor);
        if (!type) {
            type = Decors.CLASS;
        }
        const filter = (d: DecorDefine) => d.decor === decor;
        switch (type) {
            case Decors.CLASS:
                return this.classDecors.filter(filter)
            case Decors.method:
                return this.methodDecors.filter(filter)
            case Decors.property:
                return this.propDecors.filter(filter)
            case Decors.parameter:
                return this.paramDecors.filter(filter)
            default:
                return EMPTY;
        }
    }

    /**
     * get class metadata.
     * @param decor decoractor or decoractor name.
     */
    getMetadata<T = any>(decor: string | Function): T;
    /**
     * get property or method metadta.
     * @param decor decoractor or decoractor name.
     * @param propertyKey property name.
     * @param type decoractor type.
     */
    getMetadata<T = any>(decor: string | Function, propertyKey: string, type: DecorMemberType): T;
    getMetadata<T = any>(decor: string | Function, propertyKey?: string, type?: DecorMemberType): T {
        return this.getDecorDefine(decor, propertyKey!, type!)?.metadata
    }

    /**
     * get all metadata of class decorator.
     * @param decor the class decorator.
     */
    getMetadatas<T = any>(decor: string | Function): T[];
    /**
     * get all metadata of the decorator.
     * @param decor the decorator.
     * @param type decorator type.
     */
    getMetadatas<T = any>(decor: string | Function, type: DecorMemberType): T[];
    getMetadatas<T = any>(decor: string | Function, type?: DecorMemberType): T[] {
        return this.getDecorDefines(decor, type!).map(d => d.metadata).filter(d => d)
    }

    private _extends!: ClassType[];
    get extendTypes(): ClassType[] {
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

    getParamName(method: string, idx: number): string {
        const names = this.getParamNames(method);
        if (idx >= 0 && names.length > idx) {
            return names[idx]
        }
        return ''
    }

    getParamNames(method: string): string[] {
        const prop = method ?? ctorName;
        return this.getParams().get(prop) || []
    }

    getParams(): Map<string, any[]> {
        if (!this.params) {
            this.params = this.parent ? new Map(this.parent.getParams()) : new Map();
            this.setParam(this.params)
        }
        return this.params
    }

    protected setParam(params: Map<string, any[]>) {
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

    getDescriptor(name: string): TypedPropertyDescriptor<any> {
        return this.getPropertyDescriptors()[name]
    }

    private descriptos!: Record<string, TypedPropertyDescriptor<any>>;
    getPropertyDescriptors(): Record<string, TypedPropertyDescriptor<any>> {
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

    isExtends(type: ClassType): boolean {
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

function getDectorId(decor: string | Function): string {
    return isString(decor) ? decor : decor.toString()
}
