import { Injectable, Injector, isPlainObject, promisify } from '@tsdi/ioc';
import { IDuplexStream, IReadableStream, Outgoing, Packet, PacketBuffer, ResponsePacket, StreamAdapter, TransportOpts } from '@tsdi/common';
import { ServerEventTransportSession } from './transport.session';
import { IncomingDecoder, OutgoingEncoder } from '../transport/codings';
import { IncomingContext, ServerTransportSessionFactory } from '../transport/session';
import { TransportContext } from '../TransportContext';



export class ServerDuplexTransportSession extends ServerEventTransportSession<IDuplexStream> {

    protected writeHeader(ctx: TransportContext): Promise<void> {
        const headBuff = this.generateHeader(ctx);
        return promisify<Buffer, void>(this.socket.write, this.socket)(headBuff);
    }

    protected pipe(data: IReadableStream, ctx: TransportContext): Promise<void> {
        return this.streamAdapter.pipeTo(data, this.socket)
    }

    protected override write(data: Buffer, packet: Packet): Promise<void> {
        return promisify<Buffer, void>(this.socket.write, this.socket)(data);
    }

    generateHeader(ctx: TransportContext): Buffer {
        if (isPlainObject(ctx.response)) {
            const { payload, ...head } = ctx.response;
            return Buffer.from(JSON.stringify(head));
        } else {
            const res = ctx.response as Outgoing;
            const head = {
                id: res.id,
                status: res.statusCode,
                statusText: res.statusMessage,
                headers: res.getHeaders?.() ?? res.headers
            } as ResponsePacket;

            return Buffer.from(JSON.stringify(head));
        }
    }

    parseHeader(msg: Buffer | TransportContext): Packet<any> {
        throw new Error('Method not implemented.');
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
