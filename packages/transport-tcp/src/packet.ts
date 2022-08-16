// import { Decoder, Encoder, Packet } from '@tsdi/core';
// import { Abstract, ArgumentError, Defer, Injectable, lang } from '@tsdi/ioc';
// import { ev, isStream } from '@tsdi/transport';
// import { Buffer } from 'buffer';
// import { Observable, Observer, share } from 'rxjs';
// import { Socket } from 'net';
// import { Readable, Duplex } from 'stream';

// /**
//  * Packet Protocol options.
//  */
// @Abstract()
// export abstract class PacketProtocolOpts {
//     /**
//      * packet size limit.
//      */
//     sizeLimit?: number;
//     /**
//      * package delimiter code.
//      */
//     delimiter?: string;
//     /**
//      * socket buffer encoding.
//      */
//     encoding?: BufferEncoding;
// }

// @Abstract()
// export abstract class PacketProtocol {
//     abstract read(socket: Socket): Observable<Packet>;
//     abstract write(socket: Socket, data: Packet, encoding?: BufferEncoding): Promise<void>;
// }

// @Abstract()
// export abstract class PacketTransform<T = any> {
//     abstract read(readable: Readable): Observable<T>;
//     abstract write(writable: Duplex, packet: T, encoding?: BufferEncoding): Promise<void>;
// }


// @Injectable()
// export class DelimiterProtocol extends PacketProtocol {

//     private _delimBuf: Buffer;
//     private _header: Buffer;
//     private _body: Buffer;
//     constructor(
//         private option: PacketProtocolOpts,
//         private encoder: Encoder<Buffer>,
//         private decoder: Decoder<Buffer>) {
//         super();
//         if (!option.delimiter) {
//             throw new ArgumentError('no delimiter of Protocol option')
//         }
//         this._delimBuf = Buffer.from(option.delimiter);
//         this._header = Buffer.from('0');
//         this._body = Buffer.from('1');
//     }


//     read(socket: Socket): Observable<Packet<any>> {
//         let obser = (socket as any)._readObser;
//         if (!obser) {
//             obser = this.createObservable(socket);
//             (socket as any)._readObser = obser
//         }
//         return obser;
//     }

//     async write(socket: Socket, data: Packet, encoding?: BufferEncoding): Promise<void> {
//         const { id, headers, body } = data;
//         encoding = encoding ?? this.option.encoding;
//         const delimiter = this._delimBuf;
//         let defer: Defer | undefined;
//         if (headers) {
//             defer = lang.defer();
//             const hdbuf = this.encoder.encode(lang.omit(data, 'body'));
//             const hpkg = Buffer.concat([this._header, hdbuf, delimiter], this._header.length + hdbuf.length + delimiter.length);
//             await this.writeBuff(socket, hpkg, encoding);
//         }

//         if (body !== null) {
//             const idbuf = Buffer.from(id!);
//             if (isStream(body)) {
//                 const defer = lang.defer();
//                 const pref = Buffer.concat([this._body, idbuf], this._body.length + idbuf.length);
//                 socket.write(pref, encoding);

//                 body.once(ev.ERROR, (err) => {
//                     defer.reject(err)
//                 });
//                 body.once(ev.END, () => {
//                     defer.resolve()
//                 });
//                 body.pipe(socket, { end: false });
//                 return await defer.promise
//                     .then(() => {
//                         if (body instanceof Readable) body.destroy();
//                         return this.writeBuff(socket, delimiter, encoding);
//                     })
//             }

//             const bodybuf = this.encoder.encode(body);
//             return await this.writeBuff(socket, Buffer.concat([this._body, idbuf, bodybuf, delimiter], this._body.length + idbuf.length + bodybuf.length + delimiter.length), encoding);
//         }
//     }

//     protected writeBuff(socket: Socket, buff: Buffer, encoding?: BufferEncoding) {
//         const defer = lang.defer();
//         socket.write(buff, encoding, err => {
//             if (!err) return defer!.resolve();
//             defer!.reject(err);
//             socket.emit(ev.ERROR, err);
//         });
//         return defer.promise;
//     }

//     protected createObservable(socket: Socket): Observable<Packet> {
//         return new Observable((observer: Observer<any>) => {
//             const onClose = (err?: any) => {
//                 if (err) {
//                     observer.error(err);
//                 } else {
//                     observer.complete();
//                 }
//             }

//             const onError = (err: any) => {
//                 observer.error(err);
//             };

//             let buffer: Buffer | null;
//             let bytes = 0;
//             const delimiter = this._delimBuf;
//             const onData = (data: Buffer) => {
//                 try {
//                     bytes += data.length;
//                     buffer = buffer ? Buffer.concat([buffer, data], bytes) : data;

//                     const idx = buffer.indexOf(delimiter);
//                     if (idx <= 0) {
//                         if (idx === 0) {
//                             buffer = null;
//                             bytes = 0;
//                         }
//                         return;
//                     }

//                     let rest: Buffer | undefined;

//                     const pkg = buffer.slice(0, idx);
//                     if (idx < buffer.length - 1) {
//                         rest = buffer.slice(idx + delimiter.length);
//                     }
//                     if (pkg) {
//                         buffer = null;
//                         bytes = 0;
//                         const packet = this.decoder.decode(pkg, this.option.encoding);
//                         observer.next(packet);
//                     }
//                     if (rest) {
//                         onData(rest);
//                     }
//                 } catch (err: any) {
//                     socket.emit(ev.ERROR, err.message);
//                     socket.end();
//                     observer.error(err);
//                 }
//             };

//             const onEnd = () => {
//                 observer.complete();
//             };

//             socket.on(ev.CLOSE, onClose);
//             socket.on(ev.ERROR, onError);
//             socket.on(ev.ABOUT, onError);
//             socket.on(ev.TIMEOUT, onError);
//             socket.on(ev.DATA, onData);
//             socket.on(ev.END, onEnd);

//             return () => {
//                 socket.off(ev.DATA, onData);
//                 socket.off(ev.END, onEnd);
//                 socket.off(ev.ERROR, onError);
//                 socket.off(ev.ABOUT, onError);
//                 socket.off(ev.TIMEOUT, onError);
//                 socket.emit(ev.CLOSE);
//                 (socket as any)._readObser = null;
//             }
//         }).pipe(share());
//     }
// }

