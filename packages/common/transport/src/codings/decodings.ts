import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Backend, Handler, Interceptor, createHandler } from '@tsdi/core';
import { Observable } from 'rxjs';
import { CodingsOpts } from './mappings';
import { CodingsContext } from './context';
import { Decoder } from './Decoder';
import { Codings } from './Codings';


@Abstract()
export abstract class DecodingsHandler implements Handler<any, any, CodingsContext> {
    abstract handle(input: any, context: CodingsContext): Observable<any>
}

@Injectable()
export class DecodingsBackend implements Backend<any, any, CodingsContext> {

    constructor(
        private codings: Codings
    ) { }

    handle(input: any, context: CodingsContext): Observable<any> {
        return this.codings.decodeType('JSON', input, context);
    }
}


/**
 * decodings interceptors.
 */
export const DECODINGS_INTERCEPTORS = tokenId<Interceptor<any, any, CodingsContext>[]>('DECODINGS_INTERCEPTORS');



export class Decodings extends Decoder {

    constructor(readonly handler: DecodingsHandler) {
        super()
    }

}


@Injectable()
export class DecodingsFactory {
    create(injector: Injector, options: CodingsOpts): Decodings {
        const handler = createHandler(injector, {
            interceptorsToken: DECODINGS_INTERCEPTORS,
            backend: DecodingsBackend,
            ...options
        }) as DecodingsHandler;

        return new Decodings(handler)
    }
}

