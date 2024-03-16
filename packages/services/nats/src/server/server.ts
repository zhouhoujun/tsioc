import { Execption, Inject, Injectable } from '@tsdi/ioc';
import { PatternFormatter } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logger';
import { MircoServRouters, RequestHandler, Server } from '@tsdi/endpoints';
import { NatsConnection, connect } from 'nats';
import { NatsEndpointHandler } from './handler';
import { NATS_SERV_OPTS, NatsMicroServOpts } from './options';
import { NatsTransportSession, NatsTransportSessionFactory } from '../nats.session';



@Injectable()
export class NatsServer extends Server {
    private conn?: NatsConnection;
    private _session?: NatsTransportSession;

    @InjectLog()
    private logger!: Logger;

    constructor(
        readonly endpoint: NatsEndpointHandler,
        @Inject(NATS_SERV_OPTS) private options: NatsMicroServOpts
    ) {
        super()
    }

    protected async connect(): Promise<any> {
        this.conn = await connect(this.options.serverOpts);
    }

    protected async onStart(): Promise<any> {
        await this.connect();
        if (!this.conn) throw new Execption('Nats connection cannot be null');

        const injector = this.endpoint.injector;
        const router = injector.get(MircoServRouters).get('nats');
        if (this.options.content?.prefix) {
            const content = injector.get(PatternFormatter).format(`${this.options.content.prefix}.>`);
            router.matcher.register(content, true);
        }


        const conn = this.conn;
        const subs = router.matcher.getPatterns();
        const transportOpts = this.options.transportOpts!;
        if(!transportOpts.serverSide)  transportOpts.serverSide = true;
        if(!transportOpts.transport)  transportOpts.transport = 'nats';
        
        const session = this._session = injector.get(NatsTransportSessionFactory).create(conn, transportOpts);

        subs.map(sub => {
            session.subscribe(sub, this.options.transportOpts?.subscriptionOpts)
        });

        injector.get(RequestHandler).handle(this.endpoint, session, this.logger, this.options);

        this.logger.info(
            `Subscribed successfully! This server is currently subscribed topics.`,
            subs
        );

    }

    protected async onShutdown(): Promise<any> {
        if (!this.conn) return;
        await this._session?.destroy();
        if (this.conn) await this.conn.close();
        this.logger.info(`Nats microservice closed!`);
        this.conn = null!;
    }
}
