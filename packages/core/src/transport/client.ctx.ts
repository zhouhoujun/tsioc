import { Injector, InvokeArguments, isFunction, TypeOf } from '@tsdi/ioc';
import { Client } from './client';
import { RequestContext } from './context';
import { ProtocolStrategy } from './protocol';


/**
 * response option for request.
 */
export interface ClientInvocationOptions extends InvokeArguments {
    transport?: TypeOf<ProtocolStrategy>;
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
    readonly target: Client;
    readonly transport: ProtocolStrategy;
    readonly observe: 'body' | 'events' | 'response';
    responseType: 'arraybuffer' | 'blob' | 'json' | 'text';

    constructor(injector: Injector, target: Client, options?: ClientInvocationOptions) {
        super(injector, options);
        this.target = target;
        this.observe = options?.observe ?? 'body';
        this.responseType = options?.responseType ?? 'json';

        if (options?.transport) {
            this.transport = isFunction(options.transport) ? this.get(options.transport) : options.transport;
        } else {
            this.transport = this.get(ProtocolStrategy);
        }
    }

}
