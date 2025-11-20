import { Abstract, Injectable, Injector, InvocationContext, tokenId } from '@tsdi/ioc';
import { ConfigableHandlerOptions, createHandler, ExceptionHandlerFilter, FilterLike, Handler, InterceptorLike } from '@tsdi/core';
import { Observable, of } from 'rxjs';
import { TransportContext } from './context';

@Abstract()
export abstract class Serializer<TIn=any, TOut= any> {
    abstract serialize(input: TIn, context: TransportContext): Observable<TOut>;
}

/**
 * serializer options
 */
export interface SerializerOpts extends ConfigableHandlerOptions {

}

@Abstract()
export abstract class SerializerFactory {
    abstract create(context: Injector | InvocationContext, options?: SerializerOpts): Serializer;
}


export class DefaultSerializer<TIn=any, TOut= any> implements Serializer<TIn, TOut> {
    constructor(
        private handler: Handler<TIn, TOut>
    ) { }

    serialize(input: TIn, context: TransportContext): Observable<TOut> {
        return this.handler.handle(input, context);
    }

}

export const SERIALIZER_INTERCEPTORS = tokenId<InterceptorLike[]>('SERIALIZER_INTERCEPTORS');
export const SERIALIZER_FILTERS = tokenId<FilterLike[]>('SERIALIZER_FILTERS');

@Injectable()
export class DefaultSerializerFactory implements SerializerFactory {
    create(context: Injector | InvocationContext, options?: SerializerOpts): Serializer {
        const handler = createHandler(context, {
            backend: jsonSerializeBackend,
            filtersToken: SERIALIZER_FILTERS,
            interceptorsToken: SERIALIZER_INTERCEPTORS,
            enableTypeChain: true,
            ...options
        });
        handler.useFilters(ExceptionHandlerFilter, 0);
        return new DefaultSerializer(handler);
    }

}


const jsonSerializeBackend = (input: any, context?: TransportContext) => {
    return of(JSON.stringify(input, null, 2))
};
