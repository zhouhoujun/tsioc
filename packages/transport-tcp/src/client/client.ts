import { Inject, Injectable, InvocationContext, promisify } from '@tsdi/ioc';
import { Client, Pattern, TransportRequest, RequestInitOpts, TransportSession, TRANSPORT_SESSION } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logs';
import { LOCALHOST, ev } from '@tsdi/transport';
import { Observable } from 'rxjs';
import * as net from 'net';
import * as tls from 'tls';
import { TCP_CLIENT_OPTS, TcpClientOpts } from './options';
import { TcpHandler } from './handler';
import { TcpTransportSessionFactory } from '../transport';


/**
 * TcpClient. client of  `tcp` or `ipc`. 
 */
@Injectable({ static: false })
export class TcpClient extends Client<TransportRequest, number> {

    @InjectLog()
    private logger!: Logger;

    private connection!: tls.TLSSocket | net.Socket;
    private _session?: TransportSession<tls.TLSSocket | net.Socket>;

    constructor(
        readonly handler: TcpHandler,
        @Inject(TCP_CLIENT_OPTS) private options: TcpClientOpts) {
        super();
        if(!options.connectOpts) {
            options.connectOpts = {
                port: 3000,
                host: LOCALHOST
            }
        }
    }

    protected connect(): Observable<tls.TLSSocket | net.Socket> {
        return new Observable<tls.TLSSocket | net.Socket>((observer) => {
            const valid = this.connection && this.isValid(this.connection);
            if (!valid) {
                if (this.connection) this.connection.removeAllListeners();
                this.connection = this.createConnection(this.options);
            }
            let cleaned = false;
            const conn = this.connection;
            const onError = (err: any) => {
                this.logger?.error(err);
                observer.error(err);
            }
            const onConnect = () => {
                observer.next(conn);
                observer.complete();
            }
            const onClose = () => {
                conn.end();
                observer.complete();
            }
            conn.on(ev.ERROR, onError)
                .on(ev.DISCONNECT, onError)
                .on(ev.END, onClose)
                .on(ev.CLOSE, onClose);

            if (valid) {
                onConnect()
            } else {
                conn.on(ev.CONNECT, onConnect)
            }

            return () => {
                if (cleaned) return;
                cleaned = true;
                conn.off(ev.CONNECT, onConnect)
                    .off(ev.ERROR, onError)
                    .off(ev.DISCONNECT, onError)
                    .off(ev.END, onClose)
                    .off(ev.CLOSE, onClose);
            }
        });
    }

    protected override initContext(context: InvocationContext): void {
        context.setValue(Client, this);
        context.setValue(TRANSPORT_SESSION, this._session);
    }

    protected override createRequest(pattern: Pattern, options: RequestInitOpts): TransportRequest<any> {
        options.withCredentials = this.connection instanceof tls.TLSSocket;
        return new TransportRequest(pattern, options);
    }

    protected override async onShutdown(): Promise<void> {
        if (!this.connection || this.connection.destroyed) return;
        this._session?.destroy();
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
        this._session = this.handler.injector.get(TcpTransportSessionFactory).create(socket, opts.transportOpts);
        return socket
    }

}

