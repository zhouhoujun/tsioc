import { Abstract, Injectable, Injector, InvocationContext, isString, tokenId } from '@tsdi/ioc';
import { ConfigableHandlerOptions, createHandler, ExecptionHandlerFilter, FilterLike, Handler, InterceptorLike } from '@tsdi/core';
import { defer, Observable, of } from 'rxjs';
import { TransportContext } from './context';
import { isBuffer, toBuffer } from './StreamAdapter';
import { Packet } from './socket';

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
                let packet = (input as Packet).packet ?? input;
                if (isString(packet)) {
                    packet = JSON.parse(packet)
                } else if (isBuffer(packet)) {
                    packet = JSON.parse(packet.toString())
                } else if(!input.headers && context.transport.streamAdapter.isReadable((input as Packet).packet)) {
                    return defer(()=> {
                        return toBuffer(packet).then(buf=> JSON.parse(buf.toString()))
                    })
                }
                return of(packet)
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
