import { DefaultInvocationContext, EMPTY, EMPTY_OBJ, Injector, InvokeArguments, OperationArgumentResolver, getClass } from '@tsdi/ioc';
import { getResolversToken } from './resolver';

/**
 * endpoint invoke options.
 */
export interface EndpointInvokeOpts<T = any> extends InvokeArguments<T> {
    isDone?(ctx: EndpointContext<T>): boolean;
}

/**
 * endpoint context.
 */
export class EndpointContext<TInput = any> extends DefaultInvocationContext<TInput> {

    private doneFn?: (ctx: EndpointContext<TInput>) => boolean
    constructor(
        injector: Injector,
        options: EndpointInvokeOpts<TInput> = EMPTY_OBJ) {
        super(injector, options)
        this.doneFn = options.isDone;
        this.setValue(getClass(this), this);
    }
    /**
     * execption.
     */
    execption?: any;

    sent?: boolean;

    isDone() {
        return this.doneFn ? this.doneFn(this) : false;
    }

    protected override getArgumentResolver(): OperationArgumentResolver<any>[] {
        if (!this.payload) return EMPTY;
        return this.injector.get(getResolversToken(this.payload), this.playloadDefaultResolvers());
    }

    protected playloadDefaultResolvers(): OperationArgumentResolver<any>[] {
        return EMPTY
    }

    protected override clear(): void {
        super.clear();
        this.execption = null;
    }

}
