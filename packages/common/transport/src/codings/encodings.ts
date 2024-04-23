import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Backend, Handler, Interceptor, createHandler } from '@tsdi/core';
import { Observable } from 'rxjs';
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
        // private mappings: CodingMappings,
        // @Optional() private defaultEncodeHandler: DefaultEncodingsHandler
    ) { }

    handle(input: any, context: CodingsContext): Observable<any> {
        return this.codings.encodeType('JSON', input, context)
        // const type = getClass(input);

        // const handlers = this.mappings.getEncodeHanlders(type, context.options);
        // if (handlers && handlers.length) {
        //     return handlers.reduceRight((obs$, curr) => {
        //         return obs$.pipe(
        //             mergeMap(input => curr.handle(input, context.next(input)))
        //         );
        //     }, of(input))
        // } else {
        //     if (!this.defaultEncodeHandler) return throwError(() => new NotSupportedExecption(`No encodings handler for ${getClassName(type)} of ${context.options.transport}${context.options.microservice ? ' microservice' : ''}${context.options.client ? ' client' : ''}`));
        //     return this.defaultEncodeHandler.handle(input, context)
        // }
    }
}


/**
 * Encodings interceptors.
 */
export const ENCODINGS_INTERCEPTORS = tokenId<Interceptor<any, any, CodingsContext>[]>('ENCODINGS_INTERCEPTORS');



export class Encodings extends Encoder {

    constructor(readonly handler: EncodingsHandler) {
        super()
    }

}


@Injectable()
export class EncodingsFactory {
    create(injector: Injector, options: CodingsOpts): Encodings {
        const handler = createHandler(injector, {
            interceptorsToken: ENCODINGS_INTERCEPTORS,
            backend: EncodingsBackend,
            ...options
        }) as EncodingsHandler;
        return new Encodings(handler)
    }
}


