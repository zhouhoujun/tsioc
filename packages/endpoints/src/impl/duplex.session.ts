// import { Injectable, Injector, promisify } from '@tsdi/ioc';
// import { Decoder, Encoder, TransportRequest } from '@tsdi/common';
// import { IDuplexStream, Packet, StreamAdapter, TransportOpts, TransportSessionFactory } from '@tsdi/common/transport';
// import { EventTransportSession } from '../transport.session';



// export class DuplexTransportSession extends EventTransportSession<IDuplexStream> {

//     protected getTopic(msg: string | Buffer | Uint8Array): string {
//         return '__DEFALUT_TOPIC__'
//     }
//     protected getPayload(msg: string | Buffer | Uint8Array): string | Buffer | Uint8Array {
//         return msg;
//     }

//     protected override async beforeRequest(packet: TransportRequest<any>): Promise<void> {
//         // do nothing
//     }

//     protected override write(data: Buffer, packet: Packet): Promise<void> {
//         return promisify<Buffer, void>(this.socket.write, this.socket)(data);
//     }

//     override async destroy(): Promise<void> {
//         this.socket.destroy?.();
//     }
// }

// @Injectable()
// export class DuplexTransportSessionFactory implements TransportSessionFactory<IDuplexStream> {

//     constructor(
//         readonly injector: Injector,
//         private streamAdapter: StreamAdapter,
//         private encoder: Encoder,
//         private decoder: Decoder) { }

//     create(socket: IDuplexStream, options: TransportOpts): DuplexTransportSession {
//         return new DuplexTransportSession(this.injector, socket, this.streamAdapter, this.encoder, this.decoder, options);
//     }

// }
