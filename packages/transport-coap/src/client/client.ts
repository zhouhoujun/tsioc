import { Client, TransportRequest } from '@tsdi/core';
import { Inject, Injectable, InvocationContext } from '@tsdi/ioc';
import { COAP_CLIENT_OPTS, CoapClientOpts } from './options';
import { CoapHandler } from './handler';


/**
 * COAP Client.
 */
@Injectable()
export class CoapClient extends Client<TransportRequest, string> {

    constructor(
        readonly handler: CoapHandler,
        @Inject(COAP_CLIENT_OPTS) private option: CoapClientOpts) {
        super();
    }

    protected async connect(): Promise<any> {
    }

    protected override initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
    }

    protected async onShutdown(): Promise<void> {
    }


}
