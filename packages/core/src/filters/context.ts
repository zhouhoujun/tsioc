import { DefaultInvocationContext, EMPTY, OperationArgumentResolver } from '@tsdi/ioc';
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
        if (!this.arguments) return EMPTY;
        return this.injector.get(getResolversToken(this.arguments), EMPTY);
    }

    protected override clear(): void {
        super.clear();
        this.execption = null;
    }

}
