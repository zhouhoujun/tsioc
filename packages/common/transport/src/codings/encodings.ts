import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Backend, Handler, Interceptor, createHandler } from '@tsdi/core';
import { TransportHeaders } from '@tsdi/common';
import { Observable, of, throwError } from 'rxjs';
import { CodingsOpts } from './mappings';
import { CodingsContext } from './context';
import { Encoder } from './Encoder';
import { Codings } from './Codings';

@Abstract()
export abstract class EncodingsHandler implements Handler<any, any, CodingsContext> {
    abstract handle(input: Buffer, context: CodingsContext): Observable<any>
}



@Injectable()
export class EncodingsBackend implements Backend<any, any, CodingsContext> {

    constructor(
        private codings: Codings
    ) { }

    handle(input: any, context: CodingsContext): Observable<any> {
        input = { ...input };
        try {
            if (input.headers instanceof TransportHeaders) {
                input.headers = input.headers.getHeaders();
            }
            const jsonStr = JSON.stringify(input);
            const buff = Buffer.from(jsonStr);
            return of(buff);
        } catch (err) {
            return throwError(() => err);
        }
    }
}


/**
 * Encodings interceptors.
 */
export const ENCODINGS_INTERCEPTORS = tokenId<Interceptor<any, any, CodingsContext>[]>('ENCODINGS_INTERCEPTORS');

/**
 * buffer encoding interceptor for backend.
 */
export const BUFFER_ENCODE_INTERCEPTORS = tokenId<Interceptor<any, Buffer, CodingsContext>[]>('BUFFER_ENCODE_INTERCEPTORS');

export class Encodings extends Encoder {

    constructor(readonly handler: EncodingsHandler) {
        super()
    }

}


@Injectable()
export class EncodingsFactory {
    create(injector: Injector, options: CodingsOpts): Encodings {
        const handler = createHandler(injector, {
            globalInterceptorsToken: ENCODINGS_INTERCEPTORS,
            interceptorsToken: BUFFER_ENCODE_INTERCEPTORS,
            backend: EncodingsBackend,
            ...options
        }) as EncodingsHandler;
        return new Encodings(handler)
    }
}


