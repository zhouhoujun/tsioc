import { Injectable, Injector, tokenId } from '@tsdi/ioc';
import { CanActivate, Interceptor, NotHandleExecption, createHandler } from '@tsdi/core';
import { Decodings, DecodingsBackend, DecodingsFactory, DecodingsHandler, Encodings, EncodingsBackend, EncodingsFactory, EncodingsHandler } from '@tsdi/common/codings';
import { TransportOpts } from './TransportSession';
import { TransportContext } from './context';
import { Observable, catchError, throwError } from 'rxjs';
import { Packet } from '@tsdi/common';




/**
 * Transport encodings interceptors.
 */
export const TRANSPORT_ENCODINGS_INTERCEPTORS = tokenId<Interceptor<any, Buffer, TransportContext>[]>('TRANSPORT_ENCODINGS_INTERCEPTORS');


/**
 *  Transport encodings filters.
 */
export const TRANSPORT_ENCODINGS_FILTERS = tokenId<Interceptor<any, Buffer, TransportContext>[]>('TRANSPORT_ENCODINGS_FILTERS');


/**
 *  Transport encodings guards.
 */
export const TRANSPORT_ENCODINGS_GUARDS = tokenId<CanActivate[]>('TRANSPORT_ENCODINGS_GUARDS');


@Injectable()
export class TransportEncodingsBackend extends EncodingsBackend {
    override handle(input: any, context: TransportContext): Observable<any> {
        return super.handle(input, context)
            .pipe(
                catchError(err => {
                    if (err instanceof NotHandleExecption && input instanceof Packet) {
                        return this.codings.encodeType(Packet, input, context)
                    }
                    return throwError(() => err)
                })
            )
    }
}


/**
 * Transport encodings factory.
 */
export class TransportEncodingsFactory implements EncodingsFactory {
    create(injector: Injector, options: TransportOpts): Encodings {
        const handler = createHandler(injector, {
            interceptorsToken: TRANSPORT_ENCODINGS_INTERCEPTORS,
            filtersToken: TRANSPORT_ENCODINGS_FILTERS,
            guardsToken: TRANSPORT_ENCODINGS_GUARDS,
            backend: TransportEncodingsBackend,
            ...options.encodings
        }) as EncodingsHandler;
        return new Encodings(handler)
    }
}


/**
 * Transport decodings interceptors.
 */
export const TRANSPORT_DECODINGS_INTERCEPTORS = tokenId<Interceptor<Buffer, any, TransportContext>[]>('TRANSPORT_DECODINGS_INTERCEPTORS');

/**
 *  Transport decodings filters.
 */
export const TRANSPORT_DECODINGS_FILTERS = tokenId<Interceptor<Buffer, any, TransportContext>[]>('TRANSPORT_DECODINGS_FILTERS');

/**
 *  Transport decodings guards.
 */
export const TRANSPORT_DECODINGS_GUARDS = tokenId<CanActivate[]>('TRANSPORT_DECODINGS_GUARDS');



@Injectable()
export class TransportDecodingsBackend extends DecodingsBackend {
    override handle(input: any, context: TransportContext): Observable<any> {
        return super.handle(input, context)
            .pipe(
                catchError(err => {
                    if (err instanceof NotHandleExecption && input instanceof Packet) {
                        return this.codings.decodeType(Packet, input, context)
                    }
                    return throwError(() => err)
                })
            )
    }
}

/**
 * Transport decodings factory.
 */
export class TransportDecodingsFactory implements DecodingsFactory {

    create(injector: Injector, options: TransportOpts): Decodings {
        const handler = createHandler(injector, {
            guardsToken: TRANSPORT_DECODINGS_GUARDS,
            interceptorsToken: TRANSPORT_DECODINGS_INTERCEPTORS,
            filtersToken: TRANSPORT_DECODINGS_FILTERS,
            backend: TransportDecodingsBackend,
            ...options.decodings
        }) as DecodingsHandler;

        return new Decodings(handler)
    }
}