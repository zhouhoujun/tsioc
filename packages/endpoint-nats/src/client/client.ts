import { Inject, Injectable, InvocationContext } from '@tsdi/ioc';
import { PatternFormatter, TransportRequest, TransportSession } from '@tsdi/common';
import { Client, CLIENTS, TopicTransportBackend } from '@tsdi/common/client';
import { InjectLog, Logger } from '@tsdi/logger';
import { NatsConnection, connect } from 'nats';
import { NatsHandler } from './handler';
import { NATS_CLIENT_FILTERS, NATS_CLIENT_INTERCEPTORS, NATS_CLIENT_OPTS, NatsClientOpts } from './options';
import { NatsTransportSessionFactory } from '../nats.session';
import { defaultMaxSize } from '@tsdi/endpoints';
import { NatsPatternFormatter } from '../pattern';


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
        this._session = this.handler.injector.get(NatsTransportSessionFactory).create(conn, 'nats', { ...this.options.transportOpts });
    }

    protected initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(TransportSession, this._session)
    }

    protected async onShutdown(): Promise<void> {
        this.conn?.close();
    }

}


const defaultOpts = {
    encoding: 'utf8',
    interceptorsToken: NATS_CLIENT_INTERCEPTORS,
    filtersToken: NATS_CLIENT_FILTERS,
    backend: TopicTransportBackend,
    transportOpts: {
        delimiter: '#',
        maxSize: defaultMaxSize,
    },
    sessionFactory: NatsTransportSessionFactory,
    providers: [{ provide: PatternFormatter, useClass: NatsPatternFormatter }]
} as NatsClientOpts;


CLIENTS.register('nats', {
    clientType: NatsClient,
    clientOptsToken: NATS_CLIENT_OPTS,
    hanlderType: NatsHandler,
    defaultOpts,
    providers: [
        NatsPatternFormatter
    ]
});