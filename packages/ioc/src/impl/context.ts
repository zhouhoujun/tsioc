import { ClassType, EMPTY, EMPTY_OBJ, Type, TypeOf } from '../types';
import { Destroyable, DestroyCallback, OnDestroy } from '../destroy';
import { forIn, remove, getClassName } from '../utils/lang';
import { isNumber, isPrimitiveType, isArray, isClassType, isDefined, isFunction, isString, isNil } from '../utils/chk';
import { OperationArgumentResolver, Parameter, composeResolver, CONTEXT_RESOLVERS } from '../resolver';
import { InvocationContext, InvocationOption, INVOCATION_CONTEXT_IMPL } from '../context';
import { isPlainObject, isTypeObject } from '../utils/obj';
import { InjectFlags, Token } from '../tokens';
import { Injector, isInjector, Scopes } from '../injector';
import { get } from '../metadata/refl';
import { isTypeDef } from '../metadata/type';
import { ProviderType } from '../providers';
import { Execption } from '../execption';
import { OperationInvoker } from '../operation';



/**
 * The context for the {@link OperationInvoker invocation of an operation}.
 */
export class DefaultInvocationContext<T = any> extends InvocationContext implements Destroyable, OnDestroy {

    protected _args: T;
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
    readonly targetType: ClassType | undefined;

    /**
     * named of invocation method.
     */
    readonly methodName: string | undefined;

    constructor(
        injector: Injector,
        options: InvocationOption = EMPTY_OBJ) {
        super();
        this._refs = [];
        this.injector = this.createInjector(injector, options.providers);
        options.resolvers?.length && this.injector.inject(options.resolvers?.map(r => this.resolverProvider(r)));
        if (options.parent && injector !== options.parent.injector) {
            const parent = options.parent;
            this.addRef(parent);
            parent.onDestroy(() => {
                this.removeRef(parent);
            });
        }

        if (options.values) {
            options.values.forEach(par => {
                this.injector.setValue(par[0], par[1]);
            })
        }
        this._args = options.arguments;
        if (this._args) {
            forIn(this._args, (v, k) => {
                this.injector.setValue(k, v)
            })
        }

        this.targetType = options.targetType;
        this.methodName = options.methodName;
        injector.onDestroy(this);
    }

    private _resolvers?: OperationArgumentResolver[];
    /**
     * the invocation arguments resolver.
     */
    protected getResolvers(): OperationArgumentResolver[] {
        if (!this._resolvers) {
            this._resolvers = [...this.injector.get(this.getResolvesToken(), EMPTY), ...this.getDefaultResolvers()];
        }
        return this._resolvers;
    }

    protected getResolvesToken() {
        return CONTEXT_RESOLVERS
    }

    protected getDefaultResolvers(): OperationArgumentResolver[] {
        return BASE_RESOLVERS
    }

    protected resolverProvider(resolver: TypeOf<OperationArgumentResolver>): ProviderType {
        return isFunction(resolver) ? { provide: this.getResolvesToken(), useClass: resolver as Type, multi: true } : { provide: this.getResolvesToken(), useValue: resolver, multi: true } as ProviderType
    }


    protected createInjector(injector: Injector, providers?: ProviderType[]) {
        return Injector.create(providers, injector, Scopes.static)
    }

    /**
     * add reference contexts.
     * @param contexts the list instance of {@link Injector} or {@link InvocationContext}.
     */
    addRef(...contexts: InvocationContext[]): void {
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
        remove(this._refs, context)
    }

    hasRef(ctx: InvocationContext): boolean {
        return ctx === this && this._refs.indexOf(ctx) >= 0;
        // if (ctx === this && this._refs.indexOf(ctx) >= 0) return true;
        // return this.parent?.hasRef(ctx) === true
    }

    /**
     * the invocation arguments.
     */
    get arguments(): T {
        return this._args
    }

    get injected(): boolean {
        return this._injected
    }

    protected isSelf(token: Token) {
        return token === InvocationContext
    }

    /**
     * get value ify create by factory and register the value for the token.
     * @param token the token to get value.
     * @param factory the factory to create value for token.
     * @returns the instance of token.
     */
    getValueify<T>(token: Token<T>, factory: () => T): T {
        let value = this.get(token);
        if (isNil(value)) {
            value = factory();
            this.setValue(token, value);
        }
        return value;
    }

    /**
     * has token in the context or not.
     * @param token the token to check.
     * @param flags inject flags, type of {@link InjectFlags}.
     * @returns boolean.
     */
    has(token: Token, flags?: InjectFlags): boolean {
        if (this.isSelf(token)) return true;
        return (flags != InjectFlags.HostOnly && this.injector.has(token, flags))
            || this._refs.some(i => i.has(token, flags))
        // || (flags != InjectFlags.Self && this.parent?.has(token, this.isDiff ? flags : InjectFlags.HostOnly) === true)
    }

    /**
     * get token value.
     * @param token the token to get value.
     * @param flags inject flags, type of {@link InjectFlags}.
     * @returns the instance of token.
     */
    get<T>(token: Token<T>, flags?: InjectFlags): T;
    /**
     * get token value.
     * @param token the token to get value.
     * @param context invcation context, type of {@link InvocationContext}.
     * @param flags inject flags, type of {@link InjectFlags}.
     * @returns the instance of token.
     */
    get<T>(token: Token<T>, context?: InvocationContext, flags?: InjectFlags): T;
    get<T>(token: Token<T>, contextOrFlag?: InvocationContext | InjectFlags, flags?: InjectFlags): T {
        if (this.isSelf(token)) {
            this._injected = true;
            return this as any
        }
        let context: InvocationContext;
        if (isNumber(contextOrFlag)) {
            flags = contextOrFlag;
            context = this as InvocationContext;
        } else {
            context = contextOrFlag ?? this
        }
        return (flags != InjectFlags.HostOnly ? this.injector.get(token, context, flags, null) : null)
            ?? this.getFormRef(token, context, flags) ?? null as T;
        // ?? (flags != InjectFlags.Self ? this.parent?.get(token, context, this.isDiff ? flags : InjectFlags.HostOnly) : null) as T
    }

    protected getFormRef<T>(token: Token<T>, context?: InvocationContext, flags?: InjectFlags): T | undefined {
        let val: T | undefined;
        this._refs.some(r => {
            val = r.get(token, context, flags);
            return isDefined(val)
        });

        return val
    }

    /**
     * set value.
     * @param token token
     * @param value value for the token.
     */
    setValue<T>(token: Token<T>, value: T) {
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

    resolve<T>(token: Token<T>): T {
        return this.resolveArgument({ provider: token }) as T
    }

    /**
     * resolve the parameter value.
     * @param meta property or parameter metadata type of {@link Parameter}.
     * @returns the parameter value in this context.
     */
    resolveArgument<T>(meta: Parameter<T>, target?: ClassType, failed?: (target: ClassType, propertyKey: string) => void): T | null {
        let result: T | null | undefined;
        let canResolved = false;
        const metaRvr = this.getMetaReolver(meta);
        if (metaRvr?.canResolve(meta, this)) {
            canResolved = true;
            result = metaRvr.resolve(meta, this, target);
            if (!isNil(result)) {
                return result;
            }
        }
        if (this.getResolvers().some(r => {
            if (r.canResolve(meta, this)) {
                canResolved = true;
                result = r.resolve(meta, this, target);
                return !isNil(result);
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

    protected missingExecption(missings: Parameter<any>[], type: ClassType<any>, method: string): Execption {
        return new MissingParameterExecption(missings, type, method)
    }

    get destroyed() {
        return this._destroyed
    }

    destroy(): void | Promise<void> {
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

    onDestroy(callback?: DestroyCallback): void | Promise<void> {
        if (!callback) {
            return this.destroy()
        }
        this._dsryCbs.add(callback)
    }

    protected clear() {
        this._args = null!;
        this._resolvers = null!;
        this._refs = null!;
    }

}


/**
 * Missing argument execption.
 */
export class MissingParameterExecption extends Execption {
    constructor(parameters: Parameter[], type: ClassType, method: string) {
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
    } else if (isClassType(obj)) {
        return 'Type<' + getClassName(obj) + '>'
    } else if (isTypeDef(obj)) {
        return `[${obj.class.className} TypeReflect]`
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


INVOCATION_CONTEXT_IMPL.create = (parent: Injector | InvocationContext, options?: InvocationOption) => {
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
                return ctx.get(parameter.provider as Token, ctx, parameter.flags)
            }
        },
        {
            canResolve(parameter, ctx) {
                if (parameter.mutil || !isFunction(parameter.provider) || isPrimitiveType(parameter.provider)
                    || get(parameter.provider)?.class.abstract) return false;
                return isDefined(parameter.flags) ? !ctx.injector.has(parameter.provider!, InjectFlags.Default) : true
            },
            resolve(parameter, ctx) {
                const pdr = parameter.provider!;
                const injector = ctx.injector?.parent ?? ctx.injector;
                injector.register(pdr as Type);
                return injector.get(pdr, ctx, parameter.flags)
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
                return ctx.get(parameter.name!, ctx, parameter.flags) as any
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
                return ctx.get(parameter.type!, ctx, parameter.flags)
            }
        },
        {
            canResolve(parameter, ctx) {
                if (!isFunction(parameter.type) || isPrimitiveType(parameter.type) || get(parameter.type!)?.class.abstract) return false;
                return isDefined(parameter.flags) ? !ctx.injector.has(parameter.type!, InjectFlags.Default) : true
            },
            resolve(parameter, ctx) {
                const ty = parameter.type!;
                const injector = ctx.injector?.parent ?? ctx.injector;
                injector.register(ty as Type);
                return injector.get(ty, ctx, parameter.flags)
            }
        }
    ),
    // default value
    {
        canResolve(parameter) {
            return isDefined(parameter.defaultValue)
        },
        resolve(parameter) {
            return parameter.defaultValue as any
        }
    },
    {
        canResolve(parameter) {
            return parameter.nullable === true
        },
        resolve(parameter) {
            return null!
        }
    }
];
