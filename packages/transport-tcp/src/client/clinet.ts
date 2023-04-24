import { Client, SOCKET, TransportEvent, TransportRequest } from '@tsdi/core';
import { Injectable, InvocationContext, Nullable, promisify } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logs';
import { Observable, of } from 'rxjs';
import * as net from 'net';
import * as tls from 'tls';
import { TcpClientOpts } from './options';
import { TcpGuardHandler } from './handler';
import { ev } from '@tsdi/transport';


/**
 * TcpClient. client of  `tcp` or `ipc`. 
 */
@Injectable({ static: false })
export class TcpClient extends Client<TransportRequest, TransportEvent> {

    @InjectLog()
    private logger!: Logger;

    private options: TcpClientOpts;
    constructor(readonly handler: TcpGuardHandler, @Nullable() options: TcpClientOpts) {
        super();
        this.options = { ...options }
    }

    private connection!: tls.TLSSocket | net.Socket;
    private $conn?: Observable<tls.TLSSocket | net.Socket> | null;
    protected connect(): Observable<tls.TLSSocket | net.Socket> {
        if (this.connection && this.isValid(this.connection)) {
            return of(this.connection)
        }
        if (this.$conn) return this.$conn;
        return this.$conn = new Observable((sbscriber) => {
            const client = this.createConnection(this.options);

            const onError = (err: any) => {
                this.logger?.error(err);
                sbscriber.error(err);
            }
            const onConnect = () => {
                this.connection = client;
                sbscriber.next(client);
            }
            client.on(ev.ERROR, onError);
            client.on(ev.CONNECT, onConnect)

            return () => {
                client.off(ev.ERROR, onError);
                client.off(ev.CONNECT, onConnect);
            }
        })
    }

    protected override initContext(context: InvocationContext<any>): void {
        super.initContext(context);
        context.setValue(SOCKET, this.connection);
    }

    protected override async onShutdown(): Promise<void> {
        await promisify<void, Error>(this.connection.destroy, this.connection)(null!)
            .catch(err => {
                this.logger?.error(err);
                return err;
            });
    }

    protected isValid(connection: tls.TLSSocket | net.Socket): boolean {
        return !connection.destroyed && !connection.closed
    }

    protected createConnection(opts: TcpClientOpts): tls.TLSSocket | net.Socket {
        const socket = (opts.connectOpts as tls.ConnectionOptions).cert ? tls.connect(opts.connectOpts as tls.ConnectionOptions) : net.connect(opts.connectOpts as net.NetConnectOpts);
        if (opts.keepalive) {
            socket.setKeepAlive(true, opts.keepalive);
        }
        return socket
    }

}

