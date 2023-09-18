import { Handler, Interceptor } from '@tsdi/core';
import { Abstract, tokenId } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Context } from './context';


@Abstract()
export abstract class Encoder implements Handler<Context, Buffer> {

    abstract handle(ctx: Context): Observable<Buffer>;
}


export const ENCODINGS = tokenId<Interceptor<Context, Buffer>[]>('ENCODINGS');