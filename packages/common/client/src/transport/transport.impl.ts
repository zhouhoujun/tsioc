import { Injector } from '@tsdi/ioc';
import { AbstractRequest, HeaderAdapter, PatternFormatter, ResponseFactory } from '@tsdi/common';
import {
    ClientIncomingFactory, Deserializer, ev, IDuplex, Packet, Redirector, Serializer,
    StatusAdapter, StreamAdapter, TransportContext, writePacket
} from '@tsdi/common/transport';
import { ClientTransfer, ClientTransport } from '../transport';
import { ClientOpts } from '../options';
import { fromEvent, map, Observable } from 'rxjs';



export class DefaultClientTransport<
    TSocket = any,
    TRequest extends AbstractRequest<any> = AbstractRequest<any>,
    TMsg = any,
    TOptions extends ClientOpts = ClientOpts> extends ClientTransport<TSocket, TRequest, TMsg, TOptions> {

    constructor(
        readonly injector: Injector,
        readonly socket: TSocket,
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
        private _read: (socket: TSocket, factory: () => TransportContext, instance?: TransportContext) => Observable<TransportContext | any>,
        private _write: (socket: TSocket, msg: TMsg, req: TRequest, context: TransportContext) => Promise<any>,
        private _close?: (socket: TSocket) => Promise<any>

    ) {
        super()
    }


    protected override read(context?: TransportContext): Observable<any> {
        return this._read(this.socket, () => TransportContext.create(this), context);

    }

    protected override write(msg: TMsg, req: TRequest, context: TransportContext): Promise<any> {
        return this._write(this.socket, msg, req, context)
    }

    override async close() {
        if (this._close) {
            await this._close(this.socket)
        }
    }

}


export class SocketClientTransport<
    TSocket extends IDuplex = IDuplex,
    TRequest extends AbstractRequest<any> = AbstractRequest<any>,
    TMsg extends Packet = Packet,
    TOptions extends ClientOpts = ClientOpts> extends ClientTransport<TSocket, TRequest, TMsg, TOptions> {

    constructor(
        readonly injector: Injector,
        readonly socket: TSocket,
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


    protected override read(context?: TransportContext): Observable<any> {
        return fromEvent(this.socket, this.eventName)
    }

    protected override write(msg: TMsg, req: TRequest, context: TransportContext): Promise<any> {
        return writePacket(this.socket, msg, this.streamAdapter)
    }

    override async close() {
        if (this._close) {
            await this._close(this.socket)
        }
    }

}
