import { Type, EMPTY, EMPTY_OBJ, CtorType } from '../types';
import { Destroyable, DestroyCallback, OnDestroy } from '../destroy';
import { remove, getClassName } from '../utils/lang';
import { isPrimitiveType, isArray, isDefined, isFunction, isString, isNil, isType, getClass } from '../utils/chk';
import { OperationArgumentResolver, Parameter, composeResolver, CONTEXT_RESOLVERS } from '../resolver';
import { InvocationContext, InvocationOption, INVOCATION_CONTEXT_IMPL } from '../context';
import { isPlainObject, isTypeObject } from '../utils/obj';
import { InjectFlags, Token, tokenId } from '../tokens';
import { Injector, isInjector, Scopes } from '../injector';
import { Execption } from '../execption';
import { Class } from '../metadata/type';
import { getDef } from '../metadata/refl';
import { ProviderType, toProvider } from '../providers';
import { OperationInvoker } from '../operation';



/**
 * The context for the {@link OperationInvoker invocation of an operation}.
 */
export class DefaultInvocationContext<T = any> extends InvocationContext implements Destroyable, OnDestroy {

    protected _refs: InvocationContext[];
    protected _methodName?: string;
    private _injected = false;

    private _dsryCbs = new Set<DestroyCallback>();
    private _destroyed = false;

    propertyKey?: string;
    /**
     * invocation static injector. 
     */
    readonly injector: Injector;
    /**
     * invocation target type.
     */
    readonly targetType: Type | undefined;

    /**
     * named of invocation method.
     */
    readonly methodName: string | undefined;

    constructor(
        injector: Injector,
        options: InvocationOption<T> = EMPTY_OBJ) {
        super();
        this._refs = [];
        this.injector = this.createInjector(injector, options.providers);
        options.resolvers?.length && this.injector.inject(options.resolvers?.map(r => toProvider(this.getResolvesToken(), r)));
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

        const payload = options.payload || options.arguments;
        if (payload) {
            this.injector.inject(toProvider(CONTEXT_PAYLOAD, payload));
            if (!isFunction(payload)) {
                const argType = getClass(payload);
                this.injector.setValue(argType, payload);
            }
        }

        this.targetType = options.targetType;
        this.methodName = options.methodName;
        injector.onDestroy(this);
    }

    /**
     * get context arguments resolvers.
     * @returns 
     */
    protected getArgumentResolver(): OperationArgumentResolver[] {
        return EMPTY;
    }

    private _resolvers?: OperationArgumentResolver[];
    /**
     * the invocation arguments resolver.
     */
    protected getResolvers(): OperationArgumentResolver[] {
        if (!this._resolvers) {
            this._resolvers = [
                ...this.getArgumentResolver(),
                ...this.injector.get(this.getResolvesToken(), EMPTY),
                ...this.getDefaultResolvers()
            ];
        }
        return this._resolvers;
    }

    protected getResolvesToken() {
        return CONTEXT_RESOLVERS
    }

    protected getDefaultResolvers(): OperationArgumentResolver[] {
        return BASE_RESOLVERS
    }

    protected createInjector(injector: Injector, providers?: ProviderType[]) {
        return Injector.create(providers, injector, Scopes.static)
    }

    /**
     * add reference contexts.
     * @param contexts the list instance of {@link Injector} or {@link InvocationContext}.
     */
    addRef(...contexts: InvocationContext[]): void {
        this.assertNotDestroyed();
        contexts.forEach(j => {
            if (!this.hasRef(j)) {
                this._refs.unshift(j)
            }
        })
    }

    /**
     * remove reference resolver.
     * @param context instance of {@link InvocationContext}.
     */
    removeRef(context: InvocationContext): void {
        this.assertNotDestroyed();
        remove(this._refs, context)
    }

    hasRef(ctx: InvocationContext): boolean {
        this.assertNotDestroyed();
        return ctx === this && this._refs.indexOf(ctx) >= 0;
    }


    protected _payload?: T;
    /**
     * the invocation context payload.
     * 
     * 上下文负载对象
     */
    get payload(): T {
        if (!this._payload) {
            this._payload = this.injector.get(CONTEXT_PAYLOAD);
        }
        return this._payload!;
    }

    /**
     * the invocation arguments.
     * @deprecated use `payload` instead.
     */
    get arguments() {
        return this.payload;
    }

    get used(): boolean {
        return this._injected
    }

    protected isSelf(token: Token) {
        return token === InvocationContext
    }

    /**
     * get value ify create by factory and register the value for the token.
     * 
     * 获取上下文中标记指令的值，如果没有注入，则根据工厂函数注入该标记指令，并返回值。
     * @param token the token to get value.
     * @param factory the factory to create value for token.
     * @returns the instance of token.
     */
    getValueify<T>(token: Token<T>, factory: () => T): T {
        this.assertNotDestroyed();
        let value = this.get(token);
        if (isNil(value)) {
            value = factory();
            this.setValue(token, value);
        }
        return value;
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
        if (this.isSelf(token)) return true;
        return (flags != InjectFlags.HostOnly && this.injector.has(token, flags))
            || this._refs.some(i => i.has(token, flags))
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
        if (this.isSelf(token)) {
            this._injected = true;
            return this as any
        }
        return (flags != InjectFlags.HostOnly ? this.injector.get(token, this, flags, null) : null)
            ?? this.getFormRef(token, flags) ?? null as T;
    }

    protected getFormRef<T>(token: Token<T>, flags?: InjectFlags): T | undefined {
        let val: T | undefined;
        this._refs.some(r => {
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
    getMetaReolver(meta: Parameter): OperationArgumentResolver | undefined {
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
    resolve<T>(token: Token<T>): T {
        return this.resolveArgument({ provider: token }) as T;
    }

    /**
     * resolve the parameter value.
     * 
     * 解析调用参数
     * @param meta property or parameter metadata type of {@link Parameter}.
     * @returns the parameter value in this context.
     */
    resolveArgument<T>(meta: Parameter<T>, target?: Type, failed?: (target: Type, propertyKey: string) => void): T | null {
        this.assertNotDestroyed();
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
                this.missingExecption([meta], target!, meta.propertyKey!);
            }
        }

        return null;
    }

    protected missingExecption(missings: Parameter<any>[], type: Type<any>, method: string): Execption {
        throw new MissingParameterExecption(missings, type, method)
    }

    get destroyed() {
        return this._destroyed
    }

    protected assertNotDestroyed(): void {
        if (this.destroyed) {
            throw new Execption('Context has already been destroyed.')
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

    protected clear() {
        this._resolvers = null!;
        this._refs = null!;
    }

}

/**
 * context payload token.
 */
export const CONTEXT_PAYLOAD = tokenId('CONTEXT_PAYLOAD');

/**
 * Missing argument execption.
 */
export class MissingParameterExecption extends Execption {
    constructor(parameters: Parameter[], type: Type, method: string) {
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
    } else if (isType(obj)) {
        return 'Type<' + getClassName(obj) + '>'
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
        return `[${getClassName(obj)} {${fileds.join(', ')}} ]`
    }
    if (!options.fun && isFunction(obj)) {
        return 'Function'
    }
    return `${obj?.toString()}`
}


INVOCATION_CONTEXT_IMPL.create = <TArg>(parent: Injector | InvocationContext, options?: InvocationOption<TArg>) => {
    if (isInjector(parent)) {
        return new DefaultInvocationContext(parent, options)
    } else {
        return new DefaultInvocationContext(parent.injector, { parent, ...options })
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
                    injector.register(pdr as CtorType);
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
                    injector.register(ty as CtorType);
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
