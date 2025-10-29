import { AbstractType, Type, Annotation, TypeOf } from '../types';
import { ModuleWithProviders, Provider } from '../providers';
import { PropertyMetadata, ParameterMetadata, AnnotationMetadata } from './meta';
import { InvocationContext, InvocationOptions, InvokeArguments } from '../context';
import { Token } from '../tokens';
import { ResolveInterceptorLike } from '../resolver';
import { forIn, hasItem, assign } from '../utils/lang';
import { isFunction, isString } from '../utils/chk';
import { ARGUMENT_NAMES, STRIP_COMMENTS } from '../utils/exps';
import { Exception } from '../exception';
import { Injector, MethodType, Resolve } from '../injector';
import { Context, HandlerFn } from '../handler';
import { Invocation, InvocationFactory } from '../invocation';


/**
 * type class reflective.
 * 
 * 类反射
 */
export class ClassRef<T = any> {

    /**
     * class name.
     */
    get className(): string {
        return this.annotation.name;
    }

    private _classDecors?: DecoratorFn[];
    get classDecors(): DecoratorFn[] {
        if (!this._classDecors) {
            this._classDecors = [];
        }
        return this._classDecors;
    }

    private _propDecors?: DecoratorFn[];
    get propDecors(): DecoratorFn[] {
        if (!this._propDecors) {
            this._propDecors = this.parent ? [...this.parent.propDecors] : [];
        }
        return this._propDecors;
    }

    private _methodDecors?: DecoratorFn[];
    get methodDecors(): DecoratorFn[] {
        if (!this._methodDecors) {
            this._methodDecors = this.parent ? [...this.parent.methodDecors] : [];
        }
        return this._methodDecors;
    }

    private _paramDecors?: DecoratorFn[];
    get paramDecors(): DecoratorFn[] {
        if (!this._paramDecors) {
            this._paramDecors = this.parent ? [...this.parent.paramDecors] : [];
        }
        return this._paramDecors;
    }

    private annotation: TypeDef<T>;

    private params!: Map<string, any[]>;
    /**
     * class provides.
     */
    get provides(): Token[] {
        return this.annotation.provides!;
    }
    /**
     * class extends providers.
     */
    get providers(): Provider[] {
        return this.annotation.providers!;
    }
    /**
     * class resolvers.
     *
     * @type {InstanceOf<ArgumentResolver>[]}
     */
    get resolvers(): TypeOf<ResolveInterceptorLike>[] {
        return this.annotation.resolvers!;
    }
    /**
     * runnable defines.
     */
    get runnables(): RunableDefine[] {
        return this.annotation.runnables!;
    }

    private invocationFactory?: Resolve<InvocationFactory>;

    constructor(public readonly type: AbstractType<T>, annotation: Partial<TypeDef<T>>, private parent?: ClassRef) {
        this.annotation = this.initAnnotation(annotation);
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

    protected initAnnotation(annotation: Partial<TypeDef<T>>): TypeDef<T> {
        if (!annotation.name) {
            annotation.name = this.type.name;
        }
        if (!annotation.decDefs) {
            annotation.decDefs = new Map();
        }
        if (!annotation.classDefs) {
            annotation.classDefs = [];
        }
        if (!annotation.propDefs) {
            annotation.propDefs = [];
        }
        if (!annotation.methodDefs) {
            annotation.methodDefs = [];
        }
        if (!annotation.paramDefs) {
            annotation.paramDefs = new Map();
        }
        if (!annotation.propMetadatas) {
            annotation.propMetadatas = new Map();
        }
        if (!annotation.methodMetadatas) {
            annotation.methodMetadatas = new Map();
        }

        if (!annotation.provides) {
            annotation.provides = [];
        }

        annotation.providers = this.parent?.providers ? [...this.parent.providers, ...(annotation.providers ?? [])] : annotation.providers ?? [];
        annotation.resolvers = this.parent?.resolvers ? [...this.parent.resolvers, ...(annotation.resolvers ?? [])] : annotation.resolvers ?? [];
        annotation.runnables = this.parent?.runnables ? [...this.parent.runnables, ...(annotation.runnables ?? [])] : annotation.runnables ?? [];
        return annotation as TypeDef<T>;
    }

    getAnnotation<TAnn extends TypeDef<T>>(): Readonly<TAnn> {
        return this.annotation as TAnn;
    }



    assignAnnotation(records: Record<string, any>) {
        if (!records) return;
        assign(this.annotation, records, 'classDefs', 'resolvers', 'runnables', 'providers', 'propDefs', 'methodDefs', 'paramDefs', 'propMetadatas', 'methodMetadatas');

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

    storage(define: DecorDefine) {

        const annotation = this.getAnnotation();
        switch (define.decorType) {
            case 'class':
                if (!this.classDecors.includes(define.decor)) {
                    this.classDecors.push(define.decor);
                }
                this.saveMetadata(annotation.classDefs, define, true);
                this.saveMetadata(annotation.decDefs, define, true, define.decor);
                break;

            case 'property':
                if (!this.propDecors.includes(define.decor)) {
                    this.propDecors.push(define.decor);
                }
                this.saveMetadata(annotation.propDefs, define);
                this.saveMetadata(annotation.decDefs, define, false, define.decor);
                break;

            case 'method':
                if (!this.methodDecors.includes(define.decor)) {
                    this.methodDecors.push(define.decor);
                }
                this.saveMetadata(annotation.methodDefs, define);
                this.saveMetadata(annotation.decDefs, define, false, define.decor);
                break;

            case 'parameter':
                if (!this.paramDecors.includes(define.decor)) {
                    this.paramDecors.push(define.decor);
                }
                this.saveMetadata(annotation.paramDefs, define, true, define.propertyKey);
                this.saveMetadata(annotation.decDefs, define, true, define.decor);
                break;
        }

    }

    protected saveMetadata(maps: DecorDefine[], define: DecorDefine, unshift?: boolean): void
    protected saveMetadata(maps: Map<any, DecorDefine[]>, define: DecorDefine, unshift: boolean, key: any): void
    protected saveMetadata(maps: DecorDefine[] | Map<any, DecorDefine[]>, define: DecorDefine, unshift?: boolean, key?: any) {
        const defines = key ? (maps as Map<any, DecorDefine[]>).get(key) : maps as DecorDefine[];
        if (defines) {
            unshift ? defines.unshift(define) : defines.push(define);
        } else if (key) {
            (maps as Map<any, DecorDefine[]>).set(key, [define])
        }
    }

    getDefines<T = any>(decor: DecoratorFn): DecorDefine<T>[] {
        return (this.annotation.decDefs?.get(decor) ?? []).concat(this.parent?.getDefines(decor) ?? []);
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
        return !!this.annotation.methodMetadatas?.get(method)?.params
    }

    getParameters(method: string | symbol): ParameterMetadata[] | undefined {
        return this.annotation.methodMetadatas?.get(method)?.params ?? this.parent?.getParameters(method)
    }

    getReturnning(method: string | symbol): AbstractType | undefined {
        return this.annotation.methodMetadatas?.get(method)?.returnType ?? this.parent?.getReturnning(method)
    }

    getMethodOptions<T>(method: string | symbol): InvokeArguments | undefined {
        return this.annotation.methodMetadatas.get(method)?.invokeEnv ?? this.parent?.getMethodOptions(method)
    }

    setMethodOptions<T>(method: string | symbol, options: InvokeArguments) {

        let meta = this.annotation.methodMetadatas.get(method);
        if (!meta) {
            meta = { invokeEnv: {} as InvokeArguments };
            this.annotation.methodMetadatas.set(method, meta);
        }
        if (!meta.invokeEnv) {
            meta.invokeEnv = {} as InvokeArguments;
        }
        const env = meta.invokeEnv;
        if (hasItem(options.providers)) {
            if (!env.providers) env.providers = [];
            env.providers.push(options.providers!)
        }
        if (hasItem(options.resolvers)) {
            if (!env.resolvers) env.resolvers = [];
            env.resolvers.push(...options.resolvers!)
        }
        if (hasItem(options.values)) {
            if (!env.values) env.values = [];
            env.values.push(...options.values!);
        }
        if (options.request) {
            env.request = env.request ? { ...env.request, ...options.request } : options.request
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

    eachPropertyProviders(callback: (value: PropertyMetadata[], key: string | symbol) => void, excludes?: (string | symbol)[]) {
        const upexc = excludes ? excludes.slice(0) : [];
        this.annotation.propMetadatas?.forEach((p, key) => {
            if (!excludes?.includes(key)) {
                callback(p, key);
            }
            if (!this.parent && !upexc.includes(key)) {
                upexc.push(key);
            }
        });

        this.parent?.eachPropertyProviders(callback, upexc);
    }


    /**
     * get class defines.
     * @param filter custom filter.
     */
    getClassdDefines<T = any>(filter?: (d: DecorDefine<T>) => boolean): DecorDefine<T>[] {
        const defines = this.annotation.classDefs;
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
        } else if (arg) {
            propertyKey = arg;
        }

        let defines: DecorDefine<T>[] = this.annotation.methodDefs;
        if (defines.length) {
            if (filter && propertyKey) {
                defines = defines.filter(d => d.propertyKey === propertyKey && filter(d));
            } else if (propertyKey) {
                defines = defines.filter(d => d.propertyKey === propertyKey);
            } else if (filter) {
                defines = defines.filter(filter);
            }
        }
        if (this.parent) {
            defines = defines.concat(this.parent.getMethodDefines(propertyKey!, filter && !propertyKey && defines.length ? (p => !defines.some(d => d.propertyKey === p.propertyKey) && filter(p)) : filter));
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
        } else if (arg) {
            propertyKey = arg;
        }

        let defines: DecorDefine<T>[] = this.annotation.propDefs;
        if (defines.length) {
            if (filter && propertyKey) {
                defines = defines.filter(d => d.propertyKey === propertyKey && filter(d));
            } else if (propertyKey) {
                defines = defines.filter(d => d.propertyKey === propertyKey);
            } else if (filter) {
                defines = defines.filter(filter);
            }
        }
        if (this.parent) {
            defines = defines.concat(this.parent.getPropDefines(propertyKey!, filter && !propertyKey && defines.length ? (p => !defines.some(d => d.propertyKey === p.propertyKey) && filter(p)) : filter));
        }
        return defines;
    }

    getParamDefines<T extends ParameterMetadata>(method: string | symbol): DecorDefine<T>[] {
        return this.annotation.paramDefs.get(method) ?? this.parent?.getParamDefines(method) ?? []
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


/**
 * decorator context.
 */
export interface DecorContext<T = any> {
    readonly define: DecorDefine<T>,
    readonly target: any;
    readonly classRef: ClassRef;
    readonly options: DecoratorOption<any>
}




/**
 * decorator def hanldes.
 */
export interface DecorDefHandles<T = any> {
    /**
     * class decorator def handle.
     */
    class?: HandlerFn<DecorContext<T>, void, Context> | HandlerFn<DecorContext<T>, void, Context>[];
    /**
     * method decorator def handle.
     */
    method?: HandlerFn<DecorContext<T>, void, Context> | HandlerFn<DecorContext<T>, void, Context>[];
    /**
     * property decorator def handle.
     */
    property?: HandlerFn<DecorContext<T>, void, Context> | HandlerFn<DecorContext<T>, void, Context>[];
    /**
     * parameter decorator def handle.
     */
    parameter?: HandlerFn<DecorContext<T>, void, Context> | HandlerFn<DecorContext<T>, void, Context>[];
}

/**
 * design action scope hanldes.
 * raise handles order by beforeAnnoation -> class -> property -> method -> afterAnnoation
 */
export interface DesignScopeHandles<T> {
    /**
     * decorator BeforeAnnoation action handles.
     * raise handles order by beforeAnnoation -> property -> method -> afterAnnoation
     */
    beforeAnnoation?: HandlerFn<T, void, Context> | HandlerFn<T, void, Context>[];

    /**
     * decorator Property action handles.
     * raise handles order by beforeAnnoation -> property -> method -> afterAnnoation
     */
    property?: HandlerFn<T, void, Context> | HandlerFn<T, void, Context>[];

    /**
     * decorator Method action handles.
     * raise handles order by beforeAnnoation -> class -> property -> method -> afterAnnoation
     */
    method?: HandlerFn<T, void, Context> | HandlerFn<T, void, Context>[];

    /**
     * decorator AfterAnnoation action handles.
     * raise handles order by beforeAnnoation -> property -> method -> afterAnnoation
     */
    afterAnnoation?: HandlerFn<T, void, Context> | HandlerFn<T, void, Context>[];
}

/**
 * runtime action scope hanldes.
 * raise handles order by property -> method -> class
 */
export interface RuntimeScopeHandles<T> {
    /**
     * decorator Property action handles.
     * raise handles order by property -> method -> class
     */
    property?: HandlerFn<T, void, Context> | HandlerFn<T, void, Context>[];

    /**
     * decorator Method action handles.
     * raise handles order by property -> method -> class
     */
    method?: HandlerFn<T, void, Context> | HandlerFn<T, void, Context>[];

    /**
     * decorator Class action handles.
     * raise handles order by  property -> method -> class
     */
    class?: HandlerFn<T, void, Context> | HandlerFn<T, void, Context>[];

}


/**
 * decorator register options.
 */
export interface DecorRegisterOption<T = any> {
    /**
     * decorator basic action type.
     */
    actionType?: ActionType;
    /**
     * set def handles.
     * raise when init decorator metadate of Type.
     */
    def?: DecorDefHandles<T>;
    /**
     * set design action scope handles.
     * raise when Type inject.
     * raise design handles order by beforeAnnoation -> class -> property -> method -> afterAnnoation
     */
    design?: DesignScopeHandles<ClassRef>
    /**
     * set runtime action scope handles.
     * raise when resolve instance of Type.
     * raise runtime handles order by beforeConstructor -> afterConstructor -> property -> method -> class
     */
    runtime?: RuntimeScopeHandles<ClassRef>;
}

/**
 * metadata factory. parse args to metadata.
 */
export interface MetadataFactory<T = any> {
    /**
     * is metadata or not.
     */
    isMatadata?(arg: any): boolean;
    /**
     * parse args as metadata props.
     * @param args
     */
    props?(...args: any[]): Partial<T>;
    /**
     * append metadata.
     * @param metadata
     */
    appendProps?(metadata: T): void;
    /**
     * init decor context.
     */
    init?: (ctx: DecorContext<T>) => void;
    /**
     * after init decor context.
     */
    afterInit?: (ctx: DecorContext<T>) => void;
    /**
     * set invocation factory.
     */
    factory?: Resolve<InvocationFactory>;
}

/**
 * decorator option.
 */
export interface DecoratorOption<T> extends MetadataFactory<T>, DecorRegisterOption<T> { }


/**
 * create decorator define.
 * @param name 
 * @param decor 
 * @param metadata 
 * @param decorType 
 * @param options 
 * @param propertyKey 
 * @param parameterIndex 
 * @returns decorator define
 */
export function toDefine<T>(decor: DecoratorFn, metadata: T, decorType: DecoratorType, options: DecoratorOption<any>, propertyKey?: string, parameterIndex?: number): DecorDefine<T> {

    return {
        decor,
        propertyKey: propertyKey!,
        parameterIndex,
        decorType,
        metadata,
        actionType: options.actionType
    }
}


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
    getHandler?(type: DecoratorType): HandlerFn<ClassRef> | undefined;
    /**
     * get decorator runtime handlers.
     * @param type decorator type.
     */
    getRuntimeHandler?(type: DecoratorScope): HandlerFn<ClassRef> | undefined;
    /**
     * get decorator design handlers.
     * @param type decorator type.
     */
    getDesignHandler?(type: DecoratorScope): HandlerFn<ClassRef> | undefined;
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


export enum ActionType {
    inject = 0b0001,
    annoation = 0b0010,
    declaration = 0b0100,
    runnable = 0b1000,
    providers = 0b10000,
    module = 0b100000,
    component = 0b1000000,
    directive = 0b10000000,

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
     * action type.
     */
    actionType?: ActionType;
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
 * type def metadata.
 */
export interface TypeDef<T = any> extends Annotation<T>, AnnotationMetadata {

    /**
     * the type provide tokens
     */
    provides?: Token[];
    /**
     * the providers for the type.
     */
    providers?: Provider[];
    /**
     * resolvers for the type
     */
    resolvers?: TypeOf<ResolveInterceptorLike>[];
    /**
     * runnable defines.
     */
    runnables?: RunableDefine[];

    propMetadatas: Map<string | symbol, PropertyMetadata[]>;
    methodMetadatas: Map<string | symbol, {
        invokeEnv?: InvokeArguments;
        params?: ParameterMetadata[];
        returnType?: AbstractType;
    }>;

    decDefs: Map<DecoratorFn, DecorDefine[]>;
    classDefs: DecorDefine[];
    propDefs: DecorDefine[];
    methodDefs: DecorDefine[];
    paramDefs: Map<string | symbol, DecorDefine[]>;
}


export const proxyTag = Symbol('__proxy');

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
    providers: Provider[];
}
