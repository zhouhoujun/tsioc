import { AbstractType, Type } from '../types';
import { Destroyable, DestroyCallback, OnDestroy } from '../destroy';
import { remove, getTypeName, getTypeChain } from '../utils/lang';
import { isPrimitiveType, isArray, isDefined, isFunction, isString, isNil, isAbstractType, getType } from '../utils/chk';
import { OperationArgumentResolver, Parameter, composeResolver, composeResolvers } from '../resolver';
import { InvocationContext, TargetInvokeArguments, INVOCATION_CONTEXT_IMPL, InvokeArguments, InvocationRequest } from '../context';
import { isPlainObject, isTypeObject } from '../utils/obj';
import { InjectFlags, Token } from '../tokens';
import { createInjector, Injector, isInjector } from '../injector';
import { Exception } from '../exception';
import { Class } from '../metadata/class';
import { getDef } from '../metadata/refl';
import { Provider } from '../providers';
import { Invocation } from '../invocation';



/**
 * The context for the {@link Invocation invocation of an operation}.
 */
export class DefaultInvocationContext extends InvocationContext implements Destroyable, OnDestroy {

    protected _refs: InvocationContext[] | null;
    private _injected = false;

    private _dsryCbs = new Set<DestroyCallback>();
    private _destroyed = false;

    /**
     * invocation static injector. 
     */
    readonly injector: Injector;
    /**
     * invocation target type.
     */
    readonly targetType: AbstractType | undefined;

    /**
     * named of invocation method.
     */
    readonly propertyKey: string | symbol | undefined;

    readonly isResolve: boolean;

    request: InvocationRequest | null | undefined;
    private cache = new Map<Token, Map<InjectFlags, any>>();
    private rcache = new Map<Token, Map<InjectFlags, any>>();
    
    private pcache = new WeakMap<Parameter, any>();
    /**
     * get the invocation arguments resolver.
     */

    constructor(
        injector: Injector,
        private options: TargetInvokeArguments = {},
        private injectorScope: AbstractType | 'static' = 'static'
    ) {
        super();
        this._refs = [];
        this.isResolve = options.isResolve == true;
        this.injector = this.createInjector(injector, options.providers);
        if (options.parent && injector !== options.parent.injector) {
            const parent = options.parent;
            this.addRef(parent);
            parent.onDestroy(() => {
                !this.destroyed && this.removeRef(parent);
            });
        }

        if (options.values) {
            options.values.forEach(par => {
                this.injector.setValue(par[0], par[1]);
            })
        }

        this.initRequest(options);

        getTypeChain(getType(this)).forEach(c => {
            this.setValue(c, this);
        });

        this.targetType = options.targetType;
        this.propertyKey = options.propertyKey;
        injector.onDestroy(this);
    }

    protected initRequest(options: TargetInvokeArguments) {
        this.request = options.request || options.parent?.request;
    }

    attach(option: InvocationContext | InvokeArguments): void {

        if (option instanceof InvocationContext) {
            this.addRef(option);
            this.onDestroy(() => this.removeRef(option));
        } else {
            if (option.values) {
                option.values.forEach(par => {
                    this.injector.setValue(par[0], par[1]);
                })
            }
            if (option.providers) {
                this.injector.inject(option.providers);
            }
            if (option.resolvers) {
                const resls = option.resolvers?.map(r => isFunction(r) ? (r as Function)(this.injector) : r);
                if (resls?.length) {
                    this.getResolvers().push(composeResolvers(resls));
                }
            }
        }
    }

    /**
     * get context arguments resolvers.
     * @returns 
     */
    protected getArgumentResolver(): OperationArgumentResolver[] {
        return [];
    }

    private _resolvers?: OperationArgumentResolver[] | null;
    /**
     * the invocation arguments resolver.
     */
    protected getResolvers(): OperationArgumentResolver[] {
        if (!this._resolvers) {
            const resolvers: OperationArgumentResolver[] = [];
            const args = this.getArgumentResolver();
            if (args?.length) {
                resolvers.push(composeResolvers(args));
            }
            const resls = this.options.resolvers?.map(r => isFunction(r) ? (r as Function)(this.injector) : r);
            if (resls?.length) {
                resolvers.push(composeResolvers(resls));
            }
            const defaultResls = this.getDefaultResolvers();
            if (defaultResls?.length) {
                resolvers.push(composeResolvers(defaultResls));
            }
            this._resolvers = resolvers;
        }
        return this._resolvers;
    }

    protected getDefaultResolvers(): OperationArgumentResolver[] {
        return BASE_RESOLVERS
    }

    protected createInjector(injector: Injector, providers?: Provider[]) {
        return createInjector(providers, injector, this.injectorScope)
    }

    /**
     * add reference contexts.
     * @param contexts the list instance of {@link Injector} or {@link InvocationContext}.
     */
    addRef(...contexts: InvocationContext[]): void {
        this.assertNotDestroyed();
        contexts.forEach(j => {
            if (!this.hasRef(j)) {
                this._refs!.unshift(j)
            }
        })
        this.clearCache();
    }

    /**
     * remove reference resolver.
     * @param contexts instance of {@link InvocationContext}.
     */
    removeRef(...contexts: InvocationContext[]): void {
        this.assertNotDestroyed();
        contexts.forEach(context => remove(this._refs, context));
        this.clearCache();
    }

    hasRef(ctx: InvocationContext): boolean {
        this.assertNotDestroyed();
        return ctx === this && this._refs!.indexOf(ctx) >= 0;
    }

    get used(): boolean {
        return this._injected
    }

    /**
     * has token in the context or not.
     * 
     * 上下文中是否有注入该标记指令
     * @param token the token to check.
     * @param flags inject flags, type of {@link InjectFlags}.
     * @returns boolean.
     */
    has(token: Token, flags?: InjectFlags): boolean {
        this.assertNotDestroyed();
        return (flags != InjectFlags.HostOnly && this.injector.has(token, flags))
            || this._refs!.some(i => i.has(token, flags))
    }

    /**
     * get token value.
     * 
     * 获取上下文中标记指令的实例值
     * @param token the token to get value.
     * @param flags inject flags, type of {@link InjectFlags}.
     * @returns the instance of token.
     */
    get<T>(token: Token<T>, flags?: InjectFlags): T {
        this.assertNotDestroyed();
        return (flags != InjectFlags.HostOnly ? this.injector.get(token, null, flags, this) : null)
                ?? this.getFormRef(token, flags) ?? null as T
    }

    protected getFormRef<T>(token: Token<T>, flags?: InjectFlags): T | undefined {
        let val: T | undefined;
        this._refs!.some(r => {
            val = r.get(token, flags);
            return isDefined(val)
        });

        return val
    }

    /**
     * set value.
     * 
     * 设置上下文中标记指令的实例值
     * @param token token
     * @param value value for the token.
     */
    setValue<T>(token: Token<T>, value: T) {
        this.assertNotDestroyed();
        this.injector.setValue(token, value);
        return this
    }

    /**
     * get resolver in the property or parameter metadata. configured in class design.
     * @param meta property or parameter metadata type of {@link Parameter}.
     * @returns undefined or resolver of type {@link OperationArgumentResolver}.
     */
    getMetaReolver<T>(meta: Parameter<T>): OperationArgumentResolver | undefined {
        if (isFunction(meta.resolver)) {
            return this.injector.get<OperationArgumentResolver>(meta.resolver)
        }
        return meta.resolver
    }

    /**
     * resolve token.
     * 
     * 解析上下文中标记指令的实例值
     * @param token 
     * @returns 
     */
    resolve<T>(token: Token<T>, flags?: InjectFlags): T {
        this.assertNotDestroyed();
        let cache = this.rcache.get(token);
        let data = cache?.get(flags || InjectFlags.Default);
        if (data === undefined) {
            data = this.doResolveArgument({ provider: token, flags }) as T;
            if (!cache) {
                cache = new Map();
                this.cache.set(token, cache);
            }
            cache.set(flags || InjectFlags.Default, data);

        }
        return data;
    }

    /**
     * resolve the parameter value.
     * 
     * 解析调用参数
     * @param meta property or parameter metadata type of {@link Parameter}.
     * @returns the parameter value in this context.
     */
    resolveArgument<T>(meta: Parameter<T>, target?: AbstractType, failed?: (target: AbstractType, propertyKey: string) => void): T | null {
        this.assertNotDestroyed();
        if(!this.pcache.has(meta)){
            this.pcache.set(meta, this.doResolveArgument(meta, target, failed)); 
        }
        return this.pcache.get(meta)
    }

    /**
     * resolve the parameter value.
     * 
     * 解析调用参数
     * @param meta property or parameter metadata type of {@link Parameter}.
     * @returns the parameter value in this context.
     */
    protected doResolveArgument<T>(meta: Parameter<T>, target?: AbstractType, failed?: (target: AbstractType, propertyKey: string) => void): T | null {
        let result: T | null | undefined;
        const metaRvr = this.getMetaReolver(meta);
        if (metaRvr?.canResolve(meta, this)) {
            result = metaRvr.resolve(meta, this, target);
            if (!isNil(result)) {
                return result;
            }
        }

        let canResolved = meta.nullable || (meta.flags && (meta.flags & InjectFlags.Optional));
        if (this.getResolvers().some(r => {
            if (r.canResolve(meta, this)) {
                result = r.resolve(meta, this, target);
                if (!isNil(result)) {
                    canResolved = true;
                    return true;
                }
            }
            return false
        })) {
            return result!;
        }

        if (!canResolved) {
            if (failed) {
                failed(target!, meta.propertyKey!)
            } else {
                this.missingException([meta], target!, meta.propertyKey!);
            }
        }

        return null;
    }

    protected missingException(missings: Parameter<any>[], type: AbstractType<any>, method: string): Exception {
        throw new MissingParameterException(missings, type, method)
    }

    get destroyed() {
        return this._destroyed
    }

    protected assertNotDestroyed(): void {
        if (this.destroyed) {
            throw new Exception('Context has already been destroyed.')
        }
    }

    destroy(): void {
        return this._destroying()
    }

    onDestroy(callback?: DestroyCallback): void {
        if (!callback) {
            return this._destroying()
        }
        this._dsryCbs.add(callback)
    }

    private _destroying() {
        if (!this._destroyed) {
            this._destroyed = true;

            this._dsryCbs.forEach(c => isFunction(c) ? c() : c?.onDestroy())

            this._dsryCbs.clear();
            this.clear();
            const injector = this.injector;
            (this as any).parent = null;
            (this as any).injector = null;
            return injector.destroy();
        }
    }

    private clearCache() {
        this.cache.forEach(r => r?.clear());
        this.cache.clear();
        this.rcache.forEach(r => r?.clear());
        this.rcache.clear();
    }

    protected clear() {
        this.clearCache()
        this._resolvers = null;
        this._refs = null;
    }

}

/**
 * Missing argument execption.
 */
export class MissingParameterException extends Exception {
    constructor(parameters: Parameter[], type: AbstractType, method: string) {
        super(`ailed to invoke operation because the following required parameters were missing: [ ${parameters.map(p => object2string(p)).join(',\n')} ], method ${method} of class ${object2string(type)}`)
    }
}


const deft = {
    typeInst: true,
    fun: true
}

/**
 * format object to string for log.
 * @param obj 
 * @returns 
 */
export function object2string(obj: any, options?: { typeInst?: boolean; fun?: boolean; }): string {
    options = { ...deft, ...options };
    if (isArray(obj)) {
        return `[${obj.map(v => object2string(v, options)).join(', ')}]`
    } else if (isString(obj)) {
        return `"${obj}"`
    } else if (isAbstractType(obj)) {
        return 'Type<' + getTypeName(obj) + '>'
    } else if (obj instanceof Class) {
        return `[${obj.className} TypeReflect]`
    } else if (isPlainObject(obj)) {
        const str: string[] = [];
        for (const n in obj) {
            const value = obj[n];
            str.push(`${n}: ${object2string(value, options)}`)
        }
        return `{ ${str.join(', ')} }`
    } else if (options.typeInst && isTypeObject(obj)) {
        const fileds = Object.keys(obj).filter(k => k).map(k => `${k}: ${object2string(obj[k], { typeInst: false, fun: false })}`);
        return `[${getTypeName(obj)} {${fileds.join(', ')}} ]`
    }
    if (!options.fun && isFunction(obj)) {
        return 'Function'
    }
    return `${obj?.toString()}`
}


INVOCATION_CONTEXT_IMPL.create = (parent: Injector | InvocationContext, options?: TargetInvokeArguments, scope?: AbstractType | 'static') => {
    if (isInjector(parent)) {
        return new DefaultInvocationContext(parent, options, scope)
    } else {
        return new DefaultInvocationContext(parent.injector, { parent, ...options }, scope)
    }
}


export const BASE_RESOLVERS: OperationArgumentResolver[] = [
    composeResolver(
        (parameter, ctx) => isDefined(parameter.provider),
        {
            canResolve(parameter, ctx) {
                return ctx.has(parameter.provider as Token, parameter.flags)
            },
            resolve(parameter, ctx) {
                return ctx.get(parameter.provider as Token, parameter.flags)
            }
        },
        {
            canResolve(parameter, ctx) {
                if (parameter.multi || !isFunction(parameter.provider) || isPrimitiveType(parameter.provider)
                    || getDef(parameter.provider).abstract) return false;
                return isDefined(parameter.flags) ? !ctx.injector.has(parameter.provider!, parameter.flags) : true
            },
            resolve(parameter, ctx) {
                const pdr = parameter.provider!;
                if (parameter.name || parameter.propertyKey) {
                    const injector = ctx.injector.parent ?? ctx.injector;
                    injector.register(pdr as Type);
                }
                return ctx.get(pdr, parameter.flags)
            }
        }
    ),
    composeResolver(
        (parameter, ctx) => isDefined(parameter.name),
        {
            canResolve(parameter, ctx) {
                return ctx.has(parameter.name!, parameter.flags)
            },
            resolve(parameter, ctx) {
                return ctx.get(parameter.name!, parameter.flags) as any
            }
        }
    ),
    composeResolver(
        (parameter, ctx) => isDefined(parameter.type),
        {
            canResolve(parameter, ctx) {
                return ctx.has(parameter.type!, parameter.flags)
            },
            resolve(parameter, ctx) {
                return ctx.get(parameter.type!, parameter.flags)
            }
        },
        {
            canResolve(parameter, ctx) {
                if (!isFunction(parameter.type) || isPrimitiveType(parameter.type) || getDef(parameter.type!).abstract) return false;
                return isDefined(parameter.flags) ? !ctx.injector.has(parameter.type!, parameter.flags) : true
            },
            resolve(parameter, ctx) {
                const ty = parameter.type!;
                if (parameter.name || parameter.propertyKey) {
                    const injector = ctx.injector.parent ?? ctx.injector;
                    injector.register(ty as Type);
                }
                return ctx.get(ty, parameter.flags)
            }
        }
    ),
    // default value
    {
        canResolve(parameter) {
            return isDefined(parameter.defaultValue) || parameter.nullable === true || (parameter.flags && !!(parameter.flags & InjectFlags.Optional)) as boolean
        },
        resolve(parameter) {
            return parameter.defaultValue ?? null
        }
    }
];
