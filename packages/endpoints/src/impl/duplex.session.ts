import { Injectable, Injector, promisify } from '@tsdi/ioc';
import { IDuplexStream, IReadableStream, Packet, PacketBuffer, ResponsePacket, StreamAdapter, TransportOpts } from '@tsdi/common';
import { ServerEventTransportSession } from './transport.session';
import { IncomingDecoder, OutgoingEncoder } from '../transport/codings';
import { ServerTransportSessionFactory } from '../transport/session';
import { TransportContext } from '../TransportContext';



export class ServerDuplexTransportSession extends ServerEventTransportSession<IDuplexStream> {

    protected writeHeader(ctx: TransportContext): Promise<void> {
        const headBuff = this.serialize(this.generatePacket(ctx, true));
        return promisify<Buffer, void>(this.socket.write, this.socket)(headBuff);
    }

    protected pipe(data: IReadableStream, ctx: TransportContext): Promise<void> {
        return this.streamAdapter.pipeTo(data, this.socket)
    }

    override writeMessage(chunk: Buffer, ctx: TransportContext): Promise<void> {
        return promisify<Buffer, void>(this.socket.write, this.socket)(chunk);
    }

    override write(packet: ResponsePacket, chunk: Buffer, callback?: (err?: any) => void): void {
        this.socket.write(chunk, callback);
    }

    protected getTopic(msg: string | Buffer | Uint8Array): string {
        return '__DEFALUT_TOPIC__'
    }
    protected getPayload(msg: string | Buffer | Uint8Array): string | Buffer | Uint8Array {
        return msg;
    }

    override async destroy(): Promise<void> {
        this.socket.destroy?.();
        this.packetBuffer.clear();
    }
}

@Injectable()
export class DuplexTransportSessionFactory implements ServerTransportSessionFactory<IDuplexStream> {

    constructor(
        readonly injector: Injector,
        private streamAdapter: StreamAdapter,
        private encoder: OutgoingEncoder,
        private decoder: IncomingDecoder) { }

    create(socket: IDuplexStream, options: TransportOpts): ServerDuplexTransportSession {
        return new ServerDuplexTransportSession(this.injector, socket, this.streamAdapter, this.encoder, this.decoder, new PacketBuffer(), options);
    }

}
