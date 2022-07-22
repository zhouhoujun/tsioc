import { EndpointBackend, OnDispose, Redirector, RequestContext, TransportClient, TransportStatus, UuidGenerator } from '@tsdi/core';
import { EMPTY, Inject, Injectable, InvocationContext, isString, lang, Nullable, Providers } from '@tsdi/ioc';
import { Socket, IpcNetConnectOpts } from 'net';
import { TransportRequest } from '../../request';
import { TransportEvent } from '../../response';
import { JsonDecoder, JsonEncoder } from '../../coder';
import { ev } from '../../consts';
import { TcpPathInterceptor } from './path';
import { TcpClientOpts, TCP_EXECPTIONFILTERS, TCP_INTERCEPTORS } from './options';
import { DetectBodyInterceptor } from '../../interceptors/body';
import { PacketProtocolOpts } from '../packet';
import { TcpBackend } from './backend';
import { AssetRedirector } from '../../redirector';
import { TcpStatus } from './status';




const defaults = {
    delimiter: '\r\n',
    encoding: 'utf8',
    encoder: JsonEncoder,
    decoder: JsonDecoder,
    interceptorsToken: TCP_INTERCEPTORS,
    execptionsToken: TCP_EXECPTIONFILTERS,
} as TcpClientOpts;


/**
 * TcpClient. client of  `tcp` or `ipc`. 
 */
@Injectable()
@Providers([
    { provide: TransportStatus, useClass: TcpStatus, asDefault: true },
    { provide: Redirector, useClass: AssetRedirector, asDefault: true }
])
export class TcpClient extends TransportClient<TransportRequest, TransportEvent> implements OnDispose {

    private socket?: Socket;
    private connected: boolean;
    private option!: TcpClientOpts;
    constructor(
        @Inject() context: InvocationContext,
        @Nullable() option: TcpClientOpts
    ) {
        super(context, option);
        this.connected = false;
    }

    protected override initOption(options?: TcpClientOpts): TcpClientOpts {
        const connectOpts = { ...defaults.connectOpts, ...options?.connectOpts };
        const interceptors = [...options?.interceptors ?? EMPTY, TcpPathInterceptor, DetectBodyInterceptor];
        this.option = { ...defaults, ...options, connectOpts, interceptors };
        this.context.setValue(TcpClientOpts, this.option);
        this.context.setValue(PacketProtocolOpts, this.option);
        return this.option;
    }

    protected getBackend(): EndpointBackend<TransportRequest, TransportEvent> {
        return this.context.resolve(TcpBackend);
    }

    protected async connect(): Promise<void> {
        if (this.connected) return;

        const socket = this.socket ?? new Socket(this.option.socketOpts);
        if (!this.socket) {
            this.socket = socket;
            const closed = () => {
                this.connected = false;
                if (isIPC) {
                    this.logger.info('Disconnected ipc server');
                } else {
                    this.logger.info('Disconnected tcp server', socket.remoteFamily, socket.remoteAddress, socket.remotePort);
                }
            };
            socket.on(ev.CLOSE, closed);
            socket.on(ev.END, closed);
        }
        const defer = lang.defer();
        const isIPC = !!(this.option.connectOpts as IpcNetConnectOpts).path;

        socket.once(ev.ERROR, defer.reject);
        socket.once(ev.CONNECT, () => {
            this.connected = true;
            defer.resolve(true);
            if (isIPC) {
                this.logger.info('Connected ipc server');
            } else {
                this.logger.info('Connected tcp server', socket.remoteFamily, socket.remoteAddress, socket.remotePort);
            }
        });

        this.socket.connect(this.option.connectOpts);
        await defer.promise;
    }

    protected override buildRequest(context: RequestContext, req: string | TransportRequest, options?: any): TransportRequest {
        context.setValue(Socket, this.socket);
        return isString(req) ? new TransportRequest(this.context.resolve(UuidGenerator).generate(), { ...options, url: req }) : req
    }

    async close(): Promise<void> {
        this.connected = false;
        this.socket?.end()
    }

    /**
     * on dispose.
     */
    onDispose(): Promise<void> {
        return this.close()
    }

}

