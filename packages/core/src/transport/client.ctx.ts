import { Injector, InvokeArguments } from '@tsdi/ioc';
import { TransportClient } from './client';
import { RequestContext } from './context';


/**
 * response option for request.
 */
export interface ClientInvocationOptions extends InvokeArguments {
    observe?: 'body' | 'events' | 'response';
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
}


/**
 * clinet context.
 */
export class ClientContext extends RequestContext {
    /**
     * instance of TransportClient.
     */
    readonly target: TransportClient;
    readonly observe: 'body' | 'events' | 'response';
    responseType: 'arraybuffer' | 'blob' | 'json' | 'text';

    constructor(injector: Injector, target: TransportClient, options?: ClientInvocationOptions) {
        super(injector, options);
        this.target = target;
        this.observe = options?.observe ?? 'body';
        this.responseType = options?.responseType ?? 'json';
    }

}
