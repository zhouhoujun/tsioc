import { Execption, Inject, Injectable } from '@tsdi/ioc';
import { Packet, PatternFormatter, MESSAGE, TransportSession, ev } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logger';
import { ExecptionFinalizeFilter, FinalizeFilter, LogInterceptor, MircoServRouters, Server, defaultMaxSize } from '@tsdi/endpoints';
import { Content } from '@tsdi/endpoints/assets';
import { NatsConnection, connect, Subscription as NatsSubs } from 'nats';
import { Subscription, finalize } from 'rxjs';
import { NatsEndpoint } from './endpoint';
import { NATS_SERV_FILTERS, NATS_SERV_GUARDS, NATS_SERV_INTERCEPTORS, NATS_SERV_OPTS, NatsMicroServOpts } from './options';
import { NatsTransportSessionFactory } from '../transport';
import { ExecptionHandlerFilter } from '@tsdi/core';



@Injectable()
export class NatsServer extends Server {
    private conn?: NatsConnection;
    private subscribes: NatsSubs[];
    private _session?: TransportSession<NatsConnection>;

    @InjectLog()
    private logger!: Logger;

    constructor(
        readonly endpoint: NatsEndpoint,
        @Inject(NATS_SERV_OPTS) private options: NatsMicroServOpts
    ) {
        super()
        this.subscribes = [];
    }

    protected async onStartup(): Promise<any> {
        this.conn = await connect(this.options.serverOpts);
    }

    protected async onStart(): Promise<any> {
        if (!this.conn) throw new Execption('Nats connection cannot be null');

        const router = this.endpoint.injector.get(MircoServRouters).get('nats');
        if (this.options.content?.prefix && this.options.interceptors!.indexOf(Content) >= 0) {
            const content = this.endpoint.injector.get(PatternFormatter).format(`${this.options.content.prefix}.>`);
            router.matcher.register(content, true);
        }


        const conn = this.conn;
        const subs = router.matcher.getPatterns();
        const session = this._session = this.endpoint.injector.get(NatsTransportSessionFactory).create(conn, { ... this.options.transportOpts, serverSide: true });

        session.on(ev.ERROR, (err) => {
            this.logger.error(err);
        });

        session.on(ev.MESSAGE, (topic: string, packet: Packet) => {
            this.requestHandler(session, packet)
        });

        subs.map(sub => {
            this.subscribes.push(conn.subscribe(sub, {
                ...this.options.subscriptionOpts,
                callback: (err, msg) => {
                    if (err) {
                        this.logger.error(err);
                    }
                    session.emit(ev.CUSTOM_MESSAGE, err, msg);
                },
            }))
        });
        this.logger.info(
            `Subscribed successfully! This server is currently subscribed topics.`,
            subs
        );

    }


    protected async onShutdown(): Promise<any> {
        if (!this.conn) return;
        this.subscribes.forEach(s => {
            s.unsubscribe()
        });
        this._session?.destroy();
        if (this.conn) await this.conn.close();
        this.logger.info(`Nats microservice closed!`);
        this.conn = null!;
    }


}




const defaultServOpts = {
    transportOpts: {
        maxSize: defaultMaxSize
    },
    content: {
        root: 'public',
        prefix: 'content'
    },
    detailError: true,
    interceptorsToken: NATS_SERV_INTERCEPTORS,
    filtersToken: NATS_SERV_FILTERS,
    guardsToken: NATS_SERV_GUARDS,
    filters: [
        LogInterceptor,
        ExecptionFinalizeFilter,
        ExecptionHandlerFilter,
        FinalizeFilter
    ]
} as NatsMicroServOpts;