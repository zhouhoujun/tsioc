import { Abstract, Injectable, Injector, Module, Optional, Type, getClass, getClassName, lang, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Encoder, InputContext } from '@tsdi/common';
import { Observable, mergeMap, of, throwError } from 'rxjs';
import { NotSupportedExecption } from '../execptions';
import { Mappings } from './mappings';
import { JsonEncodeHandler } from './json/json.encodings';
import { TransportOpts } from '../TransportSession';


@Abstract()
export abstract class EncodingsHandler implements Handler<any, any, InputContext> {
    abstract handle(input: Buffer, context: InputContext): Observable<any>
}


@Injectable({ static: true })
export class EncodingMappings extends Mappings {

}



@Injectable()
export class EncodingsBackend implements Backend<any, any, InputContext> {

    constructor(
        private mappings: EncodingMappings,
        @Optional() private jsonEncodeHandler: JsonEncodeHandler
    ) { }

    handle(input: any, context: InputContext): Observable<any> {
        const type = getClass(input);
        const handlers = this.mappings.getHanlder(type);

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


@Abstract()
export abstract class EcodingInterceptorsResolver {

    getToken() {
        return ENCODINGS_INTERCEPTORS
    }

    abstract resove(): Interceptor[];
}




@Injectable()
export class EncodingsInterceptingHandler extends InterceptingHandler<Buffer, any, InputContext>  {
    constructor(backend: EncodingsBackend, resover: EcodingInterceptorsResolver) {
        super(backend, () => resover.resove())
    }
}



export class Encodings extends Encoder {

    constructor(readonly handler: EncodingsHandler) {
        super()
    }

}

@Abstract()
export abstract class EncodingsFactory {
    abstract create(injector: Injector, options: TransportOpts): Encodings;
}

@Injectable()
export class DefaultEncodingsFactory {
    create(injector: Injector, options: TransportOpts): Encodings {
        return new Encodings(injector.resolve(EncodingsHandler))
    }
}


@Module({
    providers: [
        EncodingMappings,
        EncodingsBackend,
        { provide: EncodingsHandler, useClass: EncodingsInterceptingHandler },
        {provide: EncodingsFactory, useClass: DefaultEncodingsFactory }
    ]
})
export class EncodingsModule {

}