import { Abstract, EMPTY, Injectable, Injector, Optional, getClass, getClassName, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Observable, mergeMap, of, throwError } from 'rxjs';
import { Encoder, CodingsContext } from '../codings';
import { NotSupportedExecption } from '../execptions';
import { CodingMappings, CodingsOpts } from './mappings';

@Abstract()
export abstract class EncodingsHandler implements Handler<any, any, CodingsContext> {
    abstract handle(input: Buffer, context: CodingsContext): Observable<any>
}

@Abstract()
export abstract class DefaultEncodingsHandler implements EncodingsHandler {
    abstract handle(input: Buffer, context: CodingsContext): Observable<any>
}


@Injectable()
export class EncodingsBackend implements Backend<any, any, CodingsContext> {

    constructor(
        private mappings: CodingMappings,
        @Optional() private defaultEncodeHandler: DefaultEncodingsHandler
    ) { }

    handle(input: any, context: CodingsContext): Observable<any> {
        const type = getClass(input);
        
        const handlers = this.mappings.getEncodeHanlders(type, context.options);
        if (handlers && handlers.length) {
            return handlers.reduceRight((obs$, curr) => {
                return obs$.pipe(
                    mergeMap(input => curr.handle(input, context.next(input)))
                );
            }, of(input))
        } else {
            if (!this.defaultEncodeHandler) return throwError(() => new NotSupportedExecption(`No encodings handler for ${getClassName(type)} of ${context.options.transport}${context.options.microservice ? ' microservice' : ''}${context.options.client ? ' client' : ''}`));
            return this.defaultEncodeHandler.handle(input, context)
        }
    }
}


/**
 * Encodings interceptors.
 */
export const ENCODINGS_INTERCEPTORS = tokenId<Interceptor<any, any, CodingsContext>[]>('ENCODINGS_INTERCEPTORS');


@Injectable({ static: false })
export class EncodingsInterceptingHandler extends InterceptingHandler<Buffer, any, CodingsContext> {
    constructor(backend: EncodingsBackend, injector: Injector) {
        super(backend, () => injector.get(ENCODINGS_INTERCEPTORS, EMPTY))
    }
}



export class Encodings extends Encoder {

    constructor(readonly handler: EncodingsHandler) {
        super()
    }

}

@Abstract()
export abstract class EncodingsFactory {
    abstract create(injector: Injector, options: CodingsOpts): Encodings;
}

@Injectable()
export class DefaultEncodingsFactory {
    create(injector: Injector, options: CodingsOpts): Encodings {
        return new Encodings(injector.resolve(EncodingsHandler, [
            { provide: Injector, useValue: injector }
        ]))
    }
}


