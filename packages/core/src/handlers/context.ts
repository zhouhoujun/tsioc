import { DefaultInvocationContext, Injector, InvokeArguments, OperationArgumentResolver, Token, getClass } from '@tsdi/ioc';
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
        if (!this.args) return this.playloadDefaultResolvers();
        return [...this.injector.get(getResolverToken(this.args), []), ...this.playloadDefaultResolvers()];
    }

    protected playloadDefaultResolvers(): OperationArgumentResolver<any>[] {
        return []
    }

    protected override clear(): void {
        super.clear();
        this.execption = null
    }

}



/**
 * custom context.
 */
export class Context {

    private map: Map<Token, any>;
    // private destory$ = new Subject<void>();
    // private _next$ = new BehaviorSubject<any>(null);
    // private _inputs: any[];
    // readonly changed: Observable<any>;

    // get inputs(): any[] {
    //     return this._inputs;
    // }

    constructor(entries?: readonly (readonly [Token, any])[] | null) {
        this.map = new Map(entries);
        // this._inputs = [];
        // if (input) {
        //     this._inputs.push(input);
        // }
        // this.changed = this._next$.pipe(
        //     takeUntil(this.destory$),
        //     filter(r => r !== null)
        // )
    }

    /**
     * Store a value in the context. If a value is already present it will be overwritten.
     *
     * @param token The reference to an instance of `Token`.
     * @param value The value to store.
     *
     * @returns A reference to itself for easy chaining.
     */
    set<T>(token: Token<T>, value: T) {
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
    get<T>(token: Token<T>): T {
        return this.map.get(token);
    }
    /**
     * Delete the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns A reference to itself for easy chaining.
     */
    delete<T>(token: Token<T>) {
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
    has<T>(token: Token<T>): boolean {
        return this.map.has(token);
    }
    /**
     * @returns a list of tokens currently stored in the context.
     */
    keys(): Iterator<Token> {
        return this.map.keys();
    }

    onDestroy(): void {
        this.map.clear();
    }

    // next<TInput>(input: TInput): this {
    //     if (this._inputs[0] != input) {
    //         this._inputs.unshift(input);
    //         this.onNext(input);
    //     }
    //     return this;
    // }

    // protected onNext(data: any) {
    //     this._next$.next(data);
    // }

    // first<TInput>(): TInput {
    //     return this._inputs[this._inputs.length - 1]
    // }

    // last<TInput>(): TInput {
    //     return this._inputs[0];
    // }

    // onDestroy(): void {
    //     this._inputs = [];
    //     this.destory$.next();
    //     this.destory$.complete();

    // }
}
