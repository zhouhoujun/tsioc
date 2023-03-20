import { DefaultInvocationContext } from '@tsdi/ioc';

/**
 * endpoint context.
 */
export class EndpointContext<TInput = any> extends DefaultInvocationContext<TInput> {

    /**
     * execption.
     */
    execption?: any;

    protected override clear(): void {
        super.clear();
        this.execption = null;
    }

}
