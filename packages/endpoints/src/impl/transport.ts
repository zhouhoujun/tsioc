import { Injector } from '@tsdi/ioc';
import { ServerTransport } from '../transport';
import { Deserializer, ev, FileAdapter, IDuplex, IncomingFactory, MimeAdapter, OutgoingFactory, Packet, Serializer, StatusAdapter, StreamAdapter, TransportContext, writePacket } from '@tsdi/common/transport';
import { HeaderAdapter } from '@tsdi/common';
import { ServerTransfer } from '../transfer';
import { ServerOpts } from '../server.options';
import { fromEvent, Observable } from 'rxjs';
import { AcceptsPriority } from '../accepts';
import { RequestContext } from '../RequestContext';


export class DefaultServerTransport<
    TSocket = any,
    TContext extends RequestContext = RequestContext,
    TMsg = any,
    TOptions extends ServerOpts = ServerOpts> extends ServerTransport<TSocket, TContext, TMsg, TOptions> {

    constructor(
        readonly injector: Injector,
        readonly socket: TSocket,
        readonly serializer: Serializer,
        readonly deserializer: Deserializer,
        readonly statusAdapter: StatusAdapter | null,
        readonly headerAdapter: HeaderAdapter | null,
        readonly streamAdapter: StreamAdapter,
        readonly fileAdapter: FileAdapter,
        readonly mimeAdapter: MimeAdapter | null,
        readonly acceptsPriority: AcceptsPriority | null,
        readonly incomingFactory: IncomingFactory,
        readonly outgoingFactory: OutgoingFactory,
        readonly transfer: ServerTransfer,
        readonly serverOptions: TOptions,
        private _read: (socket: TSocket, context: TransportContext) => Observable<any>,
        private _write: (socket: TSocket, msg: TMsg, requestContext: TContext, context: TransportContext) => Promise<any>,
        private _close?: (socket: TSocket) => Promise<any>

    ) {
        super()
    }


    protected override read(context: TransportContext): Observable<any> {
        return this._read(this.socket, context)
    }

    protected override write(msg: TMsg, requestContext: TContext, context: TransportContext): Promise<any> {
        return this._write(this.socket, msg, requestContext, context)
    }

    override async close() {
        if (this._close) {
            await this._close(this.socket)
        }
    }

}

export class SocketServerTransport<
    TSocket extends IDuplex = IDuplex,
    TContext extends RequestContext = RequestContext,
    TMsg extends Packet = any,
    TOptions extends ServerOpts = ServerOpts> extends ServerTransport<TSocket, TContext, TMsg, TOptions> {

    constructor(
        readonly injector: Injector,
        readonly socket: TSocket,
        readonly serializer: Serializer,
        readonly deserializer: Deserializer,
        readonly statusAdapter: StatusAdapter | null,
        readonly headerAdapter: HeaderAdapter | null,
        readonly streamAdapter: StreamAdapter,
        readonly fileAdapter: FileAdapter,
        readonly mimeAdapter: MimeAdapter | null,
        readonly acceptsPriority: AcceptsPriority | null,
        readonly incomingFactory: IncomingFactory,
        readonly outgoingFactory: OutgoingFactory,
        readonly transfer: ServerTransfer,
        readonly serverOptions: TOptions,
        readonly eventName: string = ev.DATA,
        private _close?: (socket: TSocket) => Promise<any>

    ) {
        super()
    }



    protected override read(context: TransportContext): Observable<any> {
        return fromEvent(this.socket, this.eventName)
    }

    protected override write(msg: TMsg, requestContext: TContext, context: TransportContext): Promise<any> {
        return writePacket(this.socket, msg, this.streamAdapter)
    }

    override async close() {
        if (this._close) {
            await this._close(this.socket)
        }
    }

}
