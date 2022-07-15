import { EndpointBackend, OnDispose, RequestContext, TransportClient, TransportStatus, UuidGenerator } from '@tsdi/core';
import { EMPTY, Inject, Injectable, InvocationContext, isString, lang, Nullable, Providers } from '@tsdi/ioc';
import { Socket, IpcNetConnectOpts } from 'net';
import { TcpRequest } from './request';
import { TcpEvent } from './response';
import { JsonDecoder, JsonEncoder } from '../../coder';
import { ev } from '../../consts';
import { TcpPathInterceptor } from './path';
import { TcpClientOptions, TCP_EXECPTIONFILTERS, TCP_INTERCEPTORS } from './options';
import { TcpBodyInterceptor } from './body';
import { PacketProtocolOpions } from '../packet';
import { TcpBackend } from './backend';
import { HttpStatus } from '../../http/status';




const defaults = {
    delimiter: '\r\n',
    encoding: 'utf8',
    encoder: JsonEncoder,
    decoder: JsonDecoder,
    interceptorsToken: TCP_INTERCEPTORS,
    execptionsToken: TCP_EXECPTIONFILTERS,
} as TcpClientOptions;


/**
 * TcpClient. client of  `tcp` or `ipc`. 
 */
@Injectable()
@Providers([
    { provide: TransportStatus, useClass: HttpStatus, asDefault: true }
])
export class TcpClient extends TransportClient<TcpRequest, TcpEvent> implements OnDispose {

    private socket?: Socket;
    private connected: boolean;
    private option!: TcpClientOptions;
    constructor(
        @Inject() context: InvocationContext,
        @Nullable() option: TcpClientOptions
    ) {
        super(context, option);
        this.connected = false;
    }

    protected override initOption(options?: TcpClientOptions): TcpClientOptions {
        const connectOpts = { ...defaults.connectOpts, ...options?.connectOpts };
        const interceptors = [...options?.interceptors ?? EMPTY, TcpPathInterceptor, TcpBodyInterceptor];
        this.option = { ...defaults, ...options, connectOpts, interceptors };
        this.context.setValue(TcpClientOptions, this.option);
        this.context.setValue(PacketProtocolOpions, this.option);
        return this.option;
    }

    protected getBackend(): EndpointBackend<TcpRequest, TcpEvent> {
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

    protected override buildRequest(context: RequestContext, req: string | TcpRequest, options?: any): TcpRequest {
        context.setValue(Socket, this.socket);
        return isString(req) ? new TcpRequest(this.context.resolve(UuidGenerator).generate(), { ...options, url: req }) : req
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

