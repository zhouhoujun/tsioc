import { Abstract, ArgumentExecption, Injectable, Injector, isNil, isString, tokenId } from '@tsdi/ioc';
import { Handler, Interceptor, InterceptorHandler } from '@tsdi/core';
import { Context, EncodeInterceptor, Encoder, EncoderBackend, Packet, SendPacket, StreamAdapter, isBuffer } from '@tsdi/common';
import { Observable, mergeMap, of, throwError, map, range } from 'rxjs';


@Abstract()
export abstract class AssetEncoder implements Encoder {
    abstract handle(ctx: Context): Observable<Buffer>;
}

@Abstract()
export abstract class AssetEncoderBackend implements EncoderBackend {
    abstract handle(ctx: Context): Observable<Buffer>;
}


/**
 * asset encode interceptors
 */
export const ASSET_ENCODER_INTERCEPTORS = tokenId<Interceptor<Context, Buffer>[]>('ASSET_ENCODER_INTERCEPTORS')


@Injectable()
export class AssetInterceptingEncoder implements Encoder {
    private chain!: Encoder;

    constructor(private backend: AssetEncoderBackend, private injector: Injector) { }

    handle(ctx: Context): Observable<Buffer> {
        if (!this.chain) {
            const interceptors = this.injector.get(ASSET_ENCODER_INTERCEPTORS, []);
            this.chain = interceptors.reduceRight(
                (next, interceptor) => new InterceptorHandler(next, interceptor), this.backend)
        }
        return this.chain.handle(ctx)
    }
}



@Injectable()
export class SimpleAssetEncoderBackend implements AssetEncoderBackend {

    handle(ctx: Context): Observable<Buffer> {
        if (ctx.delimiter && ctx.headerDelimiter) {
            const pkg = ctx.packet as SendPacket;
            if (pkg && !pkg.__sent) {
                const headBuf = ctx.session.serialize(pkg, false);
                ctx.raw = Buffer.concat([headBuf, ctx.headerDelimiter, ctx.raw ?? Buffer.alloc(0)]);
                pkg.__sent = true;
            }
        }
        if (!ctx.raw) throwError(() => new ArgumentExecption('asset decoding input empty'));
        return of(ctx.raw!);
    }

}


@Injectable()
export class BufferifyEncodeInterceptor implements EncodeInterceptor {

    constructor(private streamAdapter: StreamAdapter) { }

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

        if (this.streamAdapter.isReadable(payload)) {
            return new Observable<Context>(subsr => {
                this.streamAdapter.pipeTo(payload, this.streamAdapter.createWritable({
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
                        if(!input.headers) {
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
export class FinalizeAssetEncodeInterceptor implements EncodeInterceptor {

    intercept(input: Context, next: Handler<Context, Buffer>): Observable<Buffer> {
        return next.handle(input)
            .pipe(
                map(data => {
                    if (!input.delimiter) return data;

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