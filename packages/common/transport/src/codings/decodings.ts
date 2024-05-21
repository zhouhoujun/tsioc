import { Abstract, Injectable, Injector, isString, tokenId } from '@tsdi/ioc';
import { Backend, Handler, Interceptor, createHandler } from '@tsdi/core';
import { Observable, defer, map } from 'rxjs';
import { CodingsOpts } from './options';
import { CodingsContext } from './context';
import { Decoder } from './Decoder';
import { InvalidJsonException } from '../execptions';
import { StreamAdapter, toBuffer } from '../StreamAdapter';


/**
 * Decodings Handler
 */
@Abstract()
export abstract class DecodingsHandler implements Handler<any, any, CodingsContext> {
    abstract handle(input: any, context: CodingsContext): Observable<any>
}

/**
 * Decodings Backend
 */
@Injectable()
export class DecodingsBackend implements Backend<any, any, CodingsContext> {
    constructor(private streamAdapter: StreamAdapter) { }

    handle(input: any, context: CodingsContext): Observable<any> {
        return defer(async () => {
            if (this.streamAdapter.isReadable(input)) {
                return await toBuffer(input, context.options.maxSize)
            }
            return input
        }).pipe(
            map(data => {
                const jsonStr = isString(data) ? data : new TextDecoder().decode(data);
                try {
                    const buff = JSON.parse(jsonStr);
                    return buff;
                } catch (err) {
                    throw new InvalidJsonException(err, jsonStr);
                }
            }));
    }
}


/**
 * endpoint decodings interceptors.
 */
export const ENDPOINT_DECODINGS_INTERCEPTORS = tokenId<Interceptor<any, any, CodingsContext>[]>('ENDPOINT_DECODINGS_INTERCEPTORS');
/**
 *  decodings interceptors.
 */
export const DECODINGS_INTERCEPTORS = tokenId<Interceptor<Buffer, any, CodingsContext>[]>('DECODINGS_INTERCEPTORS');

/**
 *  decodings filters.
 */
export const DECODINGS_FILTERS = tokenId<Interceptor<Buffer, any, CodingsContext>[]>('DECODINGS_FILTERS');


/**
 *  endpoint decodings filters.
 */
export const ENDPOIN_DECODINGS_FILTERS = tokenId<Interceptor<Buffer, any, CodingsContext>[]>('ENDPOIN_DECODINGS_FILTERS');

/**
 * Decodings
 */
export class Decodings extends Decoder {

    constructor(readonly handler: DecodingsHandler) {
        super()
    }

}

/**
 * Decodings factory
 */
@Injectable()
export class DecodingsFactory {
    create(injector: Injector, options: CodingsOpts): Decodings {
        const handler = createHandler(injector, {
            globalInterceptorsToken: ENDPOINT_DECODINGS_INTERCEPTORS,
            interceptorsToken: DECODINGS_INTERCEPTORS,
            globalFiltersToken: ENDPOIN_DECODINGS_FILTERS,
            filtersToken: DECODINGS_FILTERS,
            backend: DecodingsBackend,
            ...options?.decodes
        }) as DecodingsHandler;

        return new Decodings(handler)
    }
}

