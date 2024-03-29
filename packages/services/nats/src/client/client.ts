import { Injectable, InvocationContext } from '@tsdi/ioc';
import { TransportEvent, TransportRequest } from '@tsdi/common';
import { Client, ClientTransportSession, ClientTransportSessionFactory } from '@tsdi/common/client';
import { InjectLog, Logger } from '@tsdi/logger';
import { NatsConnection, connect } from 'nats';
import { NatsHandler } from './handler';
import { NatsClientOpts } from './options';


@Injectable()
export class NatsClient extends Client<TransportRequest, TransportEvent, NatsClientOpts> {
    private conn?: NatsConnection;
    private _session?: ClientTransportSession<NatsConnection>;

    @InjectLog()
    private logger!: Logger;

    constructor(readonly handler: NatsHandler) {
        super()
    }


    protected async connect(): Promise<any> {
        if (this.conn) return this.conn;
        const options = this.getOptions();
        const conn = this.conn = await connect(options.connectOpts);
        const transportOpts = options.transportOpts!;
        if(!transportOpts.transport) {
            transportOpts.transport = 'nats';
        }
        this._session = this.handler.injector.get(ClientTransportSessionFactory).create(this.handler.injector, conn, transportOpts);
    }

    protected initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(ClientTransportSession, this._session)
    }

    protected async onShutdown(): Promise<void> {
        await this._session?.destroy();
        this.conn?.close();
    }

}
