import { BASE_RESOLVERS, DefaultInvocationContext, EMPTY, OperationArgumentResolver, Token } from '@tsdi/ioc';
import { MODEL_RESOLVERS } from './model.resolver';
import { getResolversToken } from './resolver';

/**
 * endpoint context.
 */
export class EndpointContext<TInput = any> extends DefaultInvocationContext<TInput> {
    /**
     * execption.
     */
    execption?: any;

    method?: string;

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

    override isSelf(token: Token) {
        return token === EndpointContext;
    }


}
