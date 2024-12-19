import { Abstract, Injectable, Injector, InvocationContext } from '@tsdi/ioc';
import { ConfigableHandlerOptions, createHandler, ExecptionHandlerFilter, Handler } from '@tsdi/core';
import { Observable, of } from 'rxjs';
import { TransportContext } from './context';

@Abstract()
export abstract class Serializer {
    abstract serialize<TIn, TOut>(input: TIn, context: TransportContext): Observable<TOut>;
}

/**
 * serializer options
 */
export interface SerializerOpts extends ConfigableHandlerOptions {
    /**
     * buffer packet delimiter flag
     */
    delimiter?: string;
}

@Abstract()
export abstract class SerializerFactory {
    abstract create(context: Injector | InvocationContext, options?: SerializerOpts): Serializer;
}


export class DefaultSerializer implements Serializer {
    constructor(
        private handler: Handler
    ) { }

    serialize(input: any, context: TransportContext): Observable<any> {
        return this.handler.handle(input, context);
    }

}

@Injectable()
export class DefaultSerializerFactory implements SerializerFactory {
    create(context: Injector | InvocationContext, options?: SerializerOpts): Serializer {
        const handler = createHandler(context, {
            backend: (input: any, context?: TransportContext)=> {
                return of(JSON.stringify(input, null, 2))
            },
            enableTypeChain: true,
            ...options
        });
        handler.useFilters(ExecptionHandlerFilter, 0);
        return new DefaultSerializer(handler);
    }

}
