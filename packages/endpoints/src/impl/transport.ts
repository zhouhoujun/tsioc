import { Injector, isFunction, promisify } from '@tsdi/ioc';
import { ServerTransport } from '../transport';
import { Deserializer, ev, FileAdapter, IDuplex, IEventEmitter, IncomingFactory, IReadable, IWritable, MimeAdapter, OutgoingFactory, Packet, Serializer, StatusAdapter, StreamAdapter, TransportOptions } from '@tsdi/common/transport';
import { AbstractRequest, HeaderAdapter, PatternFormatter } from '@tsdi/common';
import { ServerTransfer } from '../transfer';
import { ServerOpts } from '../Server';
import { fromEvent, Observable } from 'rxjs';
import { AcceptsPriority } from '../accepts';

export class SocketServerTransport<TSocket extends IDuplex = IDuplex, TOptions extends ServerOpts = ServerOpts> extends ServerTransport<TSocket, TOptions> {

    constructor(
        readonly injector: Injector,
        readonly socket: TSocket,
        readonly protocol: string,
        readonly options: TransportOptions,
        readonly serializer: Serializer,
        readonly deserializer: Deserializer,
        readonly patternFormatter: PatternFormatter | null,
        readonly statusAdapter: StatusAdapter | null,
        readonly headerAdapter: HeaderAdapter | null,
        readonly streamAdapter: StreamAdapter,
        readonly fileAdapter: FileAdapter,
        readonly mimeAdapter: MimeAdapter | null,
        readonly acceptsPriority: AcceptsPriority | null,
        readonly incomingFactory: IncomingFactory,
        readonly outgoingFactory: OutgoingFactory,       
        readonly transfer: ServerTransfer,
        readonly serverOptions: TOptions

    ) {
        super()
    }



    protected override read(channel?: IEventEmitter | null, req?: AbstractRequest<any>): Observable<any> {
        return fromEvent(channel ?? this.socket, this.options.event ?? ev.DATA)
    }

    protected override write(msg: Packet, channel?: IWritable | null): Promise<any> {
        const socket = channel ?? this.socket;
        if (this.streamAdapter.isReadable(msg.packet)) {
            return this.streamAdapter.pipeTo(msg.packet as IReadable, socket, { end: false });
        }
        return promisify<any, void>(socket.write, socket)(msg.packet)
    }

    override async close() {
        const socket = this.socket as any;
        if (socket && isFunction(socket.close)) {
            await promisify(socket.close, socket)();
        }
    }

}
