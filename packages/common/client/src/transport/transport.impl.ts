import { AbstractRequest, HeaderAdapter, PatternFormatter, ResponseFactory } from '@tsdi/common';
import { ClientIncomingFactory, Deserializer, ev, IEventEmitter, IReadable, IWritable, Packet, Redirector, Serializer, StatusAdapter, StreamAdapter, TransportOptions } from '@tsdi/common/transport';
import { ClientTransfer, ClientTransport } from '../transport';
import { ClientOpts } from '../options';
import { Injector, isFunction, promisify } from '@tsdi/ioc';
import { fromEvent, Observable } from 'rxjs';



export class SocketClientTransport extends ClientTransport<any> {

    constructor(
        readonly injector: Injector,
        readonly socket: any,
        readonly protocol: string,
        readonly options: TransportOptions,
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
        readonly clientOptions: ClientOpts

    ) {
        super()
    }



    protected override read(channel?: IEventEmitter | null, req?: AbstractRequest<any>): Observable<any> {
        return fromEvent(channel ?? this.socket, this.options.event ?? ev.DATA)
    }

    protected override write(msg: Packet, channel?: IWritable | null): Promise<any> {
        const socket = channel ?? this.socket;
        if (this.streamAdapter.isReadable(msg.payload)) {
            return this.streamAdapter.pipeTo(msg.payload as IReadable, socket, { end: false });
        }
        return promisify<any, void>(socket.write, socket)(msg.payload)
    }

    override async close() {
        const socket = this.socket as any;
        if (socket && isFunction(socket.close)) {
            await promisify(socket.close, socket)();
        }
    }

}
