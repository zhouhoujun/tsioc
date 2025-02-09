import { Injector } from '@tsdi/ioc';
import { AbstractRequest, HeaderAdapter, PatternFormatter, ResponseFactory } from '@tsdi/common';
import { ClientIncomingFactory, Deserializer, ev, IDuplex, IEventEmitter, IWritable, Packet, Redirector, Serializer, StatusAdapter, StreamAdapter, writePacket } from '@tsdi/common/transport';
import { ClientTransfer, ClientTransport } from '../transport';
import { ClientOpts } from '../options';
import { fromEvent, Observable } from 'rxjs';



export class DefaultClientTransport<TSocket = any, TRequest extends AbstractRequest<any> = AbstractRequest<any>, TOptions extends ClientOpts = ClientOpts> extends ClientTransport<TSocket, TRequest, TOptions> {

    constructor(
        readonly injector: Injector,
        readonly socket: TSocket,
        readonly protocol: string,
        readonly serializer: Serializer,
        readonly deserializer: Deserializer,
        readonly patternFormatter: PatternFormatter | null,
        readonly statusAdapter: StatusAdapter | null,
        readonly headerAdapter: HeaderAdapter | null,
        readonly streamAdapter: StreamAdapter,
        readonly incomingFactory: ClientIncomingFactory,
        readonly transfer: ClientTransfer,
        readonly responseFactory: ResponseFactory,
        readonly redirector: Redirector | null,
        readonly clientOptions: TOptions,
        private _read: (socket: TSocket, channel?: IEventEmitter | null, req?: TRequest) => Observable<any>,
        private _write: (socket: TSocket, msg: Packet, request: TRequest, channel?: IEventEmitter | null) => Promise<any>,
        private _close?: (socket: TSocket) => Promise<any>

    ) {
        super()
    }


    protected override read(channel?: IEventEmitter | null, req?: TRequest): Observable<any> {
        return this._read(this.socket, channel, req)
    }

    protected override write(msg: Packet, request: TRequest, channel?: IWritable | null): Promise<any> {
        return this._write(this.socket, msg, request, channel)
    }

    override async close() {
        if (this._close) {
            await this._close(this.socket)
        }
    }

}

export class TopicClientTransport<TSocket = any, TRequest extends AbstractRequest<any> = AbstractRequest<any>, TOptions extends ClientOpts = ClientOpts> extends ClientTransport<TSocket, TRequest, TOptions> {

    constructor(
        readonly injector: Injector,
        readonly socket: TSocket,
        readonly protocol: string,
        readonly serializer: Serializer,
        readonly deserializer: Deserializer,
        readonly patternFormatter: PatternFormatter | null,
        readonly statusAdapter: StatusAdapter | null,
        readonly headerAdapter: HeaderAdapter | null,
        readonly streamAdapter: StreamAdapter,
        readonly incomingFactory: ClientIncomingFactory,
        readonly transfer: ClientTransfer,
        readonly responseFactory: ResponseFactory,
        readonly redirector: Redirector | null,
        readonly clientOptions: TOptions,
        private _subscribe: (socket: TSocket, channel?: IEventEmitter | null, req?: TRequest) => Observable<any>,
        private _publish: (socket: TSocket, msg: Packet, request: TRequest, channel?: IEventEmitter | null) => Promise<any>,
        private _close?: (socket: TSocket) => Promise<any>

    ) {
        super()
    }

    subscribe(topic: string, options: any) {
        // this._subscribe()
    }


    protected override read(channel?: IEventEmitter | null, req?: TRequest): Observable<any> {
        return this._subscribe(this.socket, channel, req)
    }

    protected override write(msg: Packet, request: TRequest, channel?: IWritable | null): Promise<any> {
        return this._publish(this.socket, msg, request, channel)
    }

    override async close() {
        if (this._close) {
            await this._close(this.socket)
        }
    }

}



export class SocketClientTransport<TSocket extends IDuplex = IDuplex, TRequest extends AbstractRequest<any> = AbstractRequest<any>, TOptions extends ClientOpts = ClientOpts> extends ClientTransport<TSocket, TRequest, TOptions> {

    constructor(
        readonly injector: Injector,
        readonly socket: TSocket,
        readonly protocol: string,
        readonly serializer: Serializer,
        readonly deserializer: Deserializer,
        readonly patternFormatter: PatternFormatter | null,
        readonly statusAdapter: StatusAdapter | null,
        readonly headerAdapter: HeaderAdapter | null,
        readonly streamAdapter: StreamAdapter,
        readonly incomingFactory: ClientIncomingFactory,
        readonly transfer: ClientTransfer,
        readonly responseFactory: ResponseFactory,
        readonly redirector: Redirector | null,
        readonly clientOptions: TOptions,
        readonly eventName: string = ev.DATA,
        private _close?: (socket: TSocket) => Promise<any>

    ) {
        super()
    }


    protected override read(channel?: IEventEmitter | null, req?: AbstractRequest<any>): Observable<any> {
        return fromEvent(channel ?? this.socket, this.eventName)
    }

    protected override write(msg: Packet, request: TRequest, channel?: IWritable | null): Promise<any> {
        return writePacket(channel ?? this.socket, msg, this.streamAdapter)
    }

    override async close() {
        if (this._close) {
            await this._close(this.socket)
        }
    }

}
