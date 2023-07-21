import { Inject, Injectable, InvocationContext } from '@tsdi/ioc';
import { Client, TRANSPORT_SESSION, TransportRequest, TransportSession } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logs';
import { ev } from '@tsdi/transport';
import { NatsConnection, connect } from 'nats';
import { NatsHandler } from './handler';
import { NATS_CLIENT_OPTS, NatsClientOpts } from './options';
import { NatsTransportSessionFactory } from '../transport';


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
        session.logger = this.logger;
        session.on(ev.ERROR, (err) => {
            this.logger.error(err);
        });

    }

    protected initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(TRANSPORT_SESSION, this._session)
    }

    protected async onShutdown(): Promise<void> {
        this.conn?.close();
    }

}
