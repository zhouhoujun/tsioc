import { Type, ClassType, EMPTY, EMPTY_OBJ } from '../types';
import { Destroyable, DestroyCallback, OnDestroy } from '../destroy';
import { remove, getClassName, getClassChain } from '../utils/lang';
import { isPrimitiveType, isArray, isDefined, isFunction, isString, isNil, isType, getClass } from '../utils/chk';
import { OperationArgumentResolver, Parameter, composeResolver } from '../resolver';
import { InvocationContext, TargetInvokeArguments, INVOCATION_CONTEXT_IMPL } from '../context';
import { isPlainObject, isTypeObject } from '../utils/obj';
import { InjectFlags, Token, tokenId } from '../tokens';
import { Injector, isInjector, Scopes } from '../injector';
import { Execption } from '../execption';
import { Class } from '../metadata/type';
import { getDef } from '../metadata/refl';
import { ProvdierOf, ProviderType, toProvider } from '../providers';
import { OperationInvoker } from '../operation';



/**
 * The context for the {@link OperationInvoker invocation of an operation}.
 */
export class DefaultInvocationContext<T = any> extends InvocationContext implements Destroyable, OnDestroy {

    protected _refs: InvocationContext[] | null;
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

    readonly isResolve: boolean;

    constructor(
        injector: Injector,
        private options: TargetInvokeArguments<T> = EMPTY_OBJ,
    ) {
        super();
        this._refs = [];
        this.isResolve = options.isResolve == true;
        this.injector = this.createInjector(injector, options.providers);
        // options.resolvers?.length && this.injector.inject(options.resolvers?.map(r => toProvider(this.getResolvesToken(), r)));
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

        options.args && this.initArgs(options.args);

        getClassChain(getClass(this)).forEach(c => {
            this.setValue(c, this);
        });

        this.targetType = options.targetType;
        this.methodName = options.methodName;
        injector.onDestroy(this);
    }

    protected initArgs(args: ProvdierOf<T>): void {
        this.injector.inject(toProvider(CONTEXT_ARGUMENTS, args));
        if (!isFunction(args)) {
            const argType = getClass(args);
            this.injector.setValue(argType, args);
        }
    }

    /**
     * get context arguments resolvers.
     * @returns 
     */
    protected getArgumentResolver(): OperationArgumentResolver[] {
        return EMPTY;
    }

    private _resolvers?: OperationArgumentResolver[] | null;
    /**
     * the invocation arguments resolver.
     */
    protected getResolvers(): OperationArgumentResolver[] {
        if (!this._resolvers && !this.destroyed) {
            this._resolvers = [
                ...this.getArgumentResolver(),
                ...(this.options.resolvers ?? EMPTY).map(r => isFunction(r) ? r(this.injector) : r),
                ...this.getDefaultResolvers()
            ];
        }
        return this._resolvers ?? EMPTY;
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
                this._refs!.unshift(j)
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
        return ctx === this && this._refs!.indexOf(ctx) >= 0;
    }


    protected _args?: T;
    /**
     * the invocation context arguments.
     * 
     * 上下文负载参数
     */
    get args(): T {
        if (!this._args) {
            this._args = this.injector.get(CONTEXT_ARGUMENTS);
        }
        return this._args!;
    }


    get used(): boolean {
        return this._injected
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
        return (flags != InjectFlags.HostOnly ? this.injector.get(token, this, flags, null) : null)
            ?? this.getFormRef(token, flags) ?? null as T;
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
    resolve<T>(token: Token<T>, flags?: InjectFlags): T {
        return this.resolveArgument({ provider: token, flags }) as T;
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
        this._resolvers = null;
        this._refs = null;
    }

}

/**
 * context arguments token.
 */
export const CONTEXT_ARGUMENTS = tokenId('CONTEXT_ARGUMENTS');

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


INVOCATION_CONTEXT_IMPL.create = <TArg>(parent: Injector | InvocationContext, options?: TargetInvokeArguments<TArg>) => {
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
                    injector.register(pdr as ClassType);
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
                    injector.register(ty as ClassType);
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
