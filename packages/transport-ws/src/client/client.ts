import { Client, ServiceUnavailableExecption, TransportRequest } from '@tsdi/core';
import { Inject, Injectable, InvocationContext } from '@tsdi/ioc';
import { ev } from '@tsdi/transport';
import { Observable } from 'rxjs';
import { WebSocket } from 'ws';
import { WsHandler } from './handler';
import { WS_CLIENT_OPTS, WsClientOpts } from './options';
import { WsTransportSession, WsTransportSessionFactory } from '../transport';



@Injectable({ static: false })
export class WsClient extends Client<TransportRequest, number> {
    private socket?: WebSocket | null;
    private session?: WsTransportSession | null;

    constructor(
        readonly handler: WsHandler,
        @Inject(WS_CLIENT_OPTS) private options: WsClientOpts) {
        super();
    }

    protected connect(): Observable<any> {
        return new Observable<WsTransportSession>((observer) => {
            if (!this.socket) {
                this.socket = new WebSocket(this.options.url!, this.options.connectOpts);
                this.session = null;
            }

            const onOpen = () => {
                if (!this.session) {
                    this.session = this.handler.injector.get(WsTransportSessionFactory).create(this.socket!, this.options.transportOpts!);
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
        if(!this.socket) return;
        this.session?.destroy();
        this.socket.terminate();
        // this.socket.close();
        this.socket.removeAllListeners();
        this.socket = null;
    }

    protected initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(WsTransportSession, this.session)
    }

}
