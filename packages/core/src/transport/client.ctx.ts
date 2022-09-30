import { Injector, InvokeArguments } from '@tsdi/ioc';
import { Client } from './client';
import { ClientEndpointContext } from './context';
import { TransportStrategy } from './strategy';


/**
 * response option for request.
 */
export interface ClientInvocationOptions extends InvokeArguments {
    observe?: 'body' | 'events' | 'response';
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
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
    responseType: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';

    constructor(injector: Injector, target: Client, readonly transport: TransportStrategy, options?: ClientInvocationOptions) {
        super(injector, options);
        this.target = target;
        this.observe = options?.observe ?? 'body';
        this.responseType = options?.responseType ?? 'json';

    }

}
