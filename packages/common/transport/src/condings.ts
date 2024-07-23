import { EMPTY, Injector, tokenId, toProvider } from '@tsdi/ioc';
import { CanActivate, ExecptionHandlerFilter, Interceptor, createHandler } from '@tsdi/core';
import { Message, Packet } from '@tsdi/common';
import {
    CodingsAapter,
    Decodings, DecodingsBackend, DecodingsConfigableHandler, DecodingsFactory,
    Encodings, EncodingsBackend, EncodingsConfigableHandler, EncodingsFactory
} from '@tsdi/common/codings';
import { AbstractTransportSession, TransportOpts } from './TransportSession';
import { TransportContext } from './context';




/**
 * Transport encodings interceptors.
 */
export const TRANSPORT_ENCODINGS_INTERCEPTORS = tokenId<Interceptor<Packet<any>, Message, TransportContext>[]>('TRANSPORT_ENCODINGS_INTERCEPTORS');


/**
 *  Transport encodings filters.
 */
export const TRANSPORT_ENCODINGS_FILTERS = tokenId<Interceptor<Packet<any>, Message, TransportContext>[]>('TRANSPORT_ENCODINGS_FILTERS');


/**
 *  Transport encodings guards.
 */
export const TRANSPORT_ENCODINGS_GUARDS = tokenId<CanActivate[]>('TRANSPORT_ENCODINGS_GUARDS');

export class TransportEncodings extends Encodings {
    /**
     * transport session
     */
    session!: AbstractTransportSession;

    protected override createContext(): TransportContext {
        return new TransportContext(this.session, this.options, this.adapter);
    }

}

/**
 * Transport encodings factory.
 */
export class TransportEncodingsFactory implements EncodingsFactory {
    create(injector: Injector, options: TransportOpts): TransportEncodings {
        const { encodings, name, subfix, encodingsAdapter, transport } = options;
        const { configable, adapter, ...opts } = encodings ?? {};
        const handler = createHandler(injector, {
            classType: EncodingsConfigableHandler,
            interceptorsToken: TRANSPORT_ENCODINGS_INTERCEPTORS,
            filtersToken: TRANSPORT_ENCODINGS_FILTERS,
            guardsToken: TRANSPORT_ENCODINGS_GUARDS,
            backend: EncodingsBackend,
            ...configable,
            providers: (adapter ?? encodingsAdapter) ? [
                ...configable?.providers ?? EMPTY,
                toProvider(CodingsAapter, adapter ?? encodingsAdapter!)
            ] : configable?.providers
        });

        handler.useFilters(ExecptionHandlerFilter, 0);

        return new TransportEncodings(handler, { name, subfix, group: transport, ...opts })
    }
}


/**
 * Transport decodings interceptors.
 */
export const TRANSPORT_DECODINGS_INTERCEPTORS = tokenId<Interceptor<Message, Packet<any>, TransportContext>[]>('TRANSPORT_DECODINGS_INTERCEPTORS');

/**
 *  Transport decodings filters.
 */
export const TRANSPORT_DECODINGS_FILTERS = tokenId<Interceptor<Message, Packet<any>, TransportContext>[]>('TRANSPORT_DECODINGS_FILTERS');

/**
 *  Transport decodings guards.
 */
export const TRANSPORT_DECODINGS_GUARDS = tokenId<CanActivate[]>('TRANSPORT_DECODINGS_GUARDS');

export class TransportDecodings extends Decodings {

    /**
     * transport session
     */
    session!: AbstractTransportSession;

    protected override createContext(): TransportContext {
        return new TransportContext(this.session, this.options, this.adapter);
    }
}

/**
 * Transport decodings factory.
 */
export class TransportDecodingsFactory implements DecodingsFactory {

    create(injector: Injector, options: TransportOpts): TransportDecodings {
        const { decodings, name, subfix, decodingsAdapter, transport } = options;
        const { configable, adapter, ...opts } = decodings ?? {};
        const handler = createHandler(injector, {
            classType: DecodingsConfigableHandler,
            guardsToken: TRANSPORT_DECODINGS_GUARDS,
            interceptorsToken: TRANSPORT_DECODINGS_INTERCEPTORS,
            filtersToken: TRANSPORT_DECODINGS_FILTERS,
            backend: DecodingsBackend,
            ...configable,
            providers: (adapter ?? decodingsAdapter) ? [
                ...configable?.providers ?? EMPTY,
                toProvider(CodingsAapter, adapter ?? decodingsAdapter!)
            ] : configable?.providers
        });

        handler.useFilters(ExecptionHandlerFilter, 0);

        return new TransportDecodings(handler, { name, subfix, group: transport, ...opts })
    }
}