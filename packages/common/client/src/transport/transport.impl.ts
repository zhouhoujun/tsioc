import { AbstractRequest, HeaderAdapter, PatternFormatter, ResponseFactory } from '@tsdi/common';
import { ClientIncomingFactory, Deserializer, ev, IEventEmitter, IReadable, IWritable, Redirector, Serializer, StatusAdapter, StreamAdapter } from '@tsdi/common/transport';
import { ClientTransfer, ClientTransport, ClientTransportFactory } from '../transport';
import { ClientOpts } from '../options';
import { Injector, isFunction, promisify } from '@tsdi/ioc';
import { fromEvent, Observable } from 'rxjs';



export class SocketClientTransport extends ClientTransport<any> {


    constructor(
        readonly injector: Injector,
        readonly socket: any,
        readonly protocol: string,
        readonly headDelimiter: string,
        readonly delimiter: string,
        readonly splitDelimiter: string,
        readonly maxSize: number,
        readonly idLen: number | null,
        readonly countLen: number,
        readonly event: string,
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
        return fromEvent(channel ?? this.socket, this.event ?? ev.DATA)
    }

    protected override write(msg: any, channel?: IWritable | null): Promise<any> {
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



// export class DefaultClientTransportFactory implements ClientTransportFactory<any> {

//     constructor(
//         readonly serializer: Serializer,
//         readonly deserializer: Deserializer,
//         readonly headerAdapter: HeaderAdapter,
//         readonly streamAdapter: StreamAdapter,
//         readonly incomingFactory: ClientIncomingFactory,
//         readonly transfer: ClientTransfer,
//         readonly responseFactory: ResponseFactory,
//         readonly statusAdapter: StatusAdapter | null,
//         readonly redirector: Redirector | null,
//         readonly patternFormatter: PatternFormatter | null,
//     ) { }

//     create(injector: Injector, socket: any, options: ClientOpts): DefaultClientTransport {
//         return new DefaultClientTransport(injector, socket, options);
//     }

// }
