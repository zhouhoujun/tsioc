import { Abstract, Injectable, Injector, Module, Optional, Type, getClass, getClassName, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor } from '@tsdi/core';
import { Decoder, InputContext } from '@tsdi/common';
import { Observable, mergeMap, of, throwError } from 'rxjs';
import { NotSupportedExecption } from '../execptions';
import { Mappings } from './mappings';
import { JsonDecodeHandler } from './json/json.decodings';
import { TransportOpts } from '../TransportSession';


@Abstract()
export abstract class DecodingsHandler implements Handler<any, any, InputContext> {
    abstract handle(input: Buffer, context: InputContext): Observable<any>
}

@Injectable({ static: true })
export class DecodingMappings extends Mappings {

}


@Injectable()
export class DecodingsBackend implements Backend<any, any, InputContext> {


    constructor(
        private mappings: DecodingMappings,
        @Optional() private jsonDecodeHanlder: JsonDecodeHandler
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
            if (!this.jsonDecodeHanlder) return throwError(() => new NotSupportedExecption('No decodings handler for' + getClassName(type)));
            return this.jsonDecodeHanlder.handle(input, context)
        }
    }
}


/**
 * decodings interceptors.
 */
export const DECODINGS_INTERCEPTORS = tokenId<Interceptor<any, any, InputContext>[]>('DECODINGS_INTERCEPTORS');


@Abstract()
export abstract class DecodingInterceptorsResolver {

    getToken() {
        return DECODINGS_INTERCEPTORS
    }

    abstract resove(): Interceptor[];
}



@Injectable()
export class DecodingsInterceptingHandler extends InterceptingHandler<Buffer, any, InputContext>  {
    constructor(backend: DecodingsBackend, resover: DecodingInterceptorsResolver) {
        super(backend, () => resover.resove())
    }
}



export class Decodings extends Decoder {

    constructor(readonly handler: DecodingsHandler) {
        super()
    }

}


@Abstract()
export abstract class DecodingsFactory {
    abstract create(injector: Injector, options: TransportOpts): Decodings;
}

@Injectable()
export class DefaultDecodingsFactory {
    create(injector: Injector, options: TransportOpts): Decodings {
        return new Decodings(injector.resolve(DecodingsHandler))
    }
}




@Module({
    providers: [
        DecodingMappings,
        DecodingsBackend,
        { provide: DecodingsHandler, useClass: DecodingsInterceptingHandler },
        { provide: DecodingsFactory, useClass: DefaultDecodingsFactory }
    ]
})
export class DecodingsModule {

}