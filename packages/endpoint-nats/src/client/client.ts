import { Inject, Injectable, InvocationContext } from '@tsdi/ioc';
import { TransportRequest, TransportSession } from '@tsdi/common';
import { Client, CLIENTS  } from '@tsdi/common/client';
import { InjectLog, Logger } from '@tsdi/logger';
import { NatsConnection, connect } from 'nats';
import { NatsHandler } from './handler';
import { NATS_CLIENT_OPTS, NatsClientOpts } from './options';
import { NatsTransportSessionFactory } from '../nats.session';


@Injectable({ static: false })
export class NatsClient extends Client<TransportRequest, number> {
    private conn?: NatsConnection;
    private _session?: TransportSession<NatsConnection>;

    @InjectLog()
    private logger!: Logger;

    constructor(
        readonly handler: NatsHandler,
        @Inject(NATS_CLIENT_OPTS) private options: NatsClientOpts) {
        super()
    }


    protected async connect(): Promise<any> {
        if (this.conn) return this.conn;

        const conn = this.conn = await connect(this.options.connectOpts);
        const session = this._session = this.handler.injector.get(NatsTransportSessionFactory).create(conn, { ...this.options.transportOpts });
       

    }

    protected initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(TransportSession, this._session)
    }

    protected async onShutdown(): Promise<void> {
        this.conn?.close();
    }

}
