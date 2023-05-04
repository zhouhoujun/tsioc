import { Inject, Injectable, InvocationContext, promisify } from '@tsdi/ioc';
import { Client, Pattern, SOCKET, TransportEvent, TransportRequest, RequestInitOpts } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logs';
import { ev } from '@tsdi/transport';
import { Observable, of } from 'rxjs';
import * as net from 'net';
import * as tls from 'tls';
import { TCP_CLIENT_OPTS, TcpClientOpts } from './options';
import { TcpHandler } from './handler';


/**
 * TcpClient. client of  `tcp` or `ipc`. 
 */
@Injectable({ static: false })
export class TcpClient extends Client<TransportRequest, TransportEvent> {

    @InjectLog()
    private logger!: Logger;

    private options: TcpClientOpts;
    constructor(readonly handler: TcpHandler, @Inject(TCP_CLIENT_OPTS, {nullable: true}) options: TcpClientOpts) {
        super();
        this.options = { ...options };
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

    protected override initContext(context: InvocationContext): void {
        context.setValue(Client, this);
        context.setValue(SOCKET, this.connection);
    }

    protected override createRequest(pattern: Pattern, options: RequestInitOpts): TransportRequest<any> {
        options.withCredentials = this.connection instanceof tls.TLSSocket;
        return new TransportRequest(pattern, options);
    }

    protected override async onShutdown(): Promise<void> {
        await promisify<void, Error>(this.connection.destroy, this.connection)(null!)
            .catch(err => {
                this.logger?.error(err);
                return err;
            });
    }

    protected isValid(connection: tls.TLSSocket | net.Socket): boolean {
        return !connection.destroyed && connection.closed !== true
    }

    protected createConnection(opts: TcpClientOpts): tls.TLSSocket | net.Socket {
        const socket = (opts.connectOpts as tls.ConnectionOptions).cert ? tls.connect(opts.connectOpts as tls.ConnectionOptions) : net.connect(opts.connectOpts as net.NetConnectOpts);
        if (opts.keepalive) {
            socket.setKeepAlive(true, opts.keepalive);
        }
        return socket
    }

}

