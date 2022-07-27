import { EndpointBackend, OnDispose, Protocol, RequestContext, TransportClient, TransportStatus, UuidGenerator } from '@tsdi/core';
import { EMPTY, Injectable, isString, lang, Nullable } from '@tsdi/ioc';
import { Socket, IpcNetConnectOpts } from 'net';
import { TransportRequest } from '../../client/request';
import { TransportEvent } from '../../client/response';
import { JsonDecoder, JsonEncoder } from '../../coder';
import { ev } from '../../consts';
import { TcpClientOpts, TCP_EXECPTIONFILTERS, TCP_INTERCEPTORS } from './options';
import { DetectBodyInterceptor } from '../../client/body';
import { PacketProtocolOpts } from '../packet';
import { TcpBackend } from './backend';
import { TcpProtocol } from '../protocol';
import { NormlizePathInterceptor } from '../../client/path';
import { TcpStatus } from '../status';
import { MIME_PROVIDERS } from '../../asset.pdr';




const defaults = {
    delimiter: '\r\n',
    encoding: 'utf8',
    encoder: JsonEncoder,
    decoder: JsonDecoder,
    interceptorsToken: TCP_INTERCEPTORS,
    execptionsToken: TCP_EXECPTIONFILTERS,
} as TcpClientOpts;


export const TCP_CLIENT_PROVIDERS = [
    ...MIME_PROVIDERS,
    { provide: TransportStatus, useClass: TcpStatus },
    { provide: Protocol, useClass: TcpProtocol },
]

/**
 * TcpClient. client of  `tcp` or `ipc`. 
 */
@Injectable()
export class TcpClient extends TransportClient<TransportRequest, TransportEvent, TcpClientOpts> implements OnDispose {

    private socket?: Socket;
    private connected: boolean;
    constructor(@Nullable() options: TcpClientOpts) {
        super(options);
        this.connected = false;
    }

    protected override initOption(options?: TcpClientOpts): TcpClientOpts {
        const connectOpts = { ...defaults.connectOpts, ...options?.connectOpts };
        const interceptors = [...options?.interceptors ?? EMPTY, NormlizePathInterceptor, DetectBodyInterceptor];
        const providers = options && options.providers ? [...TCP_CLIENT_PROVIDERS, ...options.providers] : TCP_CLIENT_PROVIDERS;
        return { ...defaults, ...options, connectOpts, interceptors, providers };
    }

    protected override initContext(options: TcpClientOpts): void {
        this.context.setValue(TcpClientOpts, options);
        this.context.setValue(PacketProtocolOpts, options);
        super.initContext(options);
    }

    protected getBackend(): EndpointBackend<TransportRequest, TransportEvent> {
        return this.context.resolve(TcpBackend);
    }

    protected async connect(): Promise<void> {
        if (this.connected) return;
        const opts = this.getOptions();
        const socket = this.socket ?? new Socket(opts.socketOpts);
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
        const isIPC = !!(opts.connectOpts as IpcNetConnectOpts).path;

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

        this.socket.connect(opts.connectOpts);
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

