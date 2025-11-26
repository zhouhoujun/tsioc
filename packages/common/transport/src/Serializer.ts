import { Abstract, Injectable, Injector, InvocationContext, tokenId } from '@tsdi/ioc';
import { RequestContext, RequestHandler } from '@tsdi/common';
import { ConfigableHandlerOptions, createHandler, ExceptionHandlerFilter, FilterLike, InterceptorLike } from '@tsdi/core';
import { Observable, of } from 'rxjs';

@Abstract()
export abstract class Serializer<TIn=any, TOut= any> {
    abstract serialize(input: TIn, context: RequestContext): Observable<TOut>;
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
        private handler: RequestHandler<TIn, TOut>
    ) { }

    serialize(input: TIn, context: RequestContext): Observable<TOut> {
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
            filters:[ExceptionHandlerFilter],
            ...options
        }) as RequestHandler;
        return new DefaultSerializer(handler);
    }

}


const jsonSerializeBackend = (input: any, context: RequestContext) => {
    return of(JSON.stringify(input, null, 2))
};
