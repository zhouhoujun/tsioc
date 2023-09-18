import { Packet } from '@tsdi/common';
import { Handler, Interceptor } from '@tsdi/core';
import { Abstract, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Context } from './context';



@Abstract()
export abstract class Decoder implements Handler<Context, Packet> {

    abstract handle(ctx: Context): Observable<Packet>;
}

export const DECODINGS = tokenId<Interceptor<Context, Packet>[]>('DECODINGS');