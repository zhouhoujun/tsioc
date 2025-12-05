import { Injectable, isString, promisify, Context, Injector, getClassRef, Provider } from '@tsdi/ioc';
import { Pattern, LOCALHOST, RequestInitOpts, UrlRequestOptions, TransportConfig, Transport, createRequestHandler } from '@tsdi/common';
import { ev } from '@tsdi/common/transport';
import { AbstractClient, ClientFeatureLike, ClientFeatureKind, makeClientFeature, ClientFeatureFn, ClientTransportFeature, getClientHandlerToken, getClientToken } from '@tsdi/common/client';
import { InjectLog, Logger } from '@tsdi/logger';
import { Observable } from 'rxjs';
import * as net from 'node:net';
import * as tls from 'node:tls';
import { TcpClientConfig } from './options';
import { TcpHandler } from './handler';
import { TcpRequest } from './request';




/**
 * TcpClient. client of  `tcp` or `ipc`. 
 */
@Injectable()
export class TcpClient extends AbstractClient<UrlRequestOptions, TcpRequest<any>> {

    @InjectLog()
    private logger!: Logger;

    private connection!: tls.TLSSocket | net.Socket;
    // private _transport?: ClientTransport<tls.TLSSocket | net.Socket>;

    constructor(
        readonly handler: TcpHandler
    ) {
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
            const valid = this.connection && this.isValid(this.connection as (tls.TLSSocket | net.Socket) & { destroyed: boolean, closed: boolean });
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

    protected override initContext(context: Context): void {
        context.set(TcpClient, this);
        // context.set(ClientTransport, this._transport);
    }

    protected override createRequest(pattern: Pattern, options: RequestInitOpts<any, UrlRequestOptions>): TcpRequest<any> {
        options.withCredentials = this.connection instanceof tls.TLSSocket;
        const defaultMethod = this.getOptions().microservice ? undefined : 'GET';
        if (isString(pattern)) {
            return new TcpRequest(pattern, null, options, defaultMethod);
        } else {
            return new TcpRequest(this.formatter.format(pattern), pattern, options, defaultMethod);
        }
    }

    protected override async onShutdown(): Promise<void> {
        if (!this.connection || this.connection.destroyed) return;
        await this._transport?.destroy();
        await promisify(this.connection.destroy, this.connection)(null!)
            .catch(err => {
                this.logger?.error(err);
                return err;
            });
    }

    protected isValid(connection: (tls.TLSSocket | net.Socket) & { destroyed: boolean, closed: boolean }): boolean {
        return !connection.destroyed && connection.closed !== true
    }

    protected createConnection(opts: TcpClientConfig): tls.TLSSocket | net.Socket {
        const socket = (opts.connectOpts as tls.ConnectionOptions).cert ? tls.connect(opts.connectOpts as tls.ConnectionOptions) : net.connect(opts.connectOpts as net.NetConnectOpts);
        if (opts.keepalive) {
            socket.setKeepAlive(true, opts.keepalive);
        }
        this._transport = this.handler.context.get(ClientTransportFactory).create(this.handler.context, socket, opts);
        return socket
    }

}


export function withTcpClientTransport(...options: TcpClientConfig[]): ClientTransportFeature[] {
    return options.map(option => {
        const config: TransportConfig = { transport: Transport.TCP, name: option.name, microservice: option.microservice };
        const clientToken = getClientToken(config.transport, config.microservice, config.name);
        const hanlderToken = getClientHandlerToken(config.transport, config.microservice, config.name);
        // const 

        const providers: Provider[] = [
            {
                provide: hanlderToken,
                useFactory: (injector: Injector) => {
                    return createRequestHandler(injector, option)
                }
            },
            {
                provide: clientToken,
                useClass: TcpClient,
                deps: [
                    hanlderToken
                ]
            }
        ];

        if (options.length == 1 || option.asDefault) {
            providers.push({
                provide: TcpClient,
                useExisting: clientToken
            })
        }

        return makeClientFeature(ClientFeatureKind.Transport, providers, config) as ClientTransportFeature;
    });
}