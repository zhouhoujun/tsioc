import { Abstract, ArgumentExecption, Injectable, Injector, isNil, isString, tokenId } from '@tsdi/ioc';
import { Handler, Interceptor, InterceptorHandler } from '@tsdi/core';
import { Context, EncodeInterceptor, Encoder, EncoderBackend, Packet, StreamAdapter, isBuffer } from '@tsdi/common';
import { Observable, mergeMap, of, throwError } from 'rxjs';


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

interface SendPacket extends Packet {
    __sent?: boolean
}

@Injectable()
export class BufferifyEncodeInterceptor implements EncodeInterceptor {
    constructor(private streamAdapter: StreamAdapter) {

    }
    intercept(input: Context<Packet<any>>, next: Handler<Context<Packet<any>>, Buffer>): Observable<Buffer> {
        const payload = input.packet?.payload;
        if(isNil(payload)) return next.handle(input);

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
        input.packet!.length = Buffer.byteLength(input.raw);

        return next.handle(input);
    }

}

@Injectable()
export class SimpleAssetEncoderBackend implements AssetEncoderBackend {

    handle(ctx: Context): Observable<Buffer> {
        if (ctx.packet && !(ctx.packet as SendPacket).__sent) {
            const { length, payload, ...data } = ctx.packet;
            const headBuf = Buffer.from(JSON.stringify(data));
            ctx.raw = Buffer.concat([headBuf, ctx.headerDelimiter!, ctx.raw ?? Buffer.alloc(0)]);
            (ctx.packet as SendPacket).__sent = true;
        }
        if (!ctx.raw) throwError(() => new ArgumentExecption('asset decoding input empty'));
        return of(ctx.raw!);
    }

}
