import { Inject, Injectable, InvocationContext } from '@tsdi/ioc';
import { TransportRequest, ServiceUnavailableExecption, ev, Pattern, RequestInitOpts, TransportSessionFactory, TransportSession } from '@tsdi/common';
import { MicroClient, Client } from '@tsdi/common/client';
import { Observable } from 'rxjs';
import { WebSocket, createWebSocketStream } from 'ws';
import { WsHandler, WsMicroHandler } from './handler';
import { WS_CLIENT_OPTS, WsClientOpts } from './options';


@Injectable({ static: false })
export class WsMicroClient extends MicroClient {
    private socket?: WebSocket | null;
    private session?: TransportSession | null;

    constructor(readonly handler: WsMicroHandler, @Inject(WS_CLIENT_OPTS) private options: WsClientOpts) {
        super()
    }

    protected connect(): Observable<any> | Promise<any> {
        return new Observable<TransportSession>((observer) => {
            if (!this.socket) {
                this.session?.destroy();
                this.socket = new WebSocket(this.options.url!, this.options.connectOpts);
                this.session = null;
            }

            const onOpen = () => {
                if (!this.session) {
                    const socket = createWebSocketStream(this.socket!);
                    const factory = this.handler.injector.get(TransportSessionFactory);
                    this.session = factory.create(socket, this.options.transportOpts);
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


    protected createRequest(pattern: Pattern, options: RequestInitOpts) {
        throw new Error('Method not implemented.');
    }


    protected async onShutdown(): Promise<void> {
        if (!this.socket) return;
        this.session?.destroy?.();
        this.socket.terminate();
        // this.socket.close();
        this.socket.removeAllListeners();
        this.socket = null;
    }

    protected initContext(context: InvocationContext<any>): void {
        context.setValue(MicroClient, this);
    }

}


@Injectable({ static: false })
export class WsClient extends Client<TransportRequest, number> {
    private socket?: WebSocket | null;
    private session?: TransportSession | null;

    constructor(
        readonly handler: WsHandler,
        @Inject(WS_CLIENT_OPTS) private options: WsClientOpts) {
        super();
    }

    protected connect(): Observable<any> {
        return new Observable<TransportSession>((observer) => {
            if (!this.socket) {
                this.session?.destroy();
                this.socket = new WebSocket(this.options.url!, this.options.connectOpts);
                this.session = null;
            }

            const onOpen = () => {
                if (!this.session) {
                    const socket = createWebSocketStream(this.socket!);
                    const factory = this.handler.injector.get(TransportSessionFactory);
                    this.session = factory.create(socket, this.options.transportOpts);
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
        this.session?.destroy?.();
        this.socket.terminate();
        this.socket.removeAllListeners();
        this.socket = null;
    }

    protected initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(TransportSession, this.session);
    }

}
