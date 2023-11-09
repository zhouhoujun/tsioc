import { Injectable, isString } from '@tsdi/ioc';
import { isBuffer } from '@tsdi/common';
import { Observable, of } from 'rxjs';
import { BufferOutgoingEncoder, EmptyOutgoingEncoder, OutgoingEncodeInterceptor, OutgoingEncoder, OutgoingEncoderBackend, OutgoingType, StreamOutgoingEncoder } from './codings';
import { TransportContext } from '../TransportContext';
import { AssetContext } from '../AssetContext';


@Injectable()
export class OutgoingPipeEncodeInterceptor implements OutgoingEncodeInterceptor<TransportContext, OutgoingType> {

    constructor(
        private empty: EmptyOutgoingEncoder,
        private stream: StreamOutgoingEncoder
    ) {

    }

    intercept(ctx: TransportContext, next: OutgoingEncoder<TransportContext>): Observable<OutgoingType> {

        if (null == ctx.body || (ctx instanceof AssetContext && ctx.isEmpty())) {
            return this.empty.handle(ctx);
        } else if (ctx.streamAdapter.isReadable(ctx.body)) {
            return this.stream.handle(ctx);
        }

        return next.handle(ctx);

    }
}

@Injectable()
export class MixtureOutgoingEncodeBackend implements OutgoingEncoderBackend<TransportContext, OutgoingType> {

    constructor(
        private empty: EmptyOutgoingEncoder,
        private stream: StreamOutgoingEncoder,
        private buffer: BufferOutgoingEncoder
    ) { }

    handle(ctx: TransportContext): Observable<OutgoingType> {
        if (ctx.isEmpty()) {
            return this.empty.handle(ctx);
        } else if (ctx.streamAdapter.isReadable(ctx.body)) {
            return this.stream.handle(ctx);
        }
        return this.buffer.handle(ctx);
    }
}


@Injectable()
export class BufferOutgoingEncodeBackend implements OutgoingEncoderBackend<TransportContext, Buffer> {

    handle(ctx: TransportContext): Observable<Buffer> {
        let body = ctx.body;
        if (isBuffer(body)) return of(body);
        if (isString(body)) return of(Buffer.from(body));

        body = Buffer.from(JSON.stringify(body));
        if (!ctx.sent) {
            ctx.length = Buffer.byteLength(body)
        }

        return of(body)
    }

}
