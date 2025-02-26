import { Execption, Injectable } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logger';
import { getRouter, RequestContext, Server, ServerTransport, ServerTransportFactory } from '@tsdi/endpoints';
import { connect } from 'nats';
import { NatsRequestHandler } from './handler';
import { NatsServConfig } from './options';
import { Subject } from 'rxjs';
import { NatsSocket } from '../socket';



@Injectable()
export class NatsServer extends Server<RequestContext, NatsServConfig> {
    private socket?: NatsSocket;
    private _transport?: ServerTransport<NatsSocket>;

    private subjects: Set<string> = new Set();
    private destroy$: Subject<void>;

    @InjectLog()
    private logger!: Logger;

    constructor(readonly handler: NatsRequestHandler) {
        super()
        this.destroy$ = new Subject();
    }

    protected async connect(): Promise<any> {
        const conn = await connect(this.getOptions().serverOpts);
        this.socket = new NatsSocket(conn);
    }

    protected async onStart(): Promise<any> {
        await this.connect();
        if (!this.socket) throw new Execption('Nats connection cannot be null');

        const options = this.getOptions();

        const injector = this.handler.injector;
        const router = getRouter(injector, options.protocol ?? 'nats', true);
        if (options.content?.prefix) {
            const content = router.formatter.format(`${options.content.prefix}.>`);
            router.matcher.register(content, true);
        }


        const socket = this.socket;
        const subs = router.matcher.getPatterns();

        const transport = this._transport = injector.get(ServerTransportFactory).create(injector, socket, options);

        subs.map(sub => {
            socket.subscribe(sub, options.subscriptionOpts)
        });

        transport.handle(this.handler, this.destroy$);

        this.logger.info(
            `Subscribed successfully! This server is currently subscribed topics.`,
            subs
        );

    }


    protected async onShutdown(): Promise<any> {
        if (!this.socket) return;
        this.destroy$.next();
        this.destroy$.complete();
        await this._transport?.destroy();
        if (this.socket) await this.socket.close();
        this.logger.info(`Nats microservice closed!`);
        this.socket = null!;
    }
}
