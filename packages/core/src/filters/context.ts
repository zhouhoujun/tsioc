import { DefaultInvocationContext } from '@tsdi/ioc';

/**
 * endpoint context.
 */
export class EndpointContext extends DefaultInvocationContext {
    /**
     * execption.
     */
    execption?: any;

    protected override clear(): void {
        super.clear();
        this.execption = null;
    }

}
