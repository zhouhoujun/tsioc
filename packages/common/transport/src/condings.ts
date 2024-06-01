import { Injectable, Injector, tokenId } from '@tsdi/ioc';
import { CanActivate, Interceptor, createHandler } from '@tsdi/core';
import { Message, Packet } from '@tsdi/common';
import { Decodings, DecodingsBackend, DecodingsFactory, DecodingsHandler, Encodings, EncodingsBackend, EncodingsFactory, EncodingsHandler } from '@tsdi/common/codings';
import { Observable } from 'rxjs';
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


@Injectable()
export class TransportEncodingsBackend extends EncodingsBackend<Packet, Message> {
    override handle(input: Packet, context: TransportContext): Observable<Message> {
        return this.codings.deepEncode(input, context, (data) => this.codings.encodeType(Packet, data, context))
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
export const TRANSPORT_DECODINGS_INTERCEPTORS = tokenId<Interceptor<Message, Packet, TransportContext>[]>('TRANSPORT_DECODINGS_INTERCEPTORS');

/**
 *  Transport decodings filters.
 */
export const TRANSPORT_DECODINGS_FILTERS = tokenId<Interceptor<Message, Packet, TransportContext>[]>('TRANSPORT_DECODINGS_FILTERS');

/**
 *  Transport decodings guards.
 */
export const TRANSPORT_DECODINGS_GUARDS = tokenId<CanActivate[]>('TRANSPORT_DECODINGS_GUARDS');



@Injectable()
export class TransportDecodingsBackend extends DecodingsBackend<Message, Packet> {
    override handle(input: Message, context: TransportContext): Observable<Packet> {
        return this.codings.deepDecode(input, context, (data) => this.codings.decodeType(Message, data, context))
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