import { Abstract, Injectable, Injector, InvocationContext, isString, tokenId } from '@tsdi/ioc';
import { ConfigableHandlerOptions, createHandler, ExceptionHandlerFilter, FilterLike, ApplicationHandler, ApplicationInterceptorLike, InvalidJsonException } from '@tsdi/core';
import { defer, Observable, of } from 'rxjs';
import { TEXT_DECODER, TransportContext } from './context';
import { isBuffer, toBuffer } from './StreamAdapter';
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
        private handler: ApplicationHandler<TIn, TOut>
    ) { }

    deserialize(input: TIn, context: TransportContext): Observable<TOut> {
        return this.handler.handle(input, context);
    }

}

export const DESERIALIZER_INTERCEPTORS = tokenId<ApplicationInterceptorLike[]>('DESERIALIZER_INTERCEPTORS');
export const DESERIALIZER_FILTERS = tokenId<FilterLike[]>('DESERIALIZER_FILTERS');


@Injectable()
export class DefaultDeserializerFactory implements DeserializerFactory {
    create(context: Injector | InvocationContext, options?: DeserializerOpts): Deserializer {
        const handler = createHandler(context, {
            backend: jsonDeserializeBackend,
            filtersToken: DESERIALIZER_FILTERS,
            interceptorsToken: DESERIALIZER_INTERCEPTORS,
            enableTypeChain: true,
            ...options
        });
        handler.useFilters(ExceptionHandlerFilter, 0);
        return new DefaultDeserializer(handler);
    }
}

export const bodyDesrializeBackend = (input: any, context: TransportContext) => {
    return of(input)
}

export const jsonDeserializeBackend = (input: any, context: TransportContext) => {
    return defer(async () => {
        let jsonSrc: string | undefined;
        let pkg: any;
        if (isString(input)) {
            jsonSrc = input
        } else if (isBuffer(input)) {
            jsonSrc = context.get(TEXT_DECODER).decode(input);
        } else if (context.transport.streamAdapter.isReadable(input)) {
            input = await toBuffer(input);
            jsonSrc = context.get(TEXT_DECODER).decode(input);
        }

        if (jsonSrc) {
            try {
                jsonSrc = jsonSrc.replace(XSSI_PREFIX, '');
                pkg = JSON.parse(jsonSrc)
            } catch (err) {
                throw new InvalidJsonException(err, jsonSrc);
            }
        }
        return pkg;
    })
};
