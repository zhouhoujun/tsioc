import { BASE_RESOLVERS, DefaultInvocationContext, EMPTY, EMPTY_OBJ, Injector, InvokeArguments, OperationArgumentResolver, Token } from '@tsdi/ioc';
import { MODEL_RESOLVERS } from './model.resolver';
import { getResolversToken } from './resolver';

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
        return this.injector.get(getResolversToken(this.payload), EMPTY);
    }

    protected override getDefaultResolvers(): OperationArgumentResolver<any>[] {
        const revls = this.injector.get(MODEL_RESOLVERS, EMPTY);
        return revls.length ? [...revls, BASE_RESOLVERS] : BASE_RESOLVERS;
    }

    protected override clear(): void {
        super.clear();
        this.execption = null;
    }

    protected override isSelf(token: Token) {
        return token === EndpointContext;
    }


}
