import { Execption, Inject, Injectable } from '@tsdi/ioc';
import { PatternFormatter } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logger';
import { MicroRouters, RequestContext, Server } from '@tsdi/endpoints';
import { NatsConnection, connect } from 'nats';
import { NatsRequestHandler } from './handler';
import { NatsMicroServOpts } from './options';
import { NatsServerTransport, NatsServerTransportFactory } from '../nats.session';



@Injectable()
export class NatsServer extends Server<RequestContext, NatsMicroServOpts> {
    private conn?: NatsConnection;
    private _transport?: NatsServerTransport;

    @InjectLog()
    private logger!: Logger;

    constructor(readonly handler: NatsRequestHandler) {
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
        const router = injector.get(MicroRouters).get('nats');
        if (options.content?.prefix) {
            const content = injector.get(PatternFormatter).format(`${options.content.prefix}.>`);
            router.matcher.register(content, true);
        }


        const conn = this.conn;
        const subs = router.matcher.getPatterns();

        const transportOpts = options.transportOpts!;
        
        const session = this._transport = injector.get(NatsServerTransportFactory).create(injector, conn, transportOpts);

        subs.map(sub => {
            session.subscribe(sub, options.transportOpts?.subscriptionOpts)
        });

        this.logger.info(
            `Subscribed successfully! This server is currently subscribed topics.`,
            subs
        );

    }

    protected async onShutdown(): Promise<any> {
        if (!this.conn) return;
        await this._transport?.destroy();
        if (this.conn) await this.conn.close();
        this.logger.info(`Nats microservice closed!`);
        this.conn = null!;
    }
}
