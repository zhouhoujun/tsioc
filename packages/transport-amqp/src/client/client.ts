import { Client, TransportEvent, TransportRequest } from '@tsdi/core';
import { EMPTY_OBJ, Inject, Injectable } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logs';
import { ev } from '@tsdi/transport';
import { from, map, Observable } from 'rxjs';
import * as amqp from 'amqplib';
import { AMQP_CLIENT_OPTS, AmqpClientOpts } from './options';
import { AmqpHandler } from './handler';



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
                observer.next(this._channel!);
                observer.complete();
            };

            const onConnectFailed = () => {
                this._connected = false;
            };


            (async () => {
                try {
                    if (!this._conn) {
                        this._conn = await amqp.connect(this.options.connectOpts!);
                    }
                    this._conn.on(ev.CONNECT, onConnect);
                    this._conn.on(ev.ERROR, onError);
                    this._conn.on(ev.DISCONNECT, onError);
                    this._conn.on(ev.CONNECT_FAILED, onConnectFailed);

                    const chl = this._channel = await this._conn.createChannel();
                    const transportOpts = this.options.transportOpts ?? EMPTY_OBJ;

                    if (!transportOpts.noAssert) {
                        await chl.assertQueue(transportOpts.queue!, transportOpts.queueOpts)
                    }
                    await chl.prefetch(transportOpts.prefetchCount || 0, transportOpts.prefetchGlobal);

                    onConnect();

                } catch (err) {
                    onError(err)
                }

            })()

            return () => {
                if (!this._conn) return;
                this._conn.off(ev.ERROR, onError);
                this._conn.off(ev.DISCONNECT, onError);
                this._conn.off(ev.CONNECT_FAILED, onConnectFailed);
            };
        });

    }
    protected async onShutdown(): Promise<void> {
        await this._channel?.close();
        await this._conn?.close();
        this._channel = null;
        this._conn = null;
    }

    protected createConnection(opts: AmqpClientOpts): Observable<amqp.Connection> {
        return from(amqp.connect(opts.connectOpts!))
            .pipe(
                map(conn => {
                    return conn;
                })
            );
    }

}

