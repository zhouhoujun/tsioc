import { Injectable, isString, Context, Inject, promisify } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logger';
import { Pattern, Events, LOCALHOST, RequestInitOpts, UrlRequestOptions, ResponseEvent, PatternFormatter } from '@tsdi/common';
import { AbstractClient, ClientHandler } from '@tsdi/client';
import { defer, Observable } from 'rxjs';
import * as dgram from 'node:dgram';
import { SOCKET } from '@tsdi/transport';
import { UDP_CLIENT_OPTIONS, UdpClientOptions } from './options';
import { UdpRequest } from './request';

@Injectable()
export class UdpClient extends AbstractClient<UdpRequest<any>, ResponseEvent<any>, UrlRequestOptions> {

    private socket?: dgram.Socket;

    @InjectLog() private logger!: Logger;

    constructor(
        readonly handler: ClientHandler<UdpRequest<any>, ResponseEvent<any>>,
        @Inject(UDP_CLIENT_OPTIONS, { nullable: true }) private options: UdpClientOptions
    ) {
        super();
        if (!options.port) {
            options.port = 41234;
            options.host = LOCALHOST;
        }
    }

    protected connect(): Observable<dgram.Socket> {
        return defer(async () => {
            if (this.socket) return this.socket;
            this.socket = dgram.createSocket(this.options.socketType || 'udp4');
            this.socket.on(Events.ERROR, (err: Error) => {
                this.logger?.error('UDP client error:', err);
            });
            await new Promise<void>((resolve, reject) => {
                this.socket!.connect(this.options.port!, this.options.host!, (err?: Error) => err ? reject(err) : resolve());
            });
            return this.socket;
        });
    }

    protected initContext(context: Context, req: UdpRequest<any>): void {
        context.set(UdpClient, this);
        context.set(UdpRequest, req);
        if (this.socket) {
            context.set(SOCKET, this.socket as any);
        }
    }

    protected buildRequest(first: UdpRequest<any> | Pattern, options: RequestInitOpts<any, UrlRequestOptions>): UdpRequest<any> {
        if (first instanceof UdpRequest) return first;
        const defaultMethod = this.options.microservice ? undefined : 'SEND';
        if (isString(first)) {
            return new UdpRequest(first, null, options, defaultMethod);
        } else {
            return new UdpRequest(this.handler.injector.get(PatternFormatter).format(first), first, options, defaultMethod);
        }
    }

    protected async onShutdown(): Promise<void> {
        if (!this.socket) return;
        this.socket.removeAllListeners();
        await promisify(this.socket.close, this.socket)();
        this.socket = undefined;

    }

    protected isValid(connection: dgram.Socket): boolean {
        try { connection.address(); return true; }
        catch { return false; }
    }
}
