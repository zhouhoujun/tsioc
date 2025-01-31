import { Injector } from '@tsdi/ioc';
import { AbstractRequest, HeaderAdapter, PatternFormatter, ResponseFactory } from '@tsdi/common';
import { ClientIncomingFactory, Deserializer, ev, IDuplex, IEventEmitter, IWritable, Packet, Redirector, Serializer, StatusAdapter, StreamAdapter, writePacket } from '@tsdi/common/transport';
import { ClientTransfer, ClientTransport } from '../transport';
import { ClientOpts } from '../options';
import { fromEvent, Observable } from 'rxjs';



export class DefaultClientTransport<TSocket = any, TOptions extends ClientOpts = ClientOpts> extends ClientTransport<TSocket, TOptions> {

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
        private _read: (socket: TSocket, channel?: IEventEmitter | null, req?: AbstractRequest<any>) => Observable<any>,
        private _write: (socket: TSocket, msg: Packet, channel?: IEventEmitter | null) => Promise<any>,
        private _close?: (socket: TSocket) => Promise<any>

    ) {
        super()
    }


    protected override read(channel?: IEventEmitter | null, req?: AbstractRequest<any>): Observable<any> {
        return this._read(this.socket, channel, req)
    }

    protected override write(msg: Packet, channel?: IWritable | null): Promise<any> {
        return this._write(this.socket, msg, channel)
    }

    override async close() {
        if(this._close) {
            await this._close(this.socket)
        }
    }

}


export class SocketClientTransport<TSocket extends IDuplex = IDuplex, TOptions extends ClientOpts = ClientOpts> extends ClientTransport<TSocket, TOptions> {

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

    protected override write(msg: Packet, channel?: IWritable | null): Promise<any> {
        return writePacket(channel?? this.socket, msg, this.streamAdapter)
    }

    override async close() {
        if(this._close) {
            await this._close(this.socket)
        }
    }

}
