import { Injector, InvokeArguments } from '@tsdi/ioc';
import { Client } from './client';
import { ClientEndpointContext } from './context';
import { Status, StatusFactory } from './status';


/**
 * response option for request.
 */
export interface ClientInvocationOptions extends InvokeArguments {
    observe?: 'body' | 'events' | 'response';
}


/**
 * clinet context.
 */
export class ClientContext extends ClientEndpointContext {
    /**
     * instance of TransportClient.
     */
    readonly target: Client;
    readonly observe: 'body' | 'events' | 'response';
    public status: Status;
    constructor(injector: Injector, target: Client, options?: ClientInvocationOptions) {
        super(injector, options);
        this.target = target;
        this.status = injector.get(StatusFactory).create('Ok');
        this.observe = options?.observe ?? 'body';
    }

}
