import { Injectable, Injector, promisify } from '@tsdi/ioc';
import { IDuplexStream, IReadableStream, Packet, PacketBuffer, RequestPacket, StreamAdapter, TransportOpts } from '@tsdi/common';
import { ServerEventTransportSession } from './transport.session';
import { IncomingDecoder, OutgoingEncoder } from '../transport/codings';
import { IncomingContext, ServerTransportSessionFactory } from '../transport/session';
import { ServerOpts } from '../Server';
import { TransportContext } from '../TransportContext';



export class ServerDuplexTransportSession extends ServerEventTransportSession<IDuplexStream> {
    protected writeHeader(ctx: TransportContext<any, any, any>): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected pipe(ata: IReadableStream, ctx: TransportContext<any, any, any>): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected createContext(data: Buffer, msg: string | Buffer | Uint8Array, options: ServerOpts<any>): IncomingContext {
        throw new Error('Method not implemented.');
    }
    generateHeader(msg: TransportContext<any, any, any>): Buffer {
        throw new Error('Method not implemented.');
    }
    parseHeader(msg: Buffer | TransportContext<any, any, any>): Packet<any> {
        throw new Error('Method not implemented.');
    }

    protected getTopic(msg: string | Buffer | Uint8Array): string {
        return '__DEFALUT_TOPIC__'
    }
    protected getPayload(msg: string | Buffer | Uint8Array): string | Buffer | Uint8Array {
        return msg;
    }

    protected override write(data: Buffer, packet: Packet): Promise<void> {
        return promisify<Buffer, void>(this.socket.write, this.socket)(data);
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
