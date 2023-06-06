import { Client, TransportEvent, TransportRequest } from '@tsdi/core';
import { Inject, Injectable, InvocationContext, promisify } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logs';
import { ev } from '@tsdi/transport';
import { Agent } from 'coap';
import { Observable } from 'rxjs';
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
        return new Observable<Agent>(observer => {
            if (!this._agent) {
                this._agent = new Agent(this.option.connectOpts);
            }

            const onError = (err: any) => {
                this.logger?.error(err);
                observer.error(err);
            }
            const onConnect = () => {
                observer.next(this._agent);
                observer.complete();
            }
            const onClose = () => {
                observer.complete();
            }
            this._agent.on(ev.CONNECT, onConnect)
                .on(ev.ERROR, onError)
                .on(ev.DISCONNECT, onError)
                .on(ev.END, onClose)
                .on(ev.CLOSE, onClose);

            onConnect();

            let cleaned = false;
            return () => {
                if (cleaned) return;
                cleaned = true;
                this._agent?.off(ev.CONNECT, onConnect)
                    .off(ev.ERROR, onError)
                    .off(ev.DISCONNECT, onError)
                    .off(ev.END, onClose)
                    .off(ev.CLOSE, onClose);
            }

        })
    }

    protected override initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(Agent, this._agent);
    }

    protected async onShutdown(): Promise<void> {
        if (this._agent) await promisify(this._agent.close)();
    }


}
