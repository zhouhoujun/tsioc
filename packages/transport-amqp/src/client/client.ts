import { Client, TransportEvent, TransportRequest } from '@tsdi/core';
import { Inject, Injectable } from '@tsdi/ioc';
import { from, map, Observable } from 'rxjs';
import * as amqp from 'amqplib';
import { AMQP_CLIENT_OPTS, AmqpClientOpts } from './options';
import { AmqpHandler } from './handler';
import { ev } from '@tsdi/transport';
import { InjectLog, Logger } from '@tsdi/logs';



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
                observer.error(err);
            };
            const onConnect = () => {
                observer.next(this._channel!);
                observer.complete();
            };

            const onConnectFailed = () => {

            };

            Promise.resolve(
                this._conn && this._connected ? this._conn : amqp.connect(this.options.connectOpts!)
            ).then(conn => {
                if (this._conn !== conn) {
                    if(this._conn) this._conn.removeAllListeners();
                    this._connected = true;
                    this._conn = conn;
                }
                this._conn.on(ev.ERROR, onError);
                this._conn.on(ev.DISCONNECT, onError);
                this._conn.on(ev.CONNECT_FAILED, onConnectFailed);
                return this._conn.createChannel();
            }).then(chl => {
                this._channel = chl;
                onConnect();
            })
                .catch(onError)



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

    protected isValid(connection: amqp.Connection): boolean {
        return this._connected
    }

    protected createConnection(opts: AmqpClientOpts): Observable<amqp.Connection> {
        return from(amqp.connect(opts.connectOpts!))
            .pipe(
                map(conn => {
                    return conn;
                })
            );
    }


    // protected override createConnectionEvents(connection: amqp.Connection, observer: Subscriber<amqp.Connection>): Events {
    //     const events = super.createConnectionEvents(connection, observer);
    //     events[ev.DISCONNECT] = (err?: Error) => {
    //         err && observer.error(err);
    //         this.onDisconnected();
    //     }

    //     return events;
    // }

    protected onDisconnected(): void {
        this._connected = false;
    }

    protected onConnected(): void {
        this._connected = true;
    }

}

