import { ClassType, Type } from '../types';
import { Destroyable, OnDestroy } from '../destroy';
import { forIn, remove } from '../utils/lang';
import { EMPTY, EMPTY_OBJ, isDefined, isFunction, isNumber, isPrimitiveType } from '../utils/chk';
import { InjectFlags, Token } from '../tokens';
import { Injector, isInjector } from '../injector';
import { OperationArgumentResolver, Parameter, composeResolver, DEFAULT_RESOLVERS } from '../resolver';
import { InvocationContext, INVOCATION_CONTEXT_IMPL, InvocationOption } from '../context';
import { get } from '../metadata/refl';
import { ProviderType } from '../providers';



/**
 * The context for the {@link OperationInvoker invocation of an operation}.
 */
export class DefaultInvocationContext<T = any> extends InvocationContext implements Destroyable, OnDestroy {
    protected _args: T;
    protected _refs: InvocationContext[];
    protected _values: Map<Token, any>;
    protected _methodName?: string;
    /**
     * the invocation arguments resolver.
     */
    protected resolvers: OperationArgumentResolver[];
    propertyKey?: string;

    /**
     * parent {@link InvocationContext}.
     */
    readonly parent: InvocationContext | undefined;
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
    readonly methodName: string | undefined

    constructor(
        injector: Injector,
        options: InvocationOption = EMPTY_OBJ) {
        super();
        this.parent = options.parent;
        this.injector = this.createInjector(injector, options.providers);
        const defsRvs = this.injector.get(DEFAULT_RESOLVERS, EMPTY);
        this.resolvers = (options.resolvers ? options.resolvers.concat(defsRvs) : defsRvs).map(r => isFunction(r) ? this.injector.get<OperationArgumentResolver>(r) : r);

        this._values = new Map(options.values);
        this._args = options.arguments;
        if (this._args) {
            forIn(this._args, (v, k) => {
                this._values.set(k, v);
            });
        }

        this.targetType = options.targetType;
        this.methodName = options.methodName;
        injector.onDestroy(this);
        this._refs = [];
    }


    protected createInjector(injector: Injector, providers?: ProviderType[]) {
        return Injector.create(providers, injector, 'invocation');
    }

    /**
     * add reference contexts.
     * @param contexts the list instance of {@link Injector} or {@link InvocationContext}.
     */
    addRef(...contexts: InvocationContext[]): void {
        contexts.forEach(j => {
            if (!this.hasRef(j)) {
                this._refs.push(j);
            }
        });
    }

    /**
     * remove reference resolver.
     * @param context instance of {@link InvocationContext}.
     */
    removeRef(context: InvocationContext): void {
        remove(this._refs, context);
    }

    hasRef(ctx: InvocationContext): boolean {
        if(ctx === this && this._refs.indexOf(ctx) >= 0) return true;
        return this.parent?.hasRef(ctx) === true;
    }

    /**
     * the invocation arguments.
     */
    get arguments(): T {
        return this._args;
    }

    protected isSelf(token: Token) {
        return token === InvocationContext;
    }

    /**
     * has token in the context or not.
     * @param token the token to check.
     * @param flags inject flags, type of {@link InjectFlags}.
     * @returns boolean.
     */
    has(token: Token, flags?: InjectFlags): boolean {
        if (this.isSelf(token)) return true;
        return this.injector.has(token, flags)
            || this._refs.some(i => i.has(token, flags))
            || (flags != InjectFlags.Self && this.parent?.has(token, flags) === true);
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
        if (this.isSelf(token)) return this as any;
        let context: InvocationContext;
        if (isNumber(contextOrFlag)) {
            flags = contextOrFlag;
            context = this;
        } else {
            context = contextOrFlag ?? this;
        }
        return this.injector.get(token, context, flags, null)
            ?? this.getFormRef(token, context, flags)
            ?? (flags != InjectFlags.Self ? this.parent?.get(token, context, flags) : null) as T;
    }

    protected getFormRef<T>(token: Token<T>, context?: InvocationContext, flags?: InjectFlags): T | undefined {
        let val: T | undefined;
        this._refs.some(r => {
            val = r.get(token, context, flags);
            return isDefined(val);
        });

        return val;
    }

    /**
     * has value to context
     * @param token the token to check has value.
     */
    hasValue<T>(token: Token, flags?: InjectFlags): boolean {
        if (this.isSelf(token)) return true;
        return this._values.has(token) || this._refs.some(c => c.hasValue(token))
        || (flags != InjectFlags.Self && this.parent?.hasValue(token, flags) === true);
    }

    /**
     * get value to context
     * @param token the token to get value.
     */
    getValue<T>(token: Token<T>, flags?: InjectFlags): T {
        if (this.isSelf(token)) return this as any;
        return this._values.get(token) ?? this.getRefValue(token)
        ?? (flags != InjectFlags.Self? this.parent?.getValue(token) : null);
    }

    protected getRefValue(token: Token) {
        let val: T | undefined;
        this._refs.some(r => {
            val = r.getValue(token);
            return isDefined(val);
        });
        return val;
    }

    /**
     * set value.
     * @param token token
     * @param value value for the token.
     */
    setValue<T>(token: Token<T>, value: T) {
        this._values.set(token, value);
        return this;
    }

    /**
     * can resolve the parameter or not.
     * @param meta property or parameter metadata type of {@link Parameter}.
     * @returns 
     */
    canResolve(meta: Parameter): boolean {
        return this.getMetaReolver(meta)?.canResolve(meta, this) === true
            || this.resolvers.some(r => r.canResolve(meta, this))
            || this.parent?.canResolve(meta) == true;
    }

    /**
     * get resolver in the property or parameter metadata. configured in class design.
     * @param meta property or parameter metadata type of {@link Parameter}.
     * @returns undefined or resolver of type {@link OperationArgumentResolver}.
     */
    getMetaReolver(meta: Parameter): OperationArgumentResolver | undefined {
        if (isFunction(meta.resolver)) {
            return this.injector.get<OperationArgumentResolver>(meta.resolver);
        }
        return meta.resolver;
    }

    resolve<T>(token: Token<T>): T {
        return this.resolveArgument({ provider: token }) as T;
    }

    /**
     * resolve the parameter value.
     * @param meta property or parameter metadata type of {@link Parameter}.
     * @returns the parameter value in this context.
     */
    resolveArgument<T>(meta: Parameter<T>, target?: ClassType): T | null {
        let result: T | undefined;
        const metaRvr = this.getMetaReolver(meta);
        if (metaRvr?.canResolve(meta, this)) {
            result = metaRvr.resolve(meta, this, target);
            if (isDefined(result)) return result;
        }
        this.resolvers.some(r => {
            if (r.canResolve(meta, this)) {
                result = r.resolve(meta, this, target);
                return isDefined(result);
            }
            return false;
        });
        return result ?? this.parent?.resolveArgument(meta, target) ?? null;
    }

    protected clear() {
        this._args = null!;
        this.resolvers = null!;
        this._refs = [];
    }

}

INVOCATION_CONTEXT_IMPL.create = (parent, option) => {
    if (isInjector(parent)) {
        return new DefaultInvocationContext(parent, option);
    } else {
        return new DefaultInvocationContext(parent.injector, { parent, ...option });
    }
};


export const BASE_RESOLVERS: OperationArgumentResolver[] = [
    composeResolver(
        (parameter, ctx) => isDefined(parameter.provider),
        {
            canResolve(parameter, ctx) {
                return ctx.hasValue(parameter.provider!, parameter.flags);
            },
            resolve(parameter, ctx) {
                return ctx.getValue<any>(parameter.provider!, parameter.flags);
            }
        },
        {
            canResolve(parameter, ctx) {
                return ctx.has(parameter.provider as Token, parameter.flags);
            },
            resolve(parameter, ctx) {
                return ctx.get(parameter.provider as Token, ctx, parameter.flags);
            }
        },
        {
            canResolve(parameter, ctx) {
                if (parameter.mutil || !isFunction(parameter.provider) || isPrimitiveType(parameter.provider)
                    || get(parameter.provider)?.class.abstract) return false;
                return isDefined(parameter.flags) ? !ctx.injector.has(parameter.provider!, InjectFlags.Default) : true;
            },
            resolve(parameter, ctx) {
                const pdr = parameter.provider!;
                const injector = ctx.injector?.parent ?? ctx.injector;
                injector.register(pdr as Type);
                return injector.get(pdr, ctx, parameter.flags);
            }
        }
    ),
    composeResolver(
        (parameter, ctx) => isDefined(parameter.paramName),
        {
            canResolve(parameter, ctx) {
                return ctx.hasValue(parameter.paramName!, parameter.flags);
            },
            resolve(parameter, ctx) {
                return ctx.getValue(parameter.paramName!, parameter.flags) as any;
            }
        },
        {
            canResolve(parameter, ctx) {
                return ctx.has(parameter.paramName!, parameter.flags);
            },
            resolve(parameter, ctx) {
                return ctx.get(parameter.paramName!, ctx, parameter.flags);
            }
        }
    ),
    composeResolver(
        (parameter, ctx) => isDefined(parameter.type),
        {
            canResolve(parameter, ctx) {
                return ctx.hasValue(parameter.type!, parameter.flags);
            },
            resolve(parameter, ctx) {
                return ctx.getValue<any>(parameter.type!, parameter.flags);
            }
        },
        {
            canResolve(parameter, ctx) {
                return ctx.has(parameter.type!, parameter.flags);
            },
            resolve(parameter, ctx) {
                return ctx.get(parameter.type!, ctx, parameter.flags);
            }
        },
        {
            canResolve(parameter, ctx) {
                if (!isFunction(parameter.type) || isPrimitiveType(parameter.type) || get(parameter.type!)?.class.abstract) return false;
                return isDefined(parameter.flags) ? !ctx.injector.has(parameter.type!, InjectFlags.Default) : true;
            },
            resolve(parameter, ctx) {
                const ty = parameter.type!;
                const injector = ctx.injector?.parent ?? ctx.injector;;
                injector.register(ty as Type);
                return injector.get(ty, ctx, parameter.flags);
            }
        }
    ),
    // default value
    {
        canResolve(parameter) {
            return isDefined(parameter.defaultValue);
        },
        resolve(parameter) {
            return parameter.defaultValue as any;
        }
    },
    {
        canResolve(parameter) {
            return parameter.nullable === true;
        },
        resolve(parameter) {
            return undefined;
        }
    }
];
