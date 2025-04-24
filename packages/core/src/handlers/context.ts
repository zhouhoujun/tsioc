import { DefaultInvocationContext, Injector, InvokeArguments, OperationArgumentResolver, Token, composeResolvers, getClass } from '@tsdi/ioc';
import { getResolverToken } from './resolver';

/**
 * handle context options.
 */
export interface HandleContextOpts<T = any> extends InvokeArguments<T> {
    bootstrap?: boolean;
}

/**
 * invoke handle context.
 */
export class HandleContext<TInput = any> extends DefaultInvocationContext<TInput> {
    readonly bootstrap: boolean;
    constructor(
        injector: Injector,
        options: HandleContextOpts<TInput> = {}) {
        super(injector, options);
        this.bootstrap = options.bootstrap === true;
        this.setValue(getClass(this), this);
    }
    private _execption: any;
    /**
     * execption.
     */
    get execption(): any {
        return this._execption;
    }

    set execption(err: any) {
        this._execption = err;
        this.onExecption(err);
    }

    protected onExecption(err: any) { }

    protected override getArgumentResolver(): OperationArgumentResolver<any>[] {
        const res: OperationArgumentResolver[] = [];
        const defRels = this.playloadDefaultResolvers();
        if (defRels?.length) {
            res.push(composeResolvers(defRels));
        }
        if (this.args) {
            const args = this.injector.get(getResolverToken(this.args), null);
            if (args?.length) {
                res.unshift(composeResolvers(args));
            }
        }
        return res;
    }

    protected playloadDefaultResolvers(): OperationArgumentResolver<any>[] | null {
        return null
    }

    protected override clear(): void {
        super.clear();
        this.execption = null
    }

}

/**
 * context token.
 */
export class ContextToken<T = any> {
    constructor(readonly defaultValue: () => T) { }
}


/**
 * custom context.
 */
export class Context {

    private map: Map<Token | ContextToken, any>;

    constructor(entries?: readonly (readonly [Token | ContextToken, any])[] | null) {
        this.map = new Map(entries);
    }

    /**
     * Store a value in the context. If a value is already present it will be overwritten.
     *
     * @param token The reference to an instance of `Token`.
     * @param value The value to store.
     *
     * @returns A reference to itself for easy chaining.
     */
    set<T>(token: Token<T> | ContextToken<T>, value: T) {
        this.map.set(token, value);
        return this;
    }
    /**
     * Retrieve the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns The stored value or default if one is defined.
     */
    get<T>(token: ContextToken<T>): T;
    /**
     * Retrieve the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns The stored value or default if one is defined.
     */
    get<T>(token: Token<T>): T | null;
    /**
     * Retrieve the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns The stored value or default if one is defined.
     */
    get<T>(token: Token<T> | ContextToken<T>): T | null {
        if (token instanceof ContextToken && !this.map.has(token)) {
            this.map.set(token, token.defaultValue());
        }
        return this.map.get(token) ?? null;
    }
    /**
     * Delete the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns A reference to itself for easy chaining.
     */
    delete<T>(token: Token<T> | ContextToken<T>) {
        this.map.delete(token);
        return this;
    }
    /**
     * Checks for existence of a given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns True if the token exists, false otherwise.
     */
    has<T>(token: Token<T> | ContextToken<T>): boolean {
        return this.map.has(token);
    }
    /**
     * @returns a list of tokens currently stored in the context.
     */
    keys(): Iterator<Token | ContextToken> {
        return this.map.keys();
    }

    onDestroy(): void {
        this.map.clear();
    }

}
