import { DefaultInvocationContext, Injector, InvokeArguments } from '@tsdi/ioc';
import { TransportClient } from './client';
import { EndpointContext } from './context';


export class ClientContext extends DefaultInvocationContext implements EndpointContext {
    /**
     * instance of TransportClient.
     */
    readonly target: TransportClient;

    constructor(injector: Injector, target: TransportClient, options?: InvokeArguments) {
        super(injector, options);
        this.target = target;
    }

    protected override clear(): void {
        super.clear();
        (this as any).target = null;
    }
}

