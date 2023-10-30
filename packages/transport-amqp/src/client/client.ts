import { Inject, Injectable, InvocationContext, lang } from '@tsdi/ioc';
import { TransportRequest } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logger';
import {  Client, TRANSPORT_SESSION, TransportSession, ev } from '@tsdi/transport';
import * as amqp from 'amqplib';
import { AMQP_CLIENT_OPTS, AmqpClientOpts } from './options';
import { AmqpHandler } from './handler';
import { AmqpTransportSessionFactory } from '../transport';


@Injectable({ static: false })
export class AmqpClient extends Client<TransportRequest, number> {

    @InjectLog()
    private logger!: Logger;
    private _conn: amqp.Connection | null = null;
    private _channel: amqp.Channel | null = null;
    private _session?: TransportSession<amqp.Channel>;

    constructor(
        readonly handler: AmqpHandler,
        @Inject(AMQP_CLIENT_OPTS) private options: AmqpClientOpts) {
        super()

        const transportOpts = this.options.transportOpts ?? {};
        if (!transportOpts.replyQueue) {
            transportOpts.replyQueue = transportOpts.queue + '.reply'
        }
    }

    private _connected?: Promise<void>;
    protected connect(): Promise<void> {
        if (this._connected) return this._connected;
        return this._connected = this.connecting();
    }

    protected async connecting(): Promise<void> {

        if (!this._conn) {
            this._conn = await this.createConnection(this.options.retryAttempts || 3, this.options.retryDelay ?? 3000);
        }

        const onError = (err: any) => {
            this.logger.error(err);
        };

        const onDisConnect = (err: any) => {
            this.logger.error('Disconnected from rmq. Try to reconnect.');
            this.logger.error(err)
            this.connecting();
        };
        const onClose = (err?: any) => {
            err && this.logger.error(err);
        }

        this._conn.on(ev.CLOSE, onClose);
        this._conn.on(ev.ERROR, onError);
        this._conn.on(ev.DISCONNECT, onDisConnect);

        await this.setupChancel(this._conn);

    }

    protected async setupChancel(conn: amqp.Connection) {
        this._channel = await conn.createChannel();
        const transportOpts = this.options.transportOpts!;

        if (!transportOpts.noAssert) {
            // await chl.assertQueue(transportOpts.queue, transportOpts.queueOpts);
            await this._channel.assertQueue(transportOpts.replyQueue!, transportOpts.queueOpts)
        }
        await this._channel.prefetch(transportOpts.prefetchCount || 0, transportOpts.prefetchGlobal);

        await this._channel.consume(transportOpts.replyQueue!, msg => {
            if (!msg || !this._channel) return;
            this._channel.emit(ev.CUSTOM_MESSAGE, transportOpts.replyQueue, msg)
        }, {
            noAck: true,
            ...transportOpts.consumeOpts
        });

        this._session = this.handler.injector.get(AmqpTransportSessionFactory).create(this._channel, this.options.transportOpts!);
    }

    protected async createConnection(retrys: number, retryDelay: number): Promise<amqp.Connection> {
        try {
            if (retrys) {
                const conn = await amqp.connect(this.options.connectOpts!);
                return conn;
            }
        } catch (err) {
            if (retrys) return await lang.delay(retryDelay).then(() => this.createConnection(retrys - 1, retryDelay));
            throw err
        }
        return null!
    }

    protected override initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(TRANSPORT_SESSION, this._session);
    }

    protected async onShutdown(): Promise<void> {
        this._session?.destroy();
        await this._channel?.close();
        await this._conn?.close();
        this._channel = this._conn = null;
    }

}

