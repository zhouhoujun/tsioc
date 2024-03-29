import { Execption, Inject, Injectable } from '@tsdi/ioc';
import { PatternFormatter } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logger';
import { MircoServRouters, RequestContext, Server } from '@tsdi/endpoints';
import { NatsConnection, connect } from 'nats';
import { NatsEndpointHandler } from './handler';
import { NatsMicroServOpts } from './options';
import { NatsTransportSession, NatsTransportSessionFactory } from '../nats.session';



@Injectable()
export class NatsServer extends Server<RequestContext, NatsMicroServOpts> {
    private conn?: NatsConnection;
    private _session?: NatsTransportSession;

    @InjectLog()
    private logger!: Logger;

    constructor(readonly handler: NatsEndpointHandler) {
        super()
    }

    protected async connect(): Promise<any> {
        this.conn = await connect(this.getOptions().serverOpts);
    }

    protected async onStart(): Promise<any> {
        await this.connect();
        if (!this.conn) throw new Execption('Nats connection cannot be null');

        const options = this.getOptions();

        const injector = this.handler.injector;
        const router = injector.get(MircoServRouters).get('nats');
        if (options.content?.prefix) {
            const content = injector.get(PatternFormatter).format(`${options.content.prefix}.>`);
            router.matcher.register(content, true);
        }


        const conn = this.conn;
        const subs = router.matcher.getPatterns();
        const transportOpts = options.transportOpts!;
        if(!transportOpts.transport)  transportOpts.transport = 'nats';
        
        const session = this._session = injector.get(NatsTransportSessionFactory).create(injector, conn, transportOpts);

        subs.map(sub => {
            session.subscribe(sub, options.transportOpts?.subscriptionOpts)
        });

        
        // injector.get(RequestHandler).handle(this.endpoint, session, this.logger, options);

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
