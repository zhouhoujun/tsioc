import { Injectable, Injector, Optional, isString, promisify } from '@tsdi/ioc';
import { FileAdapter, IDuplexStream, IncomingAdapter, MimeAdapter, OutgoingAdapter, StatusAdapter, StreamAdapter, TransportOpts, isBuffer } from '@tsdi/common';
import { ServerEventTransportSession } from './transport.session';
import { IncomingDecoder, OutgoingEncoder } from '../transport/codings';
import { ServerTransportSessionFactory } from '../transport/session';
import { TransportContext } from '../TransportContext';



export class ServerDuplexTransportSession extends ServerEventTransportSession<IDuplexStream> {
    topic = false;

    // protected writeHeader(ctx: TransportContext): Promise<void> {
    //     const headBuff = this.serialize(this.generatePacket(ctx, true));
    //     return promisify<Buffer, void>(this.socket.write, this.socket)(headBuff);
    // }

    // protected pipe(data: IReadableStream, ctx: TransportContext): Promise<void> {
    //     return this.streamAdapter.pipeTo(data, this.socket)
    // }

    override writeMessage(data: any, ctx: TransportContext): Promise<void> {
        if(this.streamAdapter.isReadable(data)) return this.streamAdapter.pipeTo(data, this.socket)
        if(isBuffer(data)) return promisify<Buffer, void>(this.socket.write, this.socket)(data);
        if(isString(data)) return promisify<Buffer, void>(this.socket.write, this.socket)(Buffer.from(data));

        return promisify<Buffer, void>(this.socket.write, this.socket)(Buffer.from(JSON.stringify(data)));
    }

    // override write(packet: ResponsePacket, chunk: Buffer, callback?: (err?: any) => void): void {
    //     this.socket.write(chunk, callback);
    // }

    protected getTopic(msg: string | Buffer | Uint8Array): string {
        return '__DEFALUT_TOPIC__'
    }
    protected getPayload(msg: string | Buffer | Uint8Array): string | Buffer | Uint8Array {
        return msg;
    }

    override async destroy(): Promise<void> {
        this.socket.destroy?.();
    }
}

@Injectable()
export class DuplexTransportSessionFactory implements ServerTransportSessionFactory<IDuplexStream> {

    constructor(
        readonly injector: Injector,
        @Optional() private statusAdapter: StatusAdapter,
        @Optional() private incomingAdapter: IncomingAdapter,
        @Optional() private outgoingAdapter: OutgoingAdapter,
        @Optional() private mimeAdapter: MimeAdapter,
        private fileAdapter: FileAdapter,
        private streamAdapter: StreamAdapter,
        private encoder: OutgoingEncoder,
        private decoder: IncomingDecoder) { }

    create(socket: IDuplexStream, options: TransportOpts): ServerDuplexTransportSession {
        return new ServerDuplexTransportSession(
            this.injector,
            socket,
            this.statusAdapter,
            this.incomingAdapter,
            this.outgoingAdapter,
            this.mimeAdapter,
            this.fileAdapter,
            this.streamAdapter,
            this.encoder,
            this.decoder,
            options);
    }

}
