import { Inject, Injectable, InvocationContext, isPlainObject } from '@tsdi/ioc';
import { Client, TRANSPORT_SESSION, TransportEvent, TransportRequest, TransportSession } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logs';
import { NatsConnection, connect } from 'nats';
import { NatsHandler } from './handler';
import { NATS_CLIENT_OPTS, NatsClientOpts } from './options';
import { NatsTransportSessionFactory } from '../transport';


@Injectable({ static: false })
export class NatsClient extends Client<TransportRequest, TransportEvent> {
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
        for await (const status of conn.status()) {
            const data = isPlainObject(status.data)
                ? JSON.stringify(status.data)
                : status.data;

            switch (status.type) {
                case 'error':
                case 'disconnect':
                    this.logger.error(
                        `NatsError: type: "${status.type}", data: "${data}".`,
                    );
                    break;

                case 'pingTimer':
                    if (this.options.debug) {
                        this.logger.debug(
                            `NatsStatus: type: "${status.type}", data: "${data}".`,
                        );
                    }
                    break;

                default:
                    this.logger.log(
                        `NatsStatus: type: "${status.type}", data: "${data}".`,
                    );
                    break;
            }
        }
        this._session = this.handler.injector.get(NatsTransportSessionFactory).create(conn, { ...this.options.transportOpts });
    }

    protected initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(TRANSPORT_SESSION, this._session)
    }

    protected async onShutdown(): Promise<void> {
        this.conn?.close();
    }

}
