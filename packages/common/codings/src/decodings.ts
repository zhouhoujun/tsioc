import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Backend, Handler, Interceptor, createHandler } from '@tsdi/core';
import { Observable } from 'rxjs';
import { CodingsOpts } from './options';
import { CodingsContext } from './context';
import { Decoder } from './Decoder';
import { Codings } from './Codings';


/**
 * Decodings Handler
 */
@Abstract()
export abstract class DecodingsHandler implements Handler<any, any, CodingsContext> {
    abstract handle(input: any, context: CodingsContext): Observable<any>
}

// /**
//  * Decodings Backend
//  */
// @Injectable()
// export class DecodingsBackend implements Backend<any, any, CodingsContext> {
//     constructor(private streamAdapter: StreamAdapter) { }

//     handle(input: any, context: CodingsContext): Observable<any> {
//         return defer(async () => {
//             if (this.streamAdapter.isReadable(input)) {
//                 return await toBuffer(input, context.options.maxSize)
//             }
//             return input
//         }).pipe(
//             map(data => {
//                 const jsonStr = isString(data) ? data : new TextDecoder().decode(data);
//                 try {
//                     const buff = JSON.parse(jsonStr);
//                     return buff;
//                 } catch (err) {
//                     throw new InvalidJsonException(err, jsonStr);
//                 }
//             }));
//     }
// }

/**
 * Decodings Backend
 */
@Injectable()
export class DecodingsBackend implements Backend<any, any, CodingsContext> {
    constructor(private codings: Codings) { }

    handle(input: any, context: CodingsContext): Observable<any> {
        return this.codings.deepDecode(input, context);
    }
}


/**
 * gloabl decodings interceptors.
 */
export const GLOBAL_DECODINGS_INTERCEPTORS = tokenId<Interceptor<any, any, CodingsContext>[]>('GLOBAL_DECODINGS_INTERCEPTORS');
/**
 *  decodings interceptors.
 */
export const DECODINGS_INTERCEPTORS = tokenId<Interceptor<Buffer, any, CodingsContext>[]>('DECODINGS_INTERCEPTORS');

/**
 *  decodings filters.
 */
export const DECODINGS_FILTERS = tokenId<Interceptor<Buffer, any, CodingsContext>[]>('DECODINGS_FILTERS');


/**
 *  global decodings filters.
 */
export const GLOBAL_DECODINGS_FILTERS = tokenId<Interceptor<Buffer, any, CodingsContext>[]>('GLOBAL_DECODINGS_FILTERS');

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
            globalInterceptorsToken: GLOBAL_DECODINGS_INTERCEPTORS,
            interceptorsToken: DECODINGS_INTERCEPTORS,
            globalFiltersToken: GLOBAL_DECODINGS_FILTERS,
            filtersToken: DECODINGS_FILTERS,
            backend: DecodingsBackend,
            ...options?.decodes
        }) as DecodingsHandler;

        return new Decodings(handler)
    }
}

