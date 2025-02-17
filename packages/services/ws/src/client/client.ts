import { Injectable, isString } from '@tsdi/ioc';
import { Context } from '@tsdi/core';
import { ResponseEvent, Pattern, RequestInitOpts, UrlRequestOptions } from '@tsdi/common';
import { ServiceUnavailableExecption, ev } from '@tsdi/common/transport';
import { AbstractClient, ClientTransport, ClientTransportFactory } from '@tsdi/common/client';
import { Observable } from 'rxjs';
import { WebSocket, createWebSocketStream } from 'ws';
import { WsHandler } from './handler';
import { WsClientOpts } from './options';
import { WsRequest } from './request';


/**
 * ws client.
 */
@Injectable()
export class WsClient extends AbstractClient<UrlRequestOptions, WsRequest<any>, ResponseEvent<any>, WsClientOpts> {
    private socket?: WebSocket | null;
    private session?: ClientTransport | null;

    constructor(readonly handler: WsHandler) {
        super();
    }

    protected connect(): Observable<any> {
        return new Observable<ClientTransport>((observer) => {
            const options = this.getOptions();
            if (!this.socket) {
                this.socket = new WebSocket(options.url!, options.connectOpts);
            }

            const onOpen = () => {
                if (!this.session) {
                    const socket = options.enableStream ? createWebSocketStream(this.socket!) : this.socket;
                    const factory = this.handler.injector.get(ClientTransportFactory);
                    this.session = factory.create(this.handler.injector, socket, options);
                }
                observer.next(this.session);
                observer.complete();
            }
            const onClose = (code: number, reason: Buffer) => {
                observer.error(new ServiceUnavailableExecption(reason?.toString(), code))
            }
            const onError = (err: any) => {
                observer.error(err);
            }
            this.socket.on(ev.OPEN, onOpen)
                .on(ev.CLOSE, onClose)
                .on(ev.ERROR, onError);

            if (this.socket.readyState == this.socket.OPEN) {
                if (this.session) {
                    observer.next(this.session);
                    observer.complete();
                }
            } else if (this.socket.readyState != this.socket.CONNECTING) {
                this.socket.resume()
            }

            return () => {
                if (this.socket) {
                    this.socket.off(ev.OPEN, onOpen)
                        .off(ev.CLOSE, onClose)
                        .off(ev.ERROR, onError)
                }
            }
        });
    }

    protected async onShutdown(): Promise<void> {
        if (!this.socket) return;
        await this.session?.destroy?.();
        this.socket.close();
        this.socket.removeAllListeners();
        this.socket = null;
    }


    protected createRequest(pattern: Pattern, options: RequestInitOpts<any, UrlRequestOptions>): WsRequest<any> {
        if (isString(pattern)) {
            return new WsRequest(pattern, null, options);
        } else {
            return new WsRequest(this.formatter.format(pattern), pattern, options);
        }
    }

    protected initContext(context: Context): void {
        context.set(WsClient, this);
        context.set(ClientTransport, this.session);
    }

}
