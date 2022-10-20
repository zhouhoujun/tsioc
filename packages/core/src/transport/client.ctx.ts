import { Injector, InvokeArguments } from '@tsdi/ioc';
import { Client } from './client';
import { ClientEndpointContext } from './context';
import { OkStatus, Status } from './status';
import { TransportStrategy } from './strategy';


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
    constructor(injector: Injector, target: Client, readonly transport: TransportStrategy, options?: ClientInvocationOptions) {
        super(injector, options);
        this.target = target;
        this.status = this.get(OkStatus);
        this.observe = options?.observe ?? 'body';
    }

}
