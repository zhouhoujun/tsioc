import { Abstract, EMPTY, Injectable, Injector, Optional, getClass, getClassName, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Observable, mergeMap, of, throwError } from 'rxjs';
import { NotSupportedExecption } from '../execptions';
import { CodingMappings, CodingsOpts } from './mappings';
import { CodingsContext } from './context';
import { Decoder } from './Decoder';


@Abstract()
export abstract class DecodingsHandler implements Handler<any, any, CodingsContext> {
    abstract handle(input: any, context: CodingsContext): Observable<any>
}

@Abstract()
export abstract class DefaultDecodingsHandler implements DecodingsHandler {
    abstract handle(input: any, context: CodingsContext): Observable<any>
}


@Injectable()
export class DecodingsBackend implements Backend<any, any, CodingsContext> {

    constructor(
        private mappings: CodingMappings,
        @Optional() private defaultDecodeHanlder: DefaultDecodingsHandler
    ) { }

    handle(input: any, context: CodingsContext): Observable<any> {
        const type = getClass(input);
        const handlers = this.mappings.getDecodeHanlders(type, context.options);

        if (handlers && handlers.length) {
            return handlers.reduceRight((obs$, curr) => {
                return obs$.pipe(
                    mergeMap(input => curr.handle(input, context.next(input)))
                );
            }, of(input))
        } else {
            if (this.defaultDecodeHanlder) return this.defaultDecodeHanlder.handle(input, context)
            return throwError(() => new NotSupportedExecption(`No decodings handler for ${getClassName(type)} of ${context.options.transport}${context.options.microservice ? ' microservice' : ''}${context.options.client? ' client': ''}`))
        }
    }
}


/**
 * decodings interceptors.
 */
export const DECODINGS_INTERCEPTORS = tokenId<Interceptor<any, any, CodingsContext>[]>('DECODINGS_INTERCEPTORS');


@Injectable({ static: false })
export class DecodingsInterceptingHandler extends InterceptingHandler<Buffer, any, CodingsContext>  {
    constructor(backend: DecodingsBackend, injector: Injector) {
        super(backend, () => injector.get(DECODINGS_INTERCEPTORS, EMPTY))
    }
}



export class Decodings extends Decoder {

    constructor(readonly handler: DecodingsHandler) {
        super()
    }

}


@Abstract()
export abstract class DecodingsFactory {
    abstract create(injector: Injector, options: CodingsOpts): Decodings;
}

@Injectable()
export class DefaultDecodingsFactory {
    create(injector: Injector, options: CodingsOpts): Decodings {
        return new Decodings(injector.resolve(DecodingsHandler, [
            { provide: Injector, useValue: injector }
        ]))
    }
}

