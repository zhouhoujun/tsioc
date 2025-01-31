import { Injector, isFunction, promisify } from '@tsdi/ioc';
import { ServerTransport } from '../transport';
import { Deserializer, ev, FileAdapter, IDuplex, IEventEmitter, IncomingFactory, IReadable, IWritable, MimeAdapter, OutgoingFactory, Packet, Serializer, StatusAdapter, StreamAdapter, TransportOptions, writePacket } from '@tsdi/common/transport';
import { AbstractRequest, HeaderAdapter } from '@tsdi/common';
import { ServerTransfer } from '../transfer';
import { ServerOpts } from '../Server';
import { fromEvent, Observable } from 'rxjs';
import { AcceptsPriority } from '../accepts';


export class DefaultServerTransport<TSocket = any, TOptions extends ServerOpts = ServerOpts> extends ServerTransport<TSocket, TOptions> {



    constructor(
        readonly injector: Injector,
        readonly socket: TSocket,
        readonly protocol: string,
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
        private _read: (socket: TSocket, channel?: IEventEmitter | null, req?: AbstractRequest<any>) => Observable<any>,
        private _write: (socket: TSocket, msg: Packet, channel?: IEventEmitter | null) => Promise<any>,
        private _close: (socket: TSocket) => Promise<any>

    ) {
        super()
    }


    protected override read(channel?: IEventEmitter | null, req?: AbstractRequest<any>): Observable<any> {
        return this._read(this.socket, channel, req)
    }

    protected override write(msg: Packet, channel?: IWritable | null): Promise<any> {
        return this._write(this.socket, msg, channel)
    }

    override close() {
        return this._close(this.socket)
    }

}

export class SocketServerTransport<TSocket extends IDuplex = IDuplex, TOptions extends ServerOpts = ServerOpts> extends ServerTransport<TSocket, TOptions> {

    constructor(
        readonly injector: Injector,
        readonly socket: TSocket,
        readonly protocol: string,
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
        readonly eventName: string = ev.DATA

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
        const socket = this.socket as any;
        if (socket && isFunction(socket.close)) {
            await promisify(socket.close, socket)();
        }
    }

}
