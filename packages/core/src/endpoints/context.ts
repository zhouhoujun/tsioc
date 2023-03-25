import { CONTEXT_PAYLOAD, DefaultInvocationContext, EMPTY, Injector, InvocationOption, OperationArgumentResolver } from '@tsdi/ioc';
import { getResolversToken } from './resolver';
import { primitiveResolvers } from './resolvers';

/**
 * endpoint context.
 */
export class EndpointContext<TInput = any> extends DefaultInvocationContext<TInput> {


    /**
     * set plaload.
     */
    setPayload(val: TInput) {
        this._payload = val;
        this.injector.setValue(CONTEXT_PAYLOAD, this._payload);
    }

    /**
     * execption.
     */
    execption?: any;

    protected override getArgumentResolver(): OperationArgumentResolver<any>[] {
        if (!this.payload) return EMPTY;
        return this.injector.get(getResolversToken(this.payload), primitiveResolvers);
    }

    protected override clear(): void {
        super.clear();
        this.execption = null;
    }

}

/**
 * create invocation context.
 * @param parent 
 * @param options 
 * @returns 
 */
export function createEndpointContext<T>(parent: Injector, options?: InvocationOption<T>): EndpointContext {
    return new EndpointContext(parent, options)
}