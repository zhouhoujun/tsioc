import { Injector, tokenId } from '@tsdi/ioc';
import { CanActivate, ExecptionHandlerFilter, Interceptor, createHandler } from '@tsdi/core';
import { Message, Packet } from '@tsdi/common';
import {
    DECODINGS_FILTERS, DECODINGS_GUARDS, DECODINGS_INTERCEPTORS, Decodings, DecodingsBackend, DecodingsFactory,
    ENCODINGS_FILTERS, ENCODINGS_GUARDS, ENCODINGS_INTERCEPTORS, Encodings, EncodingsBackend, EncodingsFactory
} from '@tsdi/common/codings';
import { TransportOpts } from './TransportSession';
import { TransportContext } from './context';




/**
 * Transport encodings interceptors.
 */
export const TRANSPORT_ENCODINGS_INTERCEPTORS = tokenId<Interceptor<Packet, Message, TransportContext>[]>('TRANSPORT_ENCODINGS_INTERCEPTORS');


/**
 *  Transport encodings filters.
 */
export const TRANSPORT_ENCODINGS_FILTERS = tokenId<Interceptor<Packet, Message, TransportContext>[]>('TRANSPORT_ENCODINGS_FILTERS');


/**
 *  Transport encodings guards.
 */
export const TRANSPORT_ENCODINGS_GUARDS = tokenId<CanActivate[]>('TRANSPORT_ENCODINGS_GUARDS');


/**
 * Transport encodings factory.
 */
export class TransportEncodingsFactory implements EncodingsFactory {
    create(injector: Injector, options: TransportOpts): Encodings {
        const handler = createHandler(injector, {
            interceptorsToken: TRANSPORT_ENCODINGS_INTERCEPTORS,
            filtersToken: TRANSPORT_ENCODINGS_FILTERS,
            guardsToken: TRANSPORT_ENCODINGS_GUARDS,
            backend: createHandler(injector, {
                filters: [ExecptionHandlerFilter],
                filtersToken: ENCODINGS_FILTERS,
                guardsToken: ENCODINGS_GUARDS,
                interceptorsToken: ENCODINGS_INTERCEPTORS,
                backend: EncodingsBackend,
            }),
            ...options.encodings
        });
        return new Encodings(handler)
    }
}


/**
 * Transport decodings interceptors.
 */
export const TRANSPORT_DECODINGS_INTERCEPTORS = tokenId<Interceptor<Message, Packet, TransportContext>[]>('TRANSPORT_DECODINGS_INTERCEPTORS');

/**
 *  Transport decodings filters.
 */
export const TRANSPORT_DECODINGS_FILTERS = tokenId<Interceptor<Message, Packet, TransportContext>[]>('TRANSPORT_DECODINGS_FILTERS');

/**
 *  Transport decodings guards.
 */
export const TRANSPORT_DECODINGS_GUARDS = tokenId<CanActivate[]>('TRANSPORT_DECODINGS_GUARDS');


/**
 * Transport decodings factory.
 */
export class TransportDecodingsFactory implements DecodingsFactory {

    create(injector: Injector, options: TransportOpts): Decodings {
        const handler = createHandler(injector, {
            guardsToken: TRANSPORT_DECODINGS_GUARDS,
            interceptorsToken: TRANSPORT_DECODINGS_INTERCEPTORS,
            filtersToken: TRANSPORT_DECODINGS_FILTERS,
            backend: createHandler(injector, {
                filters: [ExecptionHandlerFilter],
                filtersToken: DECODINGS_FILTERS,
                guardsToken: DECODINGS_GUARDS,
                interceptorsToken: DECODINGS_INTERCEPTORS,
                backend: DecodingsBackend,
            }),
            ...options.decodings
        });

        return new Decodings(handler)
    }
}