import { OnDispose, RestfulOption } from '@tsdi/core';
import { Injectable, Nullable } from '@tsdi/ioc';
import { TcpClientOpts, TCP_EXECPTIONFILTERS, TCP_INTERCEPTORS } from './options';
import { TransportClient } from '@tsdi/transport';
import { TcpProtocol } from '../protocol';
import { TcpClientBuilder } from './builder';



/**
 * tcp client default options.
 */
export const TCP_CLIENT_OPTS = {
    transport: TcpProtocol,
    builder: TcpClientBuilder,
    interceptorsToken: TCP_INTERCEPTORS,
    execptionsToken: TCP_EXECPTIONFILTERS,
    connectionOpts: {
        delimiter: '\r\n',
        maxSize: 10 * 1024 * 1024,
    },
} as TcpClientOpts;


/**
 * TcpClient. client of  `tcp` or `ipc`. 
 */
@Injectable()
export class TcpClient extends TransportClient<RestfulOption> implements OnDispose {

    constructor(@Nullable() options: TcpClientOpts) {
        super(options);
    }

    protected override getDefaultOptions() {
        return TCP_CLIENT_OPTS;
    }

    // protected override initOption(options?: TcpClientOpts): TcpClientOpts {
    //     const connectOpts = { ...defaults.connectOpts, ...options?.connectOpts };
    //     const interceptors = [...options?.interceptors ?? EMPTY, NormlizePathInterceptor, DetectBodyInterceptor];
    //     const providers = options && options.providers ? [...TCP_CLIENT_PROVIDERS, ...options.providers] : TCP_CLIENT_PROVIDERS;
    //     return { ...defaults, ...options, connectOpts, interceptors, providers };
    // }

    // protected override initContext(options: TcpClientOpts): void {
    //     this.context.setValue(PacketProtocolOpts, options);
    //     super.initContext(options);
    // }

    // protected getBackend(): EndpointBackend<TransportRequest, TransportEvent> {
    //     return this.context.get(TcpBackend);
    // }

    // protected async connect(): Promise<void> {
    //     if (this.connected) return;
    //     const opts = this.getOptions();
    //     const socket = this.socket ?? new Socket(opts.socketOpts);
    //     if (!this.socket) {
    //         this.socket = socket;
    //         const closed = () => {
    //             this.connected = false;
    //             if (isIPC) {
    //                 this.logger.info('Disconnected ipc server');
    //             } else {
    //                 this.logger.info('Disconnected tcp server', socket.remoteFamily, socket.remoteAddress, socket.remotePort);
    //             }
    //         };
    //         socket.on(ev.CLOSE, closed);
    //         socket.on(ev.END, closed);
    //     }
    //     const defer = lang.defer();
    //     const isIPC = !!(opts.connectOpts as IpcNetConnectOpts).path;

    //     socket.once(ev.ERROR, defer.reject);
    //     socket.once(ev.CONNECT, () => {
    //         this.connected = true;
    //         defer.resolve(true);
    //         if (isIPC) {
    //             this.logger.info('Connected ipc server');
    //         } else {
    //             this.logger.info('Connected tcp server', socket.remoteFamily, socket.remoteAddress, socket.remotePort);
    //         }
    //     });

    //     this.socket.connect(opts.connectOpts);
    //     await defer.promise;
    // }

    // protected override buildRequest(context: RequestContext, req: string | TransportRequest, options?: any): TransportRequest {
    //     context.setValue(Socket, this.socket);
    //     return isString(req) ? new TransportRequest({ id: this.context.resolve(UuidGenerator).generate(), ...options, url: req }) : req
    // }

    // async close(): Promise<void> {
    //     this.connected = false;
    //     this.socket?.end()
    // }

    // /**
    //  * on dispose.
    //  */
    // onDispose(): Promise<void> {
    //     return this.close()
    // }

}

