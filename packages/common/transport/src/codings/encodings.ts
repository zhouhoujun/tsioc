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

@Abstract()
export abstract class EncodingsHandler implements Handler<any, any, CodingsContext> {
    abstract handle(input: Buffer, context: CodingsContext): Observable<any>
}



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

export class Encodings extends Encoder {

    constructor(readonly handler: EncodingsHandler) {
        super()
    }

}


@Injectable()
export class EncodingsFactory {
    create(injector: Injector, options: CodingsOpts): Encodings {
        const handler = createHandler(injector, {
            globalInterceptorsToken: ENDPOINT_ENCODINGS_INTERCEPTORS,
            interceptorsToken: ENCODINGS_INTERCEPTORS,
            backend: EncodingsBackend,
            ...options.encodes
        }) as EncodingsHandler;
        return new Encodings(handler)
    }
}


