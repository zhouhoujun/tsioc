import { Injectable, InvocationContext, promisify } from '@tsdi/ioc';
import { TransportRequest, Pattern, LOCALHOST, RequestInitOpts } from '@tsdi/common';
import { ev } from '@tsdi/common/transport';
import { Client, ClientTransportSession, ClientTransportSessionFactory } from '@tsdi/common/client';
import { InjectLog, Logger } from '@tsdi/logger';
import { Observable } from 'rxjs';
import * as net from 'net';
import * as tls from 'tls';
import { TcpClientOpts } from './options';
import { TcpHandler } from './handler';


/**
 * TcpClient. client of  `tcp` or `ipc`. 
 */
@Injectable()
export class TcpClient extends Client<TransportRequest> {

    @InjectLog()
    private logger!: Logger;

    private connection!: tls.TLSSocket | net.Socket;
    private _session?: ClientTransportSession<any, tls.TLSSocket | net.Socket>;

    constructor(readonly handler: TcpHandler) {
        super();
        if (!this.handler.getOptions().connectOpts) {
            this.handler.getOptions().connectOpts = {
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
                this.connection = this.createConnection(this.getOptions());
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
        context.setValue(ClientTransportSession, this._session);
    }

    protected override createRequest(pattern: Pattern, options: RequestInitOpts): TransportRequest<any> {
        options.withCredentials = this.connection instanceof tls.TLSSocket;
        return new TransportRequest(pattern, options);
    }

    protected override async onShutdown(): Promise<void> {
        if (!this.connection || this.connection.destroyed) return;
        await this._session?.destroy();
        await promisify(this.connection.destroy, this.connection)(null!)
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
        const transportOpts = opts.transportOpts!;
        if (!transportOpts.transport) transportOpts.transport = 'tcp';
        this._session = this.handler.injector.get(ClientTransportSessionFactory).create(this.handler.injector, socket, transportOpts);
        return socket
    }

}
