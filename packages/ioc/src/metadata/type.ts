import { ClassType, Annotation, EMPTY, Type } from '../types';
import { ModuleWithProviders, ProviderType } from '../providers';
import {
    PatternMetadata, ProvidersMetadata, ProvidedInMetadata, ModuleMetadata,
    PropertyMetadata, ParameterMetadata, MethodMetadata
} from './meta';
import { InvocationContext, InvokeArguments, InvokeOptions } from '../context';
import { Token } from '../tokens';
import { ArgumentResolver } from '../resolver';
import { getClassAnnotation } from '../utils/util';
import { isFunction, isString } from '../utils/chk';
import { forIn, hasItem } from '../utils/lang';
import { ARGUMENT_NAMES, STRIP_COMMENTS } from '../utils/exps';
import { Execption } from '../execption';
import { MethodType } from '../injector';
import { Handler } from '../handler';
import { DesignContext, RuntimeContext } from '../actions/ctx';




/**
 * decorator funcation.
 */
export interface DecoratorFn extends Function {
    /**
     * decorator name
     */
    toString(): string;
    /**
     * get decorator handle.
     * @param type decorator type.
     */
    getHandle?(type: DecoratorType): Handler<DecorContext>[];
    /**
     * get decorator runtime handle.
     * @param type decorator type.
     */
    getRuntimeHandle?(type: DecoratorScope): Handler<RuntimeContext>[];
    /**
     * get decorator design handle.
     * @param type decorator type.
     */
    getDesignHandle?(type: DecoratorScope): Handler<DesignContext>[];
}


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
}

/**
 * decorator context.
 */
export interface DecorContext<T = any> {
    readonly define: DecorDefine<T>,
    readonly target: any;
    readonly class: Class;
}

/**
 * type def metadata.
 */
export interface TypeDef<T = any> extends ProvidedInMetadata, PatternMetadata, Annotation<T> {

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
 * type class reflective.
 */
export class Class<T = any, TAnn extends TypeDef<T> = TypeDef<T>> {
    className: string;

    readonly defs: DecorDefine[];
    readonly classDefs: DecorDefine[];
    readonly propDefs: DecorDefine<PropertyMetadata>[];
    readonly methodDefs: DecorDefine<MethodMetadata>[];
    readonly paramDefs: DecorDefine<ParameterMetadata>[];

    readonly classDecors: DecoratorFn[];
    readonly propDecors: DecoratorFn[];
    readonly methodDecors: DecoratorFn[];
    readonly paramDecors: DecoratorFn[];

    readonly annotation: TAnn;
    private params!: Map<string, any[]>;
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
     * @type {Map<string, InvokeOptions>}
     */
    private methodOptions: Map<string, InvokeOptions>;
    /**
     * runnable defines.
     */
    readonly runnables: RunableDefine[];

    constructor(public readonly type: ClassType<T>, annotation: TAnn, private parent?: Class) {
        this.annotation = annotation ?? getClassAnnotation(type)! ?? {};
        this.className = this.annotation?.name || type.name;
        this.classDefs = [];
        this.classDecors = [];
        if (parent) {
            this.defs = parent.defs.filter(d => d.decorType !== 'class');
            this.propDefs = parent.propDefs.slice(0);
            this.methodDefs = parent.methodDefs.slice(0);
            this.paramDefs = parent.paramDefs.slice(0);
            this.propDecors = parent.propDecors.slice(0);
            this.methodDecors = parent.methodDecors.slice(0);
            this.paramDecors = parent.paramDecors.slice(0)
        } else {
            this.defs = [];
            this.propDefs = [];
            this.methodDefs = [];
            this.paramDefs = [];
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
        this.methodOptions = new Map();
        this.methodReturns = new Map()
    }

    getAnnotation<T extends TAnn>(): T {
        return this.annotation as T;
    }

    setAnnotation(records: Record<string, any>) {
        if (!records) return;
        for (const key in records) {
            (this.annotation as any)[key] = records[key]
        }
    }

    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method invoke the method named with.
     * @param context the context to use to invoke the operation
     * @param instance the method of instance 
     * @param args invoke with args
     */
    invoke(method: string, context: InvocationContext, instance?: T, args?: any[]) {
        const type = this.type;
        const inst: any = instance ?? context.resolve(type);
        if (!inst || !isFunction(inst[method])) {
            throw new Execption(`type: ${type} has no method ${method}.`)
        }
        if (!args) {
            args = this.resolveArguments(method, context);
        }
        const hasPointcut = inst[method]['_proxy'] == true;
        if (hasPointcut) {
            args.push(context)
        }
        return inst[method](...args);
    }


    /**
     * resolve args.
     * 
     * @param method invoke the method named with.
     * @param context invocation context.
     */
    resolveArguments(method: string, context: InvocationContext): any[] {
        const parameters = this.getParameters(method) ?? EMPTY;
        const args = parameters.map(p => context.resolveArgument(p, this.type));
        return args;
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

    hasMethodOptions(method: string): boolean {
        return this.methodOptions.has(method)
    }
    getMethodOptions(method: string): InvokeOptions | undefined {
        return this.methodOptions.get(method) ?? this.parent?.getMethodOptions(method)
    }
    setMethodOptions(method: string, options: InvokeOptions) {
        if (this.methodOptions.has(method)) {
            const eopt = this.methodOptions.get(method)!;
            if (hasItem(options.providers)) {
                if (!eopt.providers) eopt.providers = [];
                eopt.providers.push(...options.providers!)
            }
            if (hasItem(options.resolvers)) {
                if (!eopt.resolvers) eopt.resolvers = [];
                eopt.resolvers.push(...options.resolvers!)
            }
            if (hasItem(options.values)) {
                if (!eopt.values) eopt.values = [];
                eopt.values.push(...options.values!);
            }
            if (options.arguments) {
                eopt.arguments = eopt.arguments ? { ...eopt.arguments, ...options.arguments } : options.arguments
            }
        } else {
            this.methodOptions.set(method, options)
        }
    }

    private currprop: string | undefined;
    private currpropidx!: number;
    addDefine(define: DecorDefine) {
        switch (define.decorType) {
            case Decors.CLASS:
                if (this.classDecors.indexOf(define.decor) < 0) {
                    this.classDecors.push(define.decor);
                }
                this.classDefs.unshift(define);
                break;
            case Decors.method:
                if (this.methodDecors.indexOf(define.decor) < 0) {
                    this.methodDecors.push(define.decor);
                }
                if (this.currprop === define.propertyKey) {
                    this.methodDefs.splice(this.currpropidx, 0, define)
                } else {
                    this.currpropidx = this.methodDefs.length;
                    this.currprop = define.propertyKey;
                    this.methodDefs.push(define)
                }
                break;
            case Decors.property:
                if (this.propDecors.indexOf(define.decor) < 0) {
                    this.propDecors.push(define.decor);
                }
                if (this.currprop === define.propertyKey) {
                    this.propDefs.splice(this.currpropidx, 0, define)
                } else {
                    this.currpropidx = this.propDefs.length;
                    this.currprop = define.propertyKey;
                    this.propDefs.push(define)
                }
                break;
            case Decors.parameter:
                if (this.paramDecors.indexOf(define.decor) < 0) {
                    this.paramDecors.push(define.decor);
                }
                this.paramDefs.unshift(define);
                break;
        }
        this.defs.unshift(define)
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
    hasMetadata(decor: string | DecoratorFn, type: DecoratorType, propertyKey?: string): boolean;
    hasMetadata(decor: string | DecoratorFn, type?: DecoratorType, propertyKey?: string): boolean {
        type = type || Decors.CLASS;
        let filter: (value: any, index?: number) => any;
        if (isString(decor)) {
            filter = (propertyKey && type !== Decors.CLASS) ? (d: DecorDefine) => d.decor.toString() === decor && d.propertyKey === propertyKey : (d: DecorDefine) => d.decor.toString() === decor;
        } else {
            filter = (propertyKey && type !== Decors.CLASS) ? (d: DecorDefine) => d.decor === decor && d.propertyKey === propertyKey : (d: DecorDefine) => d.decor === decor;
        }
        switch (type) {
            case Decors.CLASS:
                return this.classDefs.some(filter)
            case Decors.method:
                return this.methodDefs.some(filter)
            case Decors.property:
                return this.propDefs.some(filter)
            case Decors.parameter:
                return this.paramDefs.some(filter)
            default:
                return false
        }
    }

    getDecorDefine<T = any>(decor: string | DecoratorFn): DecorDefine<T> | undefined;
    getDecorDefine<T = any>(decor: string | DecoratorFn, type: DecorMemberType): DecorDefine<T> | undefined;
    getDecorDefine<T = any>(decor: string | DecoratorFn, propertyKey: string, type: DecorMemberType): DecorDefine<T> | undefined;
    getDecorDefine(decor: string | DecoratorFn, type?: DecoratorType | string, propertyKey?: string | DecorMemberType): DecorDefine | undefined {
        type = type || Decors.CLASS;
        let filter: (value: any, index?: number) => any;
        if (isString(decor)) {
            filter = (propertyKey && type !== Decors.CLASS) ? (d: DecorDefine) => d.decor.toString() === decor && d.propertyKey === propertyKey : (d: DecorDefine) => d.decor.toString()  === decor;
        } else {
            filter = (propertyKey && type !== Decors.CLASS) ? (d: DecorDefine) => d.decor === decor && d.propertyKey === propertyKey : (d: DecorDefine) => d.decor === decor;
        }
        switch (type) {
            case Decors.CLASS:
                return this.classDefs.find(filter)
            case Decors.method:
                return this.methodDefs.find(filter)
            case Decors.property:
                return this.propDefs.find(filter)
            case Decors.parameter:
                return this.paramDefs.find(filter)
            default:
                return
        }
    }

    /**
     * get all class decorator defines.
     * @param decor
     */
    getDecorDefines(decor: string | DecoratorFn): DecorDefine[];
    /**
     * get all decorator defines.
     * @param decor decorator.
     * @param type  decorator type.
     */
    getDecorDefines<T = any>(decor: string | DecoratorFn, type: DecorMemberType): DecorDefine<T>[];
    getDecorDefines(decor: string | DecoratorFn, type?: DecoratorType): DecorDefine[] {
        decor = getDectorId(decor);
        if (!type) {
            type = Decors.CLASS;
        }
        const filter =  isString(decor)? ((d: DecorDefine) => d.decor.toString() === decor) : ((d: DecorDefine) => d.decor === decor);
        switch (type) {
            case Decors.CLASS:
                return this.classDefs.filter(filter)
            case Decors.method:
                return this.methodDefs.filter(filter)
            case Decors.property:
                return this.propDefs.filter(filter)
            case Decors.parameter:
                return this.paramDefs.filter(filter)
            default:
                return EMPTY;
        }
    }

    /**
     * get class metadata.
     * @param decor decoractor or decoractor name.
     */
    getMetadata<T = any>(decor: string | DecoratorFn): T;
    /**
     * get property or method metadta.
     * @param decor decoractor or decoractor name.
     * @param propertyKey property name.
     * @param type decoractor type.
     */
    getMetadata<T = any>(decor: string | DecoratorFn, propertyKey: string, type: DecorMemberType): T;
    getMetadata<T = any>(decor: string | DecoratorFn, propertyKey?: string, type?: DecorMemberType): T {
        return this.getDecorDefine(decor, propertyKey!, type!)?.metadata
    }

    /**
     * get all metadata of class decorator.
     * @param decor the class decorator.
     */
    getMetadatas<T = any>(decor: string | DecoratorFn): T[];
    /**
     * get all metadata of the decorator.
     * @param decor the decorator.
     * @param type decorator type.
     */
    getMetadatas<T = any>(decor: string | DecoratorFn, type: DecorMemberType): T[];
    getMetadatas<T = any>(decor: string | DecoratorFn, type?: DecorMemberType): T[] {
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

    getMethodName(method: MethodType<T>) {
        return isFunction(method) ? this.getPropertyName(method(this.getPropertyDescriptors() as any)) : method;
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
