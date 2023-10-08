import { Inject, Injectable, InvocationContext } from '@tsdi/ioc';
import { TransportRequest, ServiceUnavailableExecption, ev, TransportSessionFactory, TransportSession } from '@tsdi/common';
import { CLIENTS, Client, TransportBackend } from '@tsdi/common/client';
import { DuplexTransportSessionFactory, defaultMaxSize } from '@tsdi/endpoints';
import { Observable } from 'rxjs';
import { WebSocket, createWebSocketStream } from 'ws';
import { WsHandler } from './handler';
import { WS_CLIENT_FILTERS, WS_CLIENT_INTERCEPTORS, WS_CLIENT_OPTS, WsClientOpts } from './options';


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
                    this.session = factory.create(socket, 'ws', this.options.transportOpts);
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
        context.setValue(TransportSession, this.session);
    }

}


/**
 * WS client default options.
 */
const defaultOpts = {
    url: 'ws://localhost:3000',
    transportOpts: {
        delimiter: '#',
        maxSize: defaultMaxSize,
    },
    interceptorsToken: WS_CLIENT_INTERCEPTORS,
    filtersToken: WS_CLIENT_FILTERS,
    backend: TransportBackend,
    sessionFactory: DuplexTransportSessionFactory
} as WsClientOpts;


CLIENTS.register('ws', {
    clientType: WsClient,
    clientOptsToken: WS_CLIENT_OPTS,
    hanlderType: WsHandler,
    defaultOpts
});