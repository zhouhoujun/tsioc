import { Destroyable, OnDestroy } from '../destroy';
import { Injector } from '../injector';
import { DEFAULT_RESOLVERS, InvocationContext, INVOCATIONCONTEXT_IMPL, InvocationOption, OperationArgumentResolver, Parameter } from '../invoker';
import { InjectFlags, Token } from '../tokens';
import { ClassType } from '../types';
import { EMPTY, EMPTY_OBJ, isDefined, isFunction, isString } from '../utils/chk';
import { remove } from '../utils/lang';




/**
 * The context for the {@link OperationInvoker invocation of an operation}.
 */
export class DefaultInvocationContext<T = any> extends InvocationContext implements Destroyable, OnDestroy {
    private _args: T;
    private _refs: InvocationContext[];
    private _values: Map<Token, any>;
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
     * invocation target.
     */
    readonly target: ClassType | undefined;
    /**
     * invocation method.
     */
    readonly method: string | undefined;

    constructor(
        injector: Injector,
        options: InvocationOption = EMPTY_OBJ) {
        super();
        this.injector = Injector.create(options.providers, injector, 'invocation');
        const defsRvs = this.injector.get(DEFAULT_RESOLVERS, EMPTY);
        this.resolvers = (options.resolvers ? options.resolvers.concat(defsRvs) : defsRvs).map(r => isFunction(r) ? this.injector.get<OperationArgumentResolver>(r) : r);
        this._args = (options.arguments ?? {}) as T;
        this._values = new Map(options.values);
        this.parent = options.parent ?? injector.get(InvocationContext);
        this.target = options.invokerTarget;
        this.method = options.invokerMethod;
        injector.onDestroy(this);
        this._refs = [];
    }

    /**
     * add reference resolver.
     * @param resolvers the list instance of {@link Injector} or {@link InvocationContext}.
     */
    addRef(...resolvers: InvocationContext[]) {
        resolvers.forEach(j => {
            if (this._refs.indexOf(j) < 0) {
                this._refs.push(j);
            }
        });
    }

    /**
     * remove reference resolver.
     * @param resolver instance of {@link Injector} or {@link InvocationContext}.
     */
    removeRef(resolver: Injector | InvocationContext) {
        remove(this._refs, resolver);
    }

    /**
     * the invocation arguments.
     */
    get arguments(): T {
        return this._args;
    }

    /**
     * set argument.
     * @param name 
     * @param value 
     */
    setArgument(name: string, value: any): void {
        (this._args as any)[name] = value;
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
        return this.injector.has(token, flags) || this._refs.some(i => i.has(token, flags)); // || (flags != InjectFlags.Self && this.parent?.has(token, flags) === true);
    }

    /**
     * get token value.
     * @param token the token to get value.
     * @param context invcation context, type of {@link InvocationContext}.
     * @param flags inject flags, type of {@link InjectFlags}.
     * @returns the instance of token.
     */
    get<T>(token: Token<T>, context?: InvocationContext<any>, flags?: InjectFlags): T {
        if (this.isSelf(token)) return this as any;
        return this.injector.get(token, context, flags) ?? this.getFormRef(token, context, flags) as T; //?? (flags != InjectFlags.Self? this.parent?.get(token, context, flags) : null) as T;
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
    hasValue<T>(token: Token): boolean {
        if (this.isSelf(token)) return true;
        return this.hasArg(token)
            || this._values.has(token)
            || this._refs.some(c => c.hasValue(token))
            || this.parent?.hasValue(token) === true;
    }

    /**
     * get value to context
     * @param token the token to get value.
     */
    getValue<T>(token: Token<T>): T {
        if (this.isSelf(token)) return this as any;
        return this.getArg(token)
            ?? this._values.get(token)
            ?? this.getRefValue(token)
            ?? this.parent?.getValue(token);
    }

    protected hasArg(token: Token) {
        return isString(token) ? isDefined((this._args as any)[token]) : false;
    }

    protected getArg(token: Token) {
        return isString(token) ? (this._args as any)[token] : null;
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

    resolve<T>(token: Token<T>): T | null {
        return this.resolveArgument({ provider: token });
    }

    /**
     * resolve the parameter value.
     * @param meta property or parameter metadata type of {@link Parameter}.
     * @returns the parameter value in this context.
     */
    resolveArgument<T>(meta: Parameter<T>): T | null {
        let result: T | undefined;
        const metaRvr = this.getMetaReolver(meta);
        if (metaRvr?.canResolve(meta, this)) {
            result = metaRvr.resolve(meta, this);
            if (isDefined(result)) return result;
        }
        this.resolvers.some(r => {
            if (r.canResolve(meta, this)) {
                result = r.resolve(meta, this);
                return isDefined(result);
            }
            return false;
        });
        return result ?? this.parent?.resolveArgument(meta) ?? null;
    }



    protected clear() {
        this._args = null!;
        this.resolvers = null!;
        this._refs = [];
    }

}

INVOCATIONCONTEXT_IMPL.create = (injector, option) => new DefaultInvocationContext(injector, option);
