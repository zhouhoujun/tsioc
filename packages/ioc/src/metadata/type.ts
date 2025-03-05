import { Type, ClassType, Annotation } from '../types';
import { ModuleWithProviders, ProviderType } from '../providers';
import {
    PatternMetadata, ProvidersMetadata, ProvidedInMetadata, ModuleMetadata,
    PropertyMetadata, ParameterMetadata
} from './meta';
import { InvocationContext, InvokeArguments } from '../context';
import { Token } from '../tokens';
import { ArgumentResolver } from '../resolver';
import { forIn, hasItem } from '../utils/lang';
import { getClassAnnotation } from '../utils/util';
import { isFunction, isString } from '../utils/chk';
import { ARGUMENT_NAMES, STRIP_COMMENTS } from '../utils/exps';
import { DesignContext, RuntimeContext } from '../actions/ctx';
import { Execption } from '../execption';
import { InstanceOf, MethodType } from '../injector';
import { Handle } from '../handle';




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
    getHandle?(type: DecoratorType): Handle<DecorContext>[];
    /**
     * get decorator runtime handle.
     * @param type decorator type.
     */
    getRuntimeHandle?(type: DecoratorScope): Handle<RuntimeContext>[];
    /**
     * get decorator design handle.
     * @param type decorator type.
     */
    getDesignHandle?(type: DecoratorScope): Handle<DesignContext>[];
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
    args?: InvokeArguments<any>;
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
    imports?: (ClassType | ModuleWithProviders)[];
    /**
     * exports.
     */
    exports?: ClassType[];
    /**
     *  components, directives, pipes ... of current module.
     */
    declarations?: ClassType[];
    /**
     * the module bootstraps.
     */
    bootstrap?: Type[] | null;
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
 * 
 * 类反射
 */
export class Class<T = any> {

    /**
     * class name.
     */
    className: string;

    /**
     * all decorator defines.
     */
    readonly defs: DecorDefine[];

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
    readonly providers: ProviderType[];
    /**
     * class resolvers.
     *
     * @type {InstanceOf<ArgumentResolver>[]}
     */
    readonly resolvers: InstanceOf<ArgumentResolver>[];
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
    private methodReturns: Map<string, Type>;
    /**
     * method providers.
     *
     * @type {Map<string, InvokeArguments>}
     */
    private methodOptions: Map<string, InvokeArguments>;
    /**
     * runnable defines.
     */
    readonly runnables: RunableDefine[];

    constructor(public readonly type: Type<T>, annotation: TypeDef<T>, private parent?: Class) {
        this.annotation = annotation ?? getClassAnnotation(type)! ?? {};
        this.className = this.annotation?.name || type.name;
        // this.classDefs = new Map();
        this.classDecors = [];
        if (parent) {
            this.defs = parent.defs.filter(d => d.decorType !== 'class');
            // this.propDefs = cloneMap(parent.propDefs);
            // this.methodDefs = cloneMap(parent.methodDefs);
            // this.paramDefs = cloneMap(parent.paramDefs);
            this.propDecors = parent.propDecors.slice(0);
            this.methodDecors = parent.methodDecors.slice(0);
            this.paramDecors = parent.paramDecors.slice(0)
        } else {
            this.defs = [];
            // this.propDefs = new Map();
            // this.methodDefs = new Map();
            // this.paramDefs = new Map();
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

    getAnnotation<TAnn extends TypeDef<T>>(): TAnn {
        return this.annotation as TAnn;
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
        const parameters = this.getParameters(method) ?? [];
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

    getReturnning(method: string): Type | undefined {
        return this.methodReturns.get(method) ?? this.parent?.getReturnning(method)
    }

    setReturnning(method: string, returnType: Type) {
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
    getMethodOptions<T>(method: string): InvokeArguments<T> | undefined {
        return this.methodOptions.get(method) ?? this.parent?.getMethodOptions(method)
    }
    setMethodOptions<T>(method: string, options: InvokeArguments<T>) {
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
            if (options.args) {
                eopt.args = eopt.args ? { ...eopt.args, ...options.args } : options.args
            }
        } else {
            this.methodOptions.set(method, options)
        }
    }

    addDefine(define: DecorDefine) {
        let unshift = false;
        switch (define.decorType) {
            case Decors.CLASS:
                if (this.classDecors.indexOf(define.decor) < 0) {
                    this.classDecors.push(define.decor);
                }
                unshift = true;
                break;
            case Decors.method:
                if (this.methodDecors.indexOf(define.decor) < 0) {
                    this.methodDecors.push(define.decor);
                }
                break;
            case Decors.property:
                if (this.propDecors.indexOf(define.decor) < 0) {
                    this.propDecors.push(define.decor);
                }
                break;
            case Decors.parameter:
                if (this.paramDecors.indexOf(define.decor) < 0) {
                    this.paramDecors.push(define.decor);
                }
                unshift = true;
                break;
        }
        unshift ? this.defs.unshift(define) : this.defs.push(define);
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
    hasMetadata(decor: string | DecoratorFn, type: DecoratorType | null, propertyKey?: string): boolean;
    hasMetadata(decor: string | DecoratorFn, type?: DecoratorType | null, propertyKey?: string): boolean {
        type = (type === null) ? null : (type ?? Decors.CLASS);
        return this.defs.some(d => isEqual(d.decor, decor) && (type ? d.decorType == type : true) && (propertyKey ? d.propertyKey == propertyKey : true));
    }

    getDecorDefine<T = any>(decor: string | DecoratorFn | undefined, vaild?: (d: DecorDefine<T>) => boolean): DecorDefine<T> | undefined;
    getDecorDefine<T = any>(decor: string | DecoratorFn | undefined, type: DecoratorType, vaild?: (d: DecorDefine<T>) => boolean): DecorDefine<T> | undefined;
    getDecorDefine<T = any>(decor: string | DecoratorFn | undefined, type: DecorMemberType | null, propertyKey: string, vaild?: (d: DecorDefine<T>) => boolean): DecorDefine<T> | undefined;
    getDecorDefine(decor?: string | DecoratorFn, typeOrVaild?: DecoratorType | null | ((d: DecorDefine<T>) => boolean), propertyKeyOrVaild?: string | ((d: DecorDefine<T>) => boolean), vaild?: (d: DecorDefine<T>) => boolean): DecorDefine | undefined {
        let type: DecoratorType | null | undefined;
        if (isFunction(typeOrVaild)) {
            vaild = typeOrVaild;
            typeOrVaild = undefined;
        }
        if (typeOrVaild !== null) {
            type = typeOrVaild ?? Decors.CLASS;
        }
        let propertyKey: string | undefined;
        if (isFunction(propertyKeyOrVaild)) {
            vaild = propertyKeyOrVaild
        } else {
            propertyKey = propertyKeyOrVaild;
        }
        return this.defs.find(d => (decor ? isEqual(d.decor, decor) : true) && (type ? d.decorType == type : true) && (propertyKey ? d.propertyKey == propertyKey : true) && (vaild ? vaild(d) : true))
    }

    /**
     * get all class decorator defines.
     * @param decor
     */
    getDecorDefines(decor?: string | DecoratorFn, filter?: (d: DecorDefine<T>) => boolean): DecorDefine[];
    /**
     * get all decorator defines.
     * @param decor decorator.
     * @param type  decorator type.
     */
    getDecorDefines<T = any>(decor?: string | DecoratorFn, type?: DecoratorType | null, filter?: (d: DecorDefine<T>) => boolean): DecorDefine<T>[];
    /**
     * get all decorator defines.
     * @param decor decorator.
     * @param type  decorator type.
     */
    getDecorDefines<T = any>(decor: string | DecoratorFn | undefined, type: DecorMemberType | null, propertyKey?: string, filter?: (d: DecorDefine<T>) => boolean): DecorDefine<T>[];
    getDecorDefines(decor?: string | DecoratorFn, typeOrFilter?: DecoratorType | null | ((d: DecorDefine<T>) => boolean), propertyKeyOrFilter?: string | ((d: DecorDefine<T>) => boolean), filter?: (d: DecorDefine<T>) => boolean): DecorDefine[] {
        let type: DecoratorType | null | undefined;
        if (isFunction(typeOrFilter)) {
            filter = typeOrFilter;
            typeOrFilter = undefined;
        }
        if (typeOrFilter !== null) {
            type = typeOrFilter ?? Decors.CLASS;
        }
        let propertyKey: string | undefined;
        if (isFunction(propertyKeyOrFilter)) {
            filter = propertyKeyOrFilter
        } else {
            propertyKey = propertyKeyOrFilter;
        }
        return this.defs.filter(d => (decor ? isEqual(d.decor, decor) : true) && (type ? d.decorType == type : true) && (propertyKey ? d.propertyKey == propertyKey : true) && (filter ? filter(d) : true))

    }

    getClassdDefines<T>(decor?: string | DecoratorFn, filter?: (d: DecorDefine<T>) => boolean) {
        return this.getDecorDefines(decor, Decors.CLASS, filter)
    }

    getMethodDefines<T>(decor?: string | DecoratorFn, propertyKey?: string, filter?: (d: DecorDefine<T>) => boolean) {
        return this.getDecorDefines(decor, Decors.method, propertyKey, filter)
    }


    getPropDefines<T>(decor?: string | DecoratorFn, propertyKey?: string, filter?: (d: DecorDefine<T>) => boolean) {
        return this.getDecorDefines(decor, Decors.property, propertyKey, filter)
    }

    getParamDefines<T>(decor?: string | DecoratorFn, propertyKey?: string, filter?: (d: DecorDefine<T>) => boolean) {
        return this.getDecorDefines(decor, Decors.parameter, propertyKey, filter)
    }
    /**
     * get class metadata.
     * @param decor decoractor or decoractor name.
     */
    getMetadata<T = any>(decor: string | DecoratorFn | undefined, vaild?: (d: DecorDefine<T>) => boolean): T;
    /**
     * get property or method metadta.
     * @param decor decoractor or decoractor name.
     * @param propertyKey property name.
     */
    getMetadata<T = any>(decor: string | DecoratorFn | undefined, type: DecoratorType, vaild?: (d: DecorDefine<T>) => boolean): T;
    /**
     * get property or method metadta.
     * @param decor decoractor or decoractor name.
     * @param propertyKey property name.
     * @param type decoractor type.
     */
    getMetadata<T = any>(decor: string | DecoratorFn | undefined, type: DecorMemberType | null, propertyKey: string | undefined, vaild?: (d: DecorDefine<T>) => boolean): T;
    getMetadata(...args: any[]) {
        return (this.getDecorDefine as Function).apply(this, args)?.metadata;
    }

    getMethodMetadata(decor?: string | DecoratorFn, propertyKey?: string, vaild?: (d: DecorDefine<T>) => boolean) {
        return this.getMetadata(decor, Decors.method, propertyKey, vaild)
    }

    getPropMetadata(decor?: string | DecoratorFn, propertyKey?: string, vaild?: (d: DecorDefine<T>) => boolean) {
        return this.getMetadata(decor, Decors.property, propertyKey, vaild)
    }

    getParamMetadata(decor?: string | DecoratorFn, propertyKey?: string, vaild?: (d: DecorDefine<T>) => boolean) {
        return this.getMetadata(decor, Decors.parameter, propertyKey, vaild)
    }

    /**
     * get all metadata of class decorator.
     * @param decor the class decorator.
     */
    getMetadatas<T = any>(decor?: string | DecoratorFn, filter?: (d: DecorDefine<T>) => boolean): T[];
    /**
     * get all metadata of the decorator.
     * @param decor the decorator.
     * @param type decorator type.
     */
    getMetadatas<T = any>(decor?: string | DecoratorFn, type?: DecoratorType | null, filter?: (d: DecorDefine<T>) => boolean): T[];
    getMetadatas<T = any>(decor: string | DecoratorFn | undefined, type: DecorMemberType | null, propertyKey?: string, filter?: (d: DecorDefine<T>) => boolean): T[];
    getMetadatas(...args: []) {
        return ((this.getDecorDefines as Function).apply(this, args) as DecorDefine[]).map(d => d.metadata)
    }

    private _extends!: Type[];
    get extendTypes(): Type[] {
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

    isExtends(type: Type): boolean {
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

function isEqual(decor1: string | DecoratorFn, decor2: string | DecoratorFn) {
    if (decor1 == decor2) return true;
    return getDectorId(decor1) == getDectorId(decor2);
}
