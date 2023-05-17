import { Client, TransportEvent, TransportRequest } from '@tsdi/core';
import { Inject, Injectable } from '@tsdi/ioc';
import { from, map, Observable } from 'rxjs';
import * as amqp from 'amqplib';
import { AMQP_CLIENT_OPTS, AmqpClientOpts } from './options';
import { AmqpHandler } from './handler';



@Injectable({ static: false })
export class AmqpClient extends Client<TransportRequest, TransportEvent> {
    private _connected = false;
    constructor(
        readonly handler: AmqpHandler,
        @Inject(AMQP_CLIENT_OPTS) options: AmqpClientOpts) {
        super()
    }

    protected connect(): Observable<any> | Promise<any> {
        throw new Error('Method not implemented.');
    }
    protected onShutdown(): Promise<void> {
        throw new Error('Method not implemented.');
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

    protected async createChannel(conn: amqp.Connection) {
        const channel = await conn.createChannel();

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

