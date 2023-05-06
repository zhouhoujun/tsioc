// import { ClientStream, ClientStreamFactory, OutgoingHeaders, ReqHeaders, Socket } from '@tsdi/core';
// import { Execption, Injectable } from '@tsdi/ioc';
// import { PacketTransformer } from '@tsdi/core';
// import { Writable, Duplex, Transform } from 'stream';
// import { NumberAllocator } from 'number-allocator';
// import { ev } from '@tsdi/transport';
// import { Duplexify } from './duplexify';

// @Injectable()
// export class ClientStreamFactoryImpl<TSocket extends Duplex = any> implements ClientStreamFactory<TSocket> {

//     constructor(private coding: PacketTransformer) {

//     }

//     allocator = new NumberAllocator(1, 65536);
//     last?: number;
//     create(socket: TSocket, headers: ReqHeaders, opts: any): ClientStream<TSocket> {
//         return new ClientStreamImpl(this.getStreamId(), socket, headers.headers, this.coding.createGenerator(socket, opts), this.coding.createParser(opts));
//     }

//     getStreamId() {
//         const id = this.allocator.alloc();
//         if (!id) {
//             throw new Execption('alloc stream id failed');
//         }
//         this.last = id;
//         return id;
//     }

// }

// export class ClientStreamImpl<TSocket extends Duplex = any> extends Duplexify implements ClientStream<TSocket> {

//     constructor(readonly id: number, readonly socket: TSocket, readonly headers: OutgoingHeaders, private generator: Writable, private parser: Transform) {
//         super(generator, parser, {objectMode: true});
        
//         process.nextTick(() => {
//             this.generator.pipe(this.socket)
//             this.socket.pipe(this.parser);
//         });

//         [ev.CLOSE, ev.ERROR].forEach(n=> {
//             const evt = this.emit.bind(this, n);
//             this.socket.on(n, evt);
//             if (n === ev.ERROR) {
//                 this.generator.on(n, evt);
//                 this.parser.on(n, evt);
//             }
//         })

//     }

//     protected override _writing(chunk: any, encoding: BufferEncoding, cb: (error?: Error | null | undefined) => void): void {
//         if(!this.headerSent) {
//             super._writing(this.headers, encoding, cb);
//         }
//         super._writing(chunk, encoding, cb);
//     }

//     private _headerSent = false;
//     get headerSent(): boolean {
//         return this._headerSent;
//     }

// }


