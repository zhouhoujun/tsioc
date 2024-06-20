import { DefaultInvocationContext, EMPTY, EMPTY_OBJ, Injector, InvokeArguments, OperationArgumentResolver, getClass } from '@tsdi/ioc';
import { getResolversToken } from './resolver';
import { BehaviorSubject, Observable, Subject, filter, takeUntil } from 'rxjs';

/**
 * handler context options.
 */
export interface HanlerContextOpts<T = any> extends InvokeArguments<T> {
    bootstrap?: boolean;
}

/**
 * invoke handler context.
 */
export class HandlerContext<TInput = any> extends DefaultInvocationContext<TInput> {
    readonly bootstrap: boolean;
    constructor(
        injector: Injector,
        options: HanlerContextOpts<TInput> = EMPTY_OBJ) {
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
        if (!this.args) return EMPTY;
        return this.injector.get(getResolversToken(this.args), this.playloadDefaultResolvers());
    }

    protected playloadDefaultResolvers(): OperationArgumentResolver<any>[] {
        return EMPTY
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

    private destory$ = new Subject<void>();
    private _next$ = new BehaviorSubject<any>(null);
    private _inputs: any[];
    readonly changed: Observable<any>;

    get inputs(): any[] {
        return this._inputs;
    }

    constructor() {
        this._inputs = [];
        this.changed = this._next$.pipe(
            takeUntil(this.destory$),
            filter(r => r !== null)
        )
    }

    next<TInput>(input: TInput): this {
        if (this._inputs[0] != input) {
            this._inputs.unshift(input);
            this.onNext(input);
        }
        return this;
    }

    protected onNext(data: any) {
        this._next$.next(data);
    }

    first<TInput>(): TInput {
        return this._inputs[this._inputs.length - 1]
    }

    last<TInput>(): TInput {
        return this._inputs[0];
    }

    onDestroy(): void {
        this._inputs = [];
        this.destory$.next();
        this.destory$.complete();

    }
}
