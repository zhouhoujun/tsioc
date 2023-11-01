import { DefaultInvocationContext, EMPTY, EMPTY_OBJ, Injector, InvokeArguments, OperationArgumentResolver, getClass } from '@tsdi/ioc';
import { getResolversToken } from './resolver';

/**
 * endpoint invoke options.
 */
export interface EndpointInvokeOpts<T = any> extends InvokeArguments<T> {
    bootstrap?: boolean;
    isDone?(ctx: EndpointContext<T>): boolean;
}

/**
 * endpoint context.
 */
export class EndpointContext<TInput = any> extends DefaultInvocationContext<TInput> {
    private doneFn?: (ctx: EndpointContext<TInput>) => boolean;
    readonly bootstrap: boolean;
    constructor(
        injector: Injector,
        options: EndpointInvokeOpts<TInput> = EMPTY_OBJ) {
        super(injector, options);
        this.bootstrap = options.bootstrap !== false;
        this.doneFn = options.isDone;
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

    sent?: boolean;

    isDone() {
        return this.doneFn ? this.doneFn(this) : false;
    }

    protected override getArgumentResolver(): OperationArgumentResolver<any>[] {
        if (!this.args) return EMPTY;
        return this.injector.get(getResolversToken(this.args), this.playloadDefaultResolvers());
    }

    protected playloadDefaultResolvers(): OperationArgumentResolver<any>[] {
        return EMPTY
    }

    protected override clear(): void {
        super.clear();
        this.execption = null;
    }

}
