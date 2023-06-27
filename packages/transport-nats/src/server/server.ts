import { MESSAGE, MircoServRouters, Packet, PatternFormatter, Server, TransportSession } from '@tsdi/core';
import { Execption, Inject, Injectable, Token, isPlainObject } from '@tsdi/ioc';
import { NatsConnection, connect, Subscription as NatsSubs } from 'nats';
import { NatsContext } from './context';
import { NatsEndpoint } from './endpoint';
import { InjectLog, Logger } from '@tsdi/logs';
import { NATS_SERV_OPTS, NatsMicroServiceOpts } from './options';
import { Content, ev, hdr } from '@tsdi/transport';
import { NatsTransportSessionFactory } from '../transport';
import { NatsIncoming } from './incoming';
import { NatsOutgoing } from './outgoing';
import { Subscription, finalize } from 'rxjs';


@Injectable()
export class NatsServer extends Server<NatsContext> {
    private conn?: NatsConnection;
    private subscribes: NatsSubs[];
    private _session?: TransportSession<NatsConnection>;

    @InjectLog()
    private logger!: Logger;

    constructor(
        readonly endpoint: NatsEndpoint,
        @Inject(NATS_SERV_OPTS) private options: NatsMicroServiceOpts
    ) {
        super()
        this.subscribes = [];
    }

    protected async onStartup(): Promise<any> {
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
    }

    protected async onStart(): Promise<any> {
        if (!this.conn) throw new Execption('Nats connection cannot be null');

        const router = this.endpoint.injector.get(MircoServRouters).get('nats');
        if (this.options.content?.prefix && this.options.interceptors!.indexOf(Content) >= 0) {
            const content = this.endpoint.injector.get(PatternFormatter).format(`${this.options.content.prefix}/#`);
            router.matcher.register(content, true);
        }


        const conn = this.conn;
        const subs = router.matcher.getPatterns();
        const session = this._session = this.endpoint.injector.get(NatsTransportSessionFactory).create(conn, { ... this.options.transportOpts });

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
    }


    protected async onShutdown(): Promise<any> {
        if (!this.conn) return;
        this.subscribes.forEach(s => {
            s.unsubscribe()
        });
        this._session?.destroy();
        if (this.conn) await this.conn.close();
        this.conn = null!;
    }

    /**
     * request handler.
     * @param observer 
     * @param req 
     * @param res 
     */
    protected requestHandler(session: TransportSession<NatsConnection>, packet: Packet): Subscription {
        if (!packet.method) {
            packet.method = MESSAGE;
        }
        const req = new NatsIncoming(session, packet);
        const res = new NatsOutgoing(session, packet.replyTo!, packet.url!, packet.id);

        const ctx = this.createContext(req, res);
        const cancel = this.endpoint.handle(ctx)
            .pipe(finalize(() => {
                ctx.destroy();
            }))
            .subscribe({
                error: (err) => {
                    this.logger.error(err)
                }
            });
        // const opts = this.options;
        // opts.timeout && req.socket.stream.setTimeout && req.socket.stream.setTimeout(opts.timeout, () => {
        //     req.emit?.(ev.TIMEOUT);
        //     cancel?.unsubscribe()
        // });
        req.once(ev.ABOUT, () => cancel?.unsubscribe())
        return cancel;
    }

    protected createContext(req: NatsIncoming, res: NatsOutgoing): NatsContext {
        const injector = this.endpoint.injector;
        return new NatsContext(injector, req, res, this.options);
    }


}
