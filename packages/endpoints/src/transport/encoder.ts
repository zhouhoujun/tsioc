import { ArgumentExecption, Injectable, Injector, isNil, isString, tokenId } from '@tsdi/ioc';
import { Handler, InterceptorHandler } from '@tsdi/core';
import { Context, EncodeInterceptor, Encoder, EncoderBackend, Packet, SendPacket, isBuffer } from '@tsdi/common';
import { Observable, map, mergeMap, of, range, throwError } from 'rxjs';
import { Buffer } from 'buffer';


/**
 * global encoder interceptors token
 */
export const ENCODER_INTERCEPTORS = tokenId<EncodeInterceptor[]>('ENCODER_INTERCEPTORS');
/**
 * client encode interceptors
 */
export const CLIENT_ENCODER_INTERCEPTORS = tokenId<EncodeInterceptor[]>('CLIENT_ENCODER_INTERCEPTORS');
/**
 * server encode interceptors
 */
export const SERVER_ENCODER_INTERCEPTORS = tokenId<EncodeInterceptor[]>('SERVER_ENCODER_INTERCEPTORS');


@Injectable()
export class InterceptingEncoder implements Encoder {
    private gloablChain!: Encoder;
    private serverChain!: Encoder;
    private clientChain!: Encoder;

    constructor(private backend: EncoderBackend, private injector: Injector) { }

    handle(ctx: Context): Observable<Buffer> {
        return this.getChain(ctx.serverSide).handle(ctx)
    }

    getChain(server?: boolean) {
        let chain = server ? this.serverChain : this.clientChain;
        if (!chain) {
            if (!this.gloablChain) this.gloablChain = this.injector.get(ENCODER_INTERCEPTORS, []).reduceRight((next, interceptor) => new InterceptorHandler(next, interceptor), this.backend);

            const extendsInters = this.injector.get(server ? SERVER_ENCODER_INTERCEPTORS : CLIENT_ENCODER_INTERCEPTORS, []);
            chain = extendsInters.length ? extendsInters.reduceRight((next, interceptor) => new InterceptorHandler(next, interceptor), this.gloablChain) : this.gloablChain;

            if (server) {
                this.serverChain = chain;
            } else {
                this.clientChain = chain;
            }
        }
        return chain;
    }
}



@Injectable()
export class SimpleEncoderBackend implements EncoderBackend {

    handle(ctx: Context): Observable<Buffer> {

        if (!ctx || !ctx.packet) return throwError(() => new ArgumentExecption('encoding input empty'));

        if (ctx.delimiter && ctx.headerDelimiter) {
            const pkg = ctx.packet as SendPacket;
            if (pkg && !pkg.__sent) {
                const headBuf = ctx.session.serialize(pkg, false);
                ctx.raw = Buffer.concat([headBuf, ctx.headerDelimiter, ctx.raw ?? Buffer.alloc(0)]);
                pkg.__sent = true;
            }
        } else if(ctx.delimiter) {
            ctx.raw = ctx.session.serialize(ctx.packet, true);
        }
        if (!ctx.raw) return throwError(() => new ArgumentExecption('raw data empty'));
        return of(ctx.raw);

    }

}



@Injectable()
export class BufferifyEncodeInterceptor implements EncodeInterceptor {

    intercept(input: Context<Packet<any>>, next: Handler<Context<Packet<any>>, Buffer>): Observable<Buffer> {
        const payload = input.packet?.payload;
        if (isNil(payload)) return next.handle(input);

        if (isBuffer(payload)) {
            input.raw = payload;
            return next.handle(input);
        }

        if (isString(payload)) {
            input.raw = Buffer.from(payload);
            return next.handle(input);
        }

        const streamAdapter = input.session.streamAdapter;
        if (streamAdapter.isReadable(payload)) {
            return new Observable<Context>(subsr => {
                streamAdapter.pipeTo(payload, streamAdapter.createWritable({
                    write(chunk, encoding, callback) {
                        input.raw = chunk;
                        subsr.next(input);
                        callback();
                    }
                })).then(() => {
                    subsr.complete();
                }).catch(err => {
                    subsr.error(err);
                })
                return () => subsr.unsubscribe()
            }).pipe(
                mergeMap(chunk => next.handle(chunk))
            )
        }

        // body: json
        input.raw = Buffer.from(JSON.stringify(payload));
        if (!input.packet!.length) {
            input.packet!.length = Buffer.byteLength(input.raw);
        }

        return next.handle(input);
    }

}


@Injectable()
export class SubpacketBufferEncodeInterceptor implements EncodeInterceptor {

    intercept(input: Context<Packet>, next: Handler<Context<Packet<any>>, Buffer>): Observable<Buffer> {

        return next.handle(input)
            .pipe(
                mergeMap(buf => {
                    if (!buf) {
                        buf = Buffer.alloc(0);
                    }
                    if (input.session.options.maxSize) {
                        let maxSize = input.session.options.maxSize;
                        if (!input.headers) {
                            maxSize = maxSize - Buffer.byteLength(maxSize.toString()) - (input.delimiter ? Buffer.byteLength(input.delimiter) : 0) - ((input.headers) ? 0 : 2) // 2 packet id;
                        }
                        if (buf.length <= maxSize) {
                            return of(buf);
                        } else {

                            const len = buf.length;
                            const count = (len % maxSize === 0) ? (len / maxSize) : (Math.floor(len / maxSize) + 1);

                            return range(1, count)
                                .pipe(
                                    map(i => {
                                        const end = i * maxSize;
                                        return buf.subarray(end - maxSize, end > len ? len : end)
                                    })
                                )
                        }

                    } else {
                        return of(buf);
                    }
                })
            )

    }

}

@Injectable()
export class FinalizeEncodeInterceptor implements EncodeInterceptor {

    intercept(input: Context, next: Handler<Context, Buffer>): Observable<Buffer> {
        return next.handle(input)
            .pipe(
                map(data => {
                    if (!input.delimiter) return data;
                    if (input.headers) {
                        return Buffer.concat([
                            Buffer.from(String(data.length)),
                            input.delimiter,
                            data
                        ])
                    }

                    // data = input.session.attachId(data, input.packet.id);
                    const bufId = Buffer.alloc(2);
                    bufId.writeUInt16BE(input.packet!.id);
                    return Buffer.concat([
                        Buffer.from(String(data.length + bufId.length)),
                        input.delimiter,
                        bufId,
                        data
                    ])
                })
            )
    }

}