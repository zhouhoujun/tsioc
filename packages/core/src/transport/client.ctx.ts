import { Injector, InvokeArguments } from '@tsdi/ioc';
import { TransportClient } from './client';
import { EndpointContext } from './context';

/**
 * clinet context.
 */
export class ClientContext extends EndpointContext {
    /**
     * instance of TransportClient.
     */
    readonly target: TransportClient;

    constructor(injector: Injector, target: TransportClient, options?: InvokeArguments) {
        super(injector, options);
        this.target = target;
    }

}

