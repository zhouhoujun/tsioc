import { MESSAGE, MicroService, Packet, TransportSession, TransportSessionFactory } from '@tsdi/core';
import { EMPTY_OBJ, Execption, Inject, Injectable, lang } from '@tsdi/ioc';
import * as amqp from 'amqplib';
import { AMQP_SERV_OPTS, AmqpMicroServiceOpts } from './options';
import { AmqpContext } from './context';
import { AmqpEndpoint } from './endpoint';
import { ContentOptions, ev } from '@tsdi/transport';
import { InjectLog, Logger } from '@tsdi/logs';
import { AmqpIncoming } from './incoming';
import { AmqpOutgoing } from './outgoing';
import { Observer, Subscription, finalize } from 'rxjs';




@Injectable()
export class AmqpServer extends MicroService<AmqpContext> {

    @InjectLog()
    private logger!: Logger;

    private _connected = false;
    private _conn: amqp.Connection | null = null;
    private _channel: amqp.Channel | null = null;

    constructor(
        readonly endpoint: AmqpEndpoint,
        @Inject(AMQP_SERV_OPTS) private options: AmqpMicroServiceOpts) {
        super();

        const transportOpts = this.options.transportOpts ?? {};
        if (!transportOpts.replyQueue) {
            transportOpts.replyQueue = transportOpts.queue + '.reply'
        }
        if (this.options.content) {
            this.endpoint.injector.setValue(ContentOptions, this.options.content);
        }
    }

    protected async onStartup(): Promise<any> {

        const conn = this._conn = await this.createConnection(this.options.retryAttempts || 3, this.options.retryDelay ?? 3000);
        this._connected = true;
        conn.on(ev.CONNECT, () => {
            this._connected = true;
        });
        conn.on(ev.CLOSE, (err) => {
            err && this.logger.error(err);
        });
        conn.on(ev.ERROR, (err) => {
            this.logger.error(err)
        });
        conn.on(ev.DISCONNECT, async (err) => {
            this._connected = false;
            this.logger.error('Disconnected from rmq. Try to reconnect.');
            this.logger.error(err);
            this._conn = await this.createConnection(this.options.retryAttempts || 3, this.options.retryDelay ?? 3000);
            this.onStart();
        });
    }
    protected async onStart(): Promise<any> {

        if (!this._conn) throw new Execption('Amqp Connection has not connected.');

        const channel = this._channel = await this._conn.createChannel();

        const transportOpts = this.options.transportOpts!;
        transportOpts.serverSide = true;

        if (!transportOpts.noAssert) {
            await channel.assertQueue(transportOpts.queue!, transportOpts.queueOpts)
        }
        await channel.prefetch(transportOpts.prefetchCount || 0, transportOpts.prefetchGlobal);

        await channel.consume(transportOpts.queue!, msg => {
            if (!msg) return;
            channel.emit(ev.CUSTOM_MESSAGE, transportOpts.queue, msg)
        }, {
            noAck: true,
            ...transportOpts.consumeOpts
        });
        const session = this.endpoint.injector.get(TransportSessionFactory).create(channel, transportOpts);

        session.on(ev.MESSAGE, (queue: string, packet: Packet) => {
            this.requestHandler(session, queue, packet);
        })
    }

    protected async createConnection(retrys: number, retryDelay: number): Promise<amqp.Connection> {
        try {
            if (retrys) {
                const conn = await amqp.connect(this.options.connectOpts!);
                this._connected = true;
                return conn;
            }
        } catch (err) {
            if (retrys) return await lang.delay(retryDelay).then(() => this.createConnection(retrys - 1, retryDelay));
            throw err;
        }
        return null!
    }


    /**
     * request handler.
     * @param observer 
     * @param req 
     * @param res 
     */
    protected requestHandler(session: TransportSession<amqp.Channel>, queue: string, packet: Packet): Subscription {
        if (!packet.method) {
            packet.method = MESSAGE;
        }
        const req = new AmqpIncoming(session, packet);
        const res = new AmqpOutgoing(session, packet.replyTo!, packet.url!, packet.id);

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
        // opts.timeout && req.socket.setTimeout && req.socket.stream.setTimeout(opts.timeout, () => {
        //     req.emit?.(ev.TIMEOUT);
        //     cancel?.unsubscribe()
        // });
        req.once(ev.ABOUT, () => cancel?.unsubscribe())
        return cancel;
    }

    protected createContext(req: AmqpIncoming, res: AmqpOutgoing): AmqpContext {
        const injector = this.endpoint.injector;
        return new AmqpContext(injector, req, res);
    }

    protected async onShutdown(): Promise<any> {
        await this._channel?.close();
        await this._conn?.close();
        this._channel = this._conn = null;
    }

}
