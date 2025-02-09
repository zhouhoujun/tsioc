import { Execption, Injectable } from '@tsdi/ioc';
import { defaultFormatter, PatternFormatter } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logger';
import { getRouter, RequestContext, Server, ServerTransport, ServerTransportFactory } from '@tsdi/endpoints';
import { NatsConnection, Subscription, SubscriptionOptions, connect } from 'nats';
import { NatsRequestHandler } from './handler';
import { NatsMicroServOpts } from './options';



@Injectable()
export class NatsServer extends Server<RequestContext, NatsMicroServOpts> {
    private conn?: NatsConnection;
    private _transport?: ServerTransport;

    private subjects: Set<string> = new Set();
    private subscribes: Subscription[] | null = [];
    // private events = new EventEmitter();

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
        const router = getRouter(injector, options.protocol ?? 'nats', true);
        if (options.content?.prefix) {
            const content = injector.get(PatternFormatter, defaultFormatter).format(`${options.content.prefix}.>`);
            router.matcher.register(content, true);
        }


        const conn = this.conn;
        const subs = router.matcher.getPatterns();

        const transport = this._transport = injector.get(ServerTransportFactory).create(injector, conn, options);
        
        subs.map(sub => {
            session.subscribe(sub, options.subscriptionOpts)
        });

        this.logger.info(
            `Subscribed successfully! This server is currently subscribed topics.`,
            subs
        );

    }

    protected subscribe(subject: string, opts?: SubscriptionOptions) {
        if (this.conn && subject && !this.subjects.has(subject)) {
            this.subjects.add(subject);
            this.conn.subscribe(subject, {
                ...opts,
                callback: (err: any, msg: Msg) => {
                    this.events.emit(ev.MESSAGE, err, msg);
                }
            });
        }
    }


    protected async onShutdown(): Promise<any> {
        if (!this.conn) return;
        await this._transport?.destroy();
        if (this.conn) await this.conn.close();
        this.logger.info(`Nats microservice closed!`);
        this.conn = null!;
    }
}
