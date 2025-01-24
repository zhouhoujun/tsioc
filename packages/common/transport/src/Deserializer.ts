import { Abstract, Injectable, Injector, InvocationContext, isString, tokenId } from '@tsdi/ioc';
import { ConfigableHandlerOptions, createHandler, ExecptionHandlerFilter, FilterLike, Handler, InterceptorLike, InvalidJsonException } from '@tsdi/core';
import { defer, Observable, of } from 'rxjs';
import { TransportContext } from './context';
import { isBuffer, toBuffer } from './StreamAdapter';
import { Packet } from './socket';
import { XSSI_PREFIX } from './utils';

@Abstract()
export abstract class Deserializer<TIn = any, TOut = any> {
    abstract deserialize(input: TIn, context: TransportContext): Observable<TOut>;
}

/**
 * deserializer options
 */
export interface DeserializerOpts extends ConfigableHandlerOptions {

}


@Abstract()
export abstract class DeserializerFactory {
    abstract create(context: Injector | InvocationContext, options?: DeserializerOpts): Deserializer;
}



export class DefaultDeserializer<TIn = any, TOut = any> implements Deserializer<TIn, TOut> {
    constructor(
        private handler: Handler<TIn, TOut>
    ) { }

    deserialize(input: TIn, context: TransportContext): Observable<TOut> {
        return this.handler.handle(input, context);
    }

}

export const DESERIALIZER_INTERCEPTORS = tokenId<InterceptorLike[]>('DESERIALIZER_INTERCEPTORS');
export const DESERIALIZER_FILTERS = tokenId<FilterLike[]>('DESERIALIZER_FILTERS');


@Injectable()
export class DefaultDeserializerFactory implements DeserializerFactory {
    create(context: Injector | InvocationContext, options?: DeserializerOpts): Deserializer {
        const handler = createHandler(context, {
            backend: (input: any, context: TransportContext) => {
                return defer(async () => {
                    let packet = (input as Packet).payload ?? input;
                    let jsonSrc: string | undefined;
                    if (isString(packet)) {
                        jsonSrc = packet
                    } else if (isBuffer(packet)) {
                        jsonSrc = packet.toString()
                    } else if (!input.headers && context.transport.streamAdapter.isReadable((input as Packet).payload)) {
                        const buf = await toBuffer(packet);
                        jsonSrc = buf.toString()
                    }
                    
                    if (jsonSrc) {
                        jsonSrc = jsonSrc.replace(XSSI_PREFIX, '');
                        try {
                            packet = JSON.parse(jsonSrc)
                        } catch (err) {
                            throw new InvalidJsonException(err, jsonSrc);
                        }
                    }
                    return packet;
                })
            },
            filtersToken: DESERIALIZER_FILTERS,
            interceptorsToken: DESERIALIZER_INTERCEPTORS,
            enableTypeChain: true,
            ...options
        });
        handler.useFilters(ExecptionHandlerFilter, 0);
        return new DefaultDeserializer(handler);
    }

}
