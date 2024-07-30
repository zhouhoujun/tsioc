import { Injectable, InvocationContext, isString } from '@tsdi/ioc';
import { ResponseEvent, Pattern, RequestInitOpts } from '@tsdi/common';
import { ServiceUnavailableExecption, ev } from '@tsdi/common/transport';
import { AbstractClient, ClientTransportSession, ClientTransportSessionFactory } from '@tsdi/common/client';
import { Observable } from 'rxjs';
import { WebSocket, createWebSocketStream } from 'ws';
import { WsHandler } from './handler';
import { WsClientOpts } from './options';
import { WsRequest } from './request';


/**
 * ws client.
 */
@Injectable()
export class WsClient extends AbstractClient<WsRequest<any>, ResponseEvent<any>, WsClientOpts> {
    private socket?: WebSocket | null;
    private session?: ClientTransportSession | null;

    constructor(readonly handler: WsHandler) {
        super();
    }

    protected connect(): Observable<any> {
        return new Observable<ClientTransportSession>((observer) => {
            const options = this.getOptions();
            if (!this.socket) {
                this.session?.destroy();
                this.socket = new WebSocket(options.url!, options.connectOpts);
                this.session = null;
            }

            const onOpen = () => {
                if (!this.session) {
                    const socket = createWebSocketStream(this.socket!);
                    const factory = this.handler.injector.get(ClientTransportSessionFactory);
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


            if (this.socket.isPaused) {
                // this.session?.destroy();
                // this.session = null;
                this.socket.resume();
            } else if (this.socket.OPEN) {
                onOpen();
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
        this.socket.terminate();
        this.socket.removeAllListeners();
        this.socket = null;
    }


    protected createRequest(pattern: Pattern, options: RequestInitOpts<any>): WsRequest<any> {
        if (isString(pattern)) {
            return new WsRequest(pattern, null, options);
        } else {
            return new WsRequest(this.formatter.format(pattern), pattern, options);
        }
    }

    protected initContext(context: InvocationContext<any>): void {
        context.setValue(AbstractClient, this);
        context.setValue(WsClient, this);
        context.setValue(ClientTransportSession, this.session);
    }

}
