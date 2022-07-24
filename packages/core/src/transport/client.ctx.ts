import { Injector, InvokeArguments, isFunction, TypeOf } from '@tsdi/ioc';
import { TransportClient } from './client';
import { RequestContext } from './context';
import { Protocol } from './protocol';


/**
 * response option for request.
 */
export interface ClientInvocationOptions extends InvokeArguments {
    protocol?: TypeOf<Protocol>;
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
    readonly protocol: Protocol;
    readonly observe: 'body' | 'events' | 'response';
    responseType: 'arraybuffer' | 'blob' | 'json' | 'text';

    constructor(injector: Injector, target: TransportClient, options?: ClientInvocationOptions) {
        super(injector, options);
        this.target = target;
        this.observe = options?.observe ?? 'body';
        this.responseType = options?.responseType ?? 'json';

        if (options?.protocol) {
            this.protocol = isFunction(options.protocol) ? this.resolve(options.protocol) : options.protocol;
        } else {
            this.protocol = this.get(Protocol);
        }
    }

}
