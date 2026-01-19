import { AbstractType } from '../types';
import { Provider } from '../providers';
import { PropertyMetadata, ParameterMetadata } from './meta';
import { InvocationOptions, InvokeOptions } from '../context';
import { Token, TokenOf } from '../tokens';
import { getResolver, ResolveContext, ResolveInterceptorLike } from '../resolver';
import { forIn, hasItem, assign, getParentType } from '../utils/lang';
import { isArray, isFunction, isString } from '../utils/chk';
import { ARGUMENT_NAMES, STRIP_COMMENTS } from '../utils/exps';
import { ArgumentException, Exception } from '../exception';
import { Injector, MethodType, Resolve } from '../injector';
import { Invocation, InvocationFactory } from '../invocation';
import { getDef, proxyTag, TypeDef } from './type.def';
import { getType, isPrimitive } from './type';
import { ctorName, DecoratorFn, DecoratorType, DecorDefine, Decors, RunableDefine } from './define';


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
    get resolvers(): TokenOf<ResolveInterceptorLike>[] {
        return this.annotation.resolvers!;
    }
    /**
     * runnable defines.
     */
    get runnables(): RunableDefine[] {
        return this.annotation.runnables;
    }

    get exportProviders(): Provider[] {
        return this.annotation.exportProviders;
    }

    private invocationFactory?: Resolve<InvocationFactory>;

    constructor(public readonly type: AbstractType<T>, annotation: Partial<TypeDef<T>>, private parent?: ClassRef) {
        this.annotation = this.initAnnotation(annotation);
    }


    setInvocationFactory(factory: Resolve<InvocationFactory>) {
        this.invocationFactory = factory;
    }

    getInvocationFactory(injector: Injector): InvocationFactory {
        if (!injector) {
            throw new ArgumentException()
        }
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
        if (!annotation.exportProviders) {
            annotation.exportProviders = [];
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
    invoke(method: string | symbol, injector: Injector, instance?: T, context?: ResolveContext): any;
    invoke(method: string | symbol, injector: Injector, instance?: T, argsOrContext?: any[] | ResolveContext): any {
        const type = this.type;
        let args: any[] | undefined;
        let context: ResolveContext | undefined;
        if (isArray(argsOrContext)) {
            args = argsOrContext;
        } else if (context instanceof ResolveContext) {
            context = argsOrContext;
        }
        const inst: any = instance ?? injector.resolve({ type: type, propertyKey: ctorName, target: type }, context);

        if (!inst || !isFunction(inst[method])) {
            throw new Exception(`type: ${type} has no method ${method.toString()}.`)
        }
        if (!args) {
            args = this.resolveArguments(method, injector, context);
        }
        const hasPointcut = inst[proxyTag];
        if (hasPointcut) {
            args.push(injector)
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
     * @param injector invocation injector.
     */
    resolveArguments(method: string | symbol, injector: Injector, context?: ResolveContext): any[] {
        const parameters = this.getParameters(method) ?? [];
        const args = getResolver(injector).resolveParams(injector, parameters, context);
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

    getMethodOptions<T>(method: string | symbol): InvokeOptions | undefined {
        return this.annotation.methodMetadatas.get(method)?.invokeEnv ?? this.parent?.getMethodOptions(method)
    }

    setMethodOptions<T>(method: string | symbol, options: InvokeOptions) {

        let meta = this.annotation.methodMetadatas.get(method);
        if (!meta) {
            meta = { invokeEnv: {} as InvokeOptions };
            this.annotation.methodMetadatas.set(method, meta);
        }
        if (!meta.invokeEnv) {
            meta.invokeEnv = {} as InvokeOptions;
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

    protected getParams(): Map<string | symbol, any[]> {
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




const CLASS_REF = Symbol('CLASS_REF');
/**
 * get type class reflective {@link ClassRef}.
 * @param type type.
 */
export function getClassRef<T = any>(type: AbstractType<T>): ClassRef<T> {
    if (!type || isPrimitive(type)) return null!;
    let tyRef = Reflect.getMetadata(CLASS_REF, type) as ClassRef;

    if (tyRef?.type !== type) {
        let prRef = tyRef as ClassRef;
        if (!prRef) {
            const parentType = getParentType(type);
            if (parentType) {
                prRef = getClassRef(parentType)
            }
        }
        tyRef = new ClassRef(type, getDef(type), prRef);
        Reflect.defineMetadata(CLASS_REF, tyRef, type);

    }
    return tyRef;
}

export function getClassify<T>(type: AbstractType<T> | ClassRef<T> | T): ClassRef<T> {
    return type instanceof ClassRef ? type : getClassRef(isFunction(type) ? type : getType(type))
}
