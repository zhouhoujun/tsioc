import { Decoder, Encoder, Packet } from '@tsdi/core';
import { Abstract, ArgumentError, Injectable, isString, lang } from '@tsdi/ioc';
import { Observable, Observer, share } from 'rxjs';
import { Socket } from 'net';
import { Readable } from 'stream';
import { TcpErrorResponse } from './client/response';
import { ev } from '../consts';
import { isBuffer, isStream } from '../utils';

/**
 * Packet Protocol options.
 */
@Abstract()
export abstract class PacketProtocolOpions {
    /**
     * package delimiter code.
     */
    delimiter?: string;
    /**
     * socket buffer encoding.
     */
    encoding?: BufferEncoding;
}

@Abstract()
export abstract class PacketProtocol {
    abstract read(socket: Socket): Observable<Packet>;
    abstract write(socket: Socket, data: Packet): Promise<void>;
}

@Injectable()
export class DelimiterProtocol extends PacketProtocol {

    constructor(private option: PacketProtocolOpions, private encoder: Encoder, private decoder: Decoder) {
        super();
        if(!option.delimiter) {
            throw new ArgumentError('no delimiter of Protocol option')
        }
    }


    read(socket: Socket): Observable<Packet<any>> {
        let obser = (socket as any)._readObser;
        if (!obser) {
            obser = this.createObservable(socket);
            (socket as any)._readObser = obser
        }
        return obser;
    }

    async write(socket: Socket, data: Packet): Promise<void> {
        const { id, body } = data;
        let defer = lang.defer();
        const hpkg = this.encoder.encode(lang.omit(data, 'body')) + this.option.delimiter!;
        socket.write(hpkg, this.option.encoding, err => {
            if (!err) return defer.resolve();
            defer.reject(err);
            socket.emit(ev.ERROR, err);
        });

        if (body !== null) {
            await defer.promise;
            defer = lang.defer();
            if (isStream(body)) {
                const defer = lang.defer();
                body.once(ev.ERROR, (err) => {
                    defer.reject(err)
                });
                body.once(ev.END, () => {
                    defer.resolve()
                });
                body.pipe(socket);
                return await defer.promise
                    .then(() => {
                        if (body instanceof Readable) body.destroy();
                    })
            }

            const bpkg = this.encoder.encode({ id, body }) + this.option.delimiter!;
            socket.write(bpkg, this.option.encoding, err => {
                if (!err) return defer.resolve();
                defer.reject(err);
                socket.emit(ev.ERROR, err);
            });
            return await defer.promise;
        }
    }

    protected createObservable(socket: Socket): Observable<Packet> {
        return new Observable((observer: Observer<any>) => {
            const onClose = (err?: any) => {
                if (err) {
                    observer.error(new TcpErrorResponse(500, err));
                } else {
                    observer.complete();
                }
            }

            const onError = (err: any) => {
                observer.error(new TcpErrorResponse(500, err.message));
            };

            let buffer = '';
            const delimiter = this.option.delimiter!;
            const onData = (data: Buffer | string) => {
                try {
                    buffer += (isString(data) ? data : data.toString(this.option.encoding));
                    const idx = buffer.indexOf(delimiter);
                    if (idx <= 0) {
                        if (idx === 0) {
                            buffer = '';
                        }
                        return;
                    }

                    let rest: string | undefined;

                    const pkg = buffer.substring(0, idx);
                    if (idx < buffer.length - 1) {
                        rest = buffer.substring(idx + 1);
                    }
                    if (pkg) {
                        buffer = '';
                        const packet = this.decoder.decode(pkg);
                        observer.next(packet);
                    }
                    if (rest) {
                        onData(rest);
                    }
                } catch (err: any) {
                    socket.emit(ev.ERROR, err.message);
                    socket.end();
                    observer.error(new TcpErrorResponse(err.status ?? 500, err.message));
                }
            };

            const onEnd = () => {
                observer.complete();
            };

            socket.on(ev.CLOSE, onClose);
            socket.on(ev.ERROR, onError);
            socket.on(ev.ABOUT, onError);
            socket.on(ev.TIMEOUT, onError);
            socket.on(ev.DATA, onData);
            socket.on(ev.END, onEnd);

            return () => {
                socket.off(ev.DATA, onData);
                socket.off(ev.END, onEnd);
                socket.off(ev.ERROR, onError);
                socket.off(ev.ABOUT, onError);
                socket.off(ev.TIMEOUT, onError);
                socket.emit(ev.CLOSE);
                (socket as any)._readObser = null;
            }
        }).pipe(share());
    }
}

