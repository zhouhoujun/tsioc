import { Inject, Injectable, InvocationContext } from '@tsdi/ioc';
import { TransportEvent, TransportRequest } from '@tsdi/common';
import { ServiceUnavailableExecption, ev } from '@tsdi/common/transport';
import { Client, ClientTransportSession, ClientTransportSessionFactory } from '@tsdi/common/client';
import { Observable } from 'rxjs';
import { WebSocket, createWebSocketStream } from 'ws';
import { WsHandler } from './handler';
import { WsClientOpts } from './options';
/**
 * ws client.
 */
@Injectable()
export class WsClient extends Client<TransportRequest, TransportEvent, WsClientOpts> {
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
                    const transportOpts = options.transportOpts!;
                    if(!transportOpts.transport) transportOpts.transport = 'ws';
                    this.session = factory.create(this.handler.injector, socket, transportOpts);
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

    protected initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(ClientTransportSession, this.session);
    }

}
