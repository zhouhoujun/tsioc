import { DefaultInvocationContext, EMPTY,  OperationArgumentResolver, Token } from '@tsdi/ioc';
import { getResolversToken } from './resolver';

/**
 * endpoint context.
 */
export class EndpointContext<TInput = any> extends DefaultInvocationContext<TInput> {
    /**
     * execption.
     */
    execption?: any;

    protected override getArgumentResolver(): OperationArgumentResolver<any>[] {
        if (!this.payload) return EMPTY;
        return this.injector.get(getResolversToken(this.payload), EMPTY);
    }

    protected override clear(): void {
        super.clear();
        this.execption = null;
    }

    override isSelf(token: Token) {
        return token === EndpointContext;
    }


}
