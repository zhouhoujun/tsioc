import { Client, TransportEvent, TransportRequest } from '@tsdi/core';
import { EMPTY_OBJ, Inject, Injectable, InvocationContext, lang } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logs';
import { ev } from '@tsdi/transport';
import { from, map, Observable, Observer } from 'rxjs';
import * as amqp from 'amqplib';
import { AMQP_CHANNEL, AMQP_CLIENT_OPTS, AmqpClientOpts } from './options';
import { AmqpHandler } from './handler';
import { AmqpSessionOpts } from '../options';



@Injectable({ static: false })
export class AmqpClient extends Client<TransportRequest, TransportEvent> {

    @InjectLog()
    private logger!: Logger;

    private _connected = false;
    private _conn: amqp.Connection | null = null;
    private _channel: amqp.Channel | null = null;
    constructor(
        readonly handler: AmqpHandler,
        @Inject(AMQP_CLIENT_OPTS) private options: AmqpClientOpts) {
        super()

        const transportOpts = this.options.transportOpts ?? {};
        if (!transportOpts.replyQueue) {
            transportOpts.replyQueue = transportOpts.queue + '.reply'
        }
    }

    protected connect(): Observable<amqp.Channel> {

        return new Observable((observer) => {

            const onError = (err: any) => {
                this._connected = false;
                this.logger.error(err);
                observer.error(err);
            };

            const onConnect = () => {
                this._connected = true;
                observer.complete();
            };

            const onDisConnect = (err: any) => {
                this.logger.error('Disconnected from rmq. Try to reconnect.');
                this.logger.error(err)
                connecting();
            };
            const onClose = (err?: any) => {
                err && this.logger.error(err);
            }

            const connecting = async () => {
                try {
                    if (!this._conn) {
                        this._conn = await this.createConnection(observer, this.options.retryAttempts || 3, this.options.retryDelay ?? 3000);
                    }
                    this._conn.on(ev.CONNECT, onConnect);
                    this._conn.on(ev.CLOSE, onClose);
                    this._conn.on(ev.ERROR, onError);
                    this._conn.on(ev.DISCONNECT, onDisConnect);

                    this._channel = await this._conn.createChannel();
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
                    this._connected = true;

                    observer.next();
                    observer.complete();

                } catch (err) {
                    onError(err)
                }

            };

            connecting();

            return () => {
                if (!this._conn) return;
                this._conn.off(ev.CONNECT, onConnect);
                this._conn.off(ev.ERROR, onError);
                this._conn.off(ev.CLOSE, onClose);
                this._conn.off(ev.DISCONNECT, onDisConnect);
            };
        });

    }

    protected async createConnection(observer: Observer<any>, retrys: number, retryDelay: number): Promise<amqp.Connection> {
        try {
            if (retrys) {
                const conn = await amqp.connect(this.options.connectOpts!);
                this._connected = true;
                return conn;
            }
        } catch (err) {
            if (retrys) return await lang.delay(retryDelay).then(() => this.createConnection(observer, retrys - 1, retryDelay));
            observer.error(err);
        }
        return null!
    }

    protected override initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(AMQP_CHANNEL, this._channel);
    }

    protected async onShutdown(): Promise<void> {
        await this._channel?.close();
        await this._conn?.close();
        this._channel = this._conn = null;
    }

}

