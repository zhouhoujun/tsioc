import { Injectable, Context, isString, lang } from '@tsdi/ioc';
import { Pattern, RequestInitOpts, ResponseEvent, TopicRequestOptions } from '@tsdi/common';
import { InjectLog, Logger } from '@tsdi/logger';
import { ev } from '@tsdi/common/transport';
import { AbstractClient, ClientTransport, ClientTransportFactory } from '@tsdi/common/client';
import * as amqp from 'amqplib';
import { AmqpClientConfig } from './options';
import { AmqpHandler } from './handler';
import { AmqpRequest } from './request';


@Injectable()
export class AmqpClient extends AbstractClient<TopicRequestOptions, AmqpRequest<any>, ResponseEvent<any>, AmqpClientConfig> {

    @InjectLog()
    private logger!: Logger;
    private _conn: amqp.Connection | null = null;
    private _channel: amqp.Channel | null = null;
    private _transport?: ClientTransport<amqp.Channel>;

    constructor(readonly handler: AmqpHandler) {
        super()
    }

    private _connected?: Promise<void>;
    protected connect(): Promise<void> {
        if (this._connected) return this._connected;
        return this._connected = this.connecting();
    }

    protected async connecting(): Promise<void> {
        const options = this.getOptions();
        if (!this._conn) {
            this._conn = await this.createConnection(options.retryAttempts || 3, options.retryDelay ?? 3000);
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
        const options = this.getOptions();

        const injector = this.handler.injector;

        if (!options.noAssert) {
            // await chl.assertQueue(transportOpts.queue, transportOpts.queueOpts);
            await this._channel.assertQueue(options.replyQueue!, options.queueOpts)
        }
        await this._channel.prefetch(options.prefetchCount || 0, options.prefetchGlobal);

        await this._channel.consume(options.replyQueue!, msg => {
            if (!msg || !this._channel) return;
            this._channel.emit(ev.MESSAGE, options.replyQueue, msg)
        }, {
            noAck: true,
            ...options.consumeOpts
        });

        this._transport = injector.get(ClientTransportFactory).create(injector, this._channel, options);
    }

    protected async createConnection(retrys: number, retryDelay: number): Promise<amqp.Connection> {
        try {
            if (retrys) {
                const conn = await amqp.connect(this.getOptions().connectOpts!);
                return conn;
            }
        } catch (err) {
            if (retrys) return await lang.delay(retryDelay).then(() => this.createConnection(retrys - 1, retryDelay));
            throw err
        }
        return null!
    }

    protected override initContext(context: Context): void {
        context.set(AbstractClient, this);
        context.set(ClientTransport, this._transport);
    }


    protected createRequest(pattern: Pattern, options: RequestInitOpts<any, TopicRequestOptions>): AmqpRequest<any> {
        return new AmqpRequest(this.formatter.format(pattern), pattern, options);
    }


    protected async onShutdown(): Promise<void> {
        await this._transport?.destroy();
        await this._channel?.close();
        await this._conn?.close();
        this._channel = this._conn = null;
    }

}
