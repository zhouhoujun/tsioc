import { Abstract, Injectable, Injector, tokenId } from '@tsdi/ioc';
import { Backend, Handler, Interceptor, PipeTransform, createHandler } from '@tsdi/core';
import { TransportHeaders } from '@tsdi/common';
import { Observable, defer } from 'rxjs';
import { CodingsOpts } from './options';
import { CodingsContext } from './context';
import { Encoder } from './Encoder';
import { StreamAdapter, toBuffer } from '../StreamAdapter';
import { PacketData } from '../packet';
import { NotSupportedExecption, PacketLengthException } from '../execptions';

/**
 * Encodings Handler
 */
@Abstract()
export abstract class EncodingsHandler implements Handler<any, any, CodingsContext> {
    abstract handle(input: Buffer, context: CodingsContext): Observable<any>
}


/**
 * Encodings Backend
 */
@Injectable()
export class EncodingsBackend implements Backend<any, any, CodingsContext> {

    constructor(private streamAdapter: StreamAdapter) { }

    handle(input: PacketData, context: CodingsContext): Observable<any> {
        input = { ...input };
        return defer(async () => {
            if (this.streamAdapter.isReadable(input.payload)) {
                if (!context.options.maxSize || !input.payloadLength) {
                    throw new NotSupportedExecption('Payload is readable');
                } else if(input.payloadLength > context.options.maxSize) {
                    const btpipe = context.session!.injector.get<PipeTransform>('bytes-format');
                    throw new PacketLengthException(`Readable payload length ${btpipe.transform(input.payloadLength)} great than max size ${btpipe.transform(context.options.maxSize)}`);
                } else {
                    const buff = await toBuffer(input.payload, context.options.maxSize);
                    input.payload = new TextDecoder().decode(buff);
                }
            }
            if (input.headers instanceof TransportHeaders) {
                input.headers = input.headers.getHeaders();
            }
            const jsonStr = JSON.stringify(input);
            const buff = Buffer.from(jsonStr);
            return buff;
        });
    }
}


/**
 * Endpoint encodings interceptors.
 */
export const ENDPOINT_ENCODINGS_INTERCEPTORS = tokenId<Interceptor<any, any, CodingsContext>[]>('ENDPOINT_ENCODINGS_INTERCEPTORS');

/**
 * Encodings interceptors.
 */
export const ENCODINGS_INTERCEPTORS = tokenId<Interceptor<any, Buffer, CodingsContext>[]>('ENCODINGS_INTERCEPTORS');


/**
 *  Encodings filters.
 */
export const ENCODINGS_FILTERS = tokenId<Interceptor<any, Buffer, CodingsContext>[]>('ENCODINGS_FILTERS');


/**
 *  endpoint Encodings filters.
 */
export const ENDPOIN_ENCODINGS_FILTERS = tokenId<Interceptor<any, Buffer, CodingsContext>[]>('ENDPOIN_ENCODINGS_FILTERS');


/**
 * Encodings
 */
export class Encodings extends Encoder {

    constructor(readonly handler: EncodingsHandler) {
        super()
    }

}

/**
 * Encodings factory.
 */
@Injectable()
export class EncodingsFactory {
    create(injector: Injector, options: CodingsOpts): Encodings {
        const handler = createHandler(injector, {
            globalInterceptorsToken: ENDPOINT_ENCODINGS_INTERCEPTORS,
            interceptorsToken: ENCODINGS_INTERCEPTORS,
            globalFiltersToken: ENDPOIN_ENCODINGS_FILTERS,
            filtersToken: ENCODINGS_FILTERS,
            backend: EncodingsBackend,
            ...options.encodes
        }) as EncodingsHandler;
        return new Encodings(handler)
    }
}


