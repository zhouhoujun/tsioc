import { Handler, Interceptor } from '@tsdi/core';
import { Abstract, InvocationContext, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Packet } from './packet';


@Abstract()
export abstract class Context extends InvocationContext {

    abstract get packet(): Packet;
    abstract set packet(pkg: Packet);

    abstract get raw(): Buffer;
    abstract set raw(data: Buffer);
}




@Abstract()
export abstract class Encoder implements Handler<Context, Buffer> {

    abstract handle(ctx: Context): Observable<Buffer>;
}


export const ENCODINGS = tokenId<Interceptor<Context, Buffer>[]>('ENCODINGS');


@Abstract()
export abstract class Decoder implements Handler<Context, Packet> {

    abstract handle(ctx: Context): Observable<Packet>;
}

export const DECODINGS = tokenId<Interceptor<Context, Packet>[]>('DECODINGS');



