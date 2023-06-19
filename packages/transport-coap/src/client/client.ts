import { Client, TransportEvent, TransportRequest } from '@tsdi/core';
import { Inject, Injectable, InvocationContext, promisify } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logs';
import { ev } from '@tsdi/transport';
import { Agent } from 'coap';
import { Observable, of } from 'rxjs';
import { COAP_CLIENT_OPTS, CoapClientOpts } from './options';
import { CoapHandler } from './handler';


/**
 * COAP Client.
 */
@Injectable()
export class CoapClient extends Client<TransportRequest, TransportEvent> {

    @InjectLog()
    private logger!: Logger;

    private _agent?: Agent;
    constructor(
        readonly handler: CoapHandler,
        @Inject(COAP_CLIENT_OPTS) private option: CoapClientOpts) {
        super();
    }

    protected connect(): Observable<any> {
        return of(this.option);
    }

    protected override initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(Agent, this._agent);
    }

    protected async onShutdown(): Promise<void> {
        if (this._agent) await promisify(this._agent.close)();
    }


}
