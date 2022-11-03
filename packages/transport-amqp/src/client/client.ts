import { ExecptionFilter, Interceptor, RequestOptions, TransportEvent, TransportRequest } from '@tsdi/core';
import { Abstract, Injectable, Nullable, tokenId } from '@tsdi/ioc';
import { ev, Events, TransportClient, TransportClientOpts } from '@tsdi/transport';
import { from, map, Observable, Subscriber } from 'rxjs';
import * as amqp from 'amqplib';


@Abstract()
export abstract class AmqpClientOpts extends TransportClientOpts {
    connectOpts?: amqp.Options.Connect;
}

/**
 * Amqp client interceptors.
 */
export const AMQP_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('AMQP_INTERCEPTORS');

/**
 * Amqp client interceptors.
 */
export const AMQP_EXECPTIONFILTERS = tokenId<ExecptionFilter[]>('AMQP_EXECPTIONFILTERS');


const defaults = {
    encoding: 'utf8',
    interceptorsToken: AMQP_INTERCEPTORS,
    execptionsToken: AMQP_EXECPTIONFILTERS,
} as AmqpClientOpts


@Injectable()
export class AmqpClient extends TransportClient<amqp.Connection, RequestOptions, AmqpClientOpts> {

    private _connected = false;
    constructor(@Nullable() options: any) {
        super(options)
    }

    close(): Promise<void> {
        return this.connection.close()
    }

    protected isValid(connection: amqp.Connection): boolean {
        return this._connected
    }

    protected override getDefaultOptions(): AmqpClientOpts {
        return defaults;
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

    protected override createConnectionEvents(connection: amqp.Connection, observer: Subscriber<amqp.Connection>): Events {
        const events = super.createConnectionEvents(connection, observer);
        events[ev.DISCONNECT] = (err?: Error) => {
            err && observer.error(err);
            this.onDisconnected();
        }

        return events;
    }

    protected onDisconnected(): void {
        this._connected = false;
    }

    protected onConnected(): void {
        this._connected = true;
    }

}

