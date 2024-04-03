import { Abstract, EMPTY, Injectable, Injector, Optional, getClass, getClassName, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Encoder, InputContext } from '@tsdi/common';
import { Observable, mergeMap, of, throwError } from 'rxjs';
import { NotSupportedExecption } from '../execptions';
import { CodingMappings, CodingsOpts } from './mappings';
import { JsonEncodeHandler } from './json/json.encodings';

@Abstract()
export abstract class EncodingsHandler implements Handler<any, any, InputContext> {
    abstract handle(input: Buffer, context: InputContext): Observable<any>
}



@Injectable()
export class EncodingsBackend implements Backend<any, any, InputContext> {

    constructor(
        private mappings: CodingMappings,
        @Optional() private jsonEncodeHandler: JsonEncodeHandler
    ) { }

    handle(input: any, context: InputContext): Observable<any> {
        const type = getClass(input);
        const handlers = this.mappings.getEncodings().getHanlder(type);

        if (handlers && handlers.length) {
            return handlers.reduceRight((obs$, curr) => {
                return obs$.pipe(
                    mergeMap(input => curr.handle(input, context.next(input)))
                );
            }, of(input))
        } else {
            if (!this.jsonEncodeHandler) return throwError(() => new NotSupportedExecption('No encodings handler for' + getClassName(type)));
            return this.jsonEncodeHandler.handle(input, context)
        }
    }
}


/**
 * Encodings interceptors.
 */
export const ENCODINGS_INTERCEPTORS = tokenId<Interceptor<any, any, InputContext>[]>('ENCODINGS_INTERCEPTORS');


@Injectable({ static: false })
export class EncodingsInterceptingHandler extends InterceptingHandler<Buffer, any, InputContext>  {
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


