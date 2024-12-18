import { Abstract, Injectable, Injector, InvocationContext } from '@tsdi/ioc';
import { ConfigableHandlerOptions, Context, createHandler, Handler } from '@tsdi/core';
import { Observable, of } from 'rxjs';

@Abstract()
export abstract class Serializer {
    abstract serialize<TIn, TOut>(input: TIn, context: Context): Observable<TOut>;
}


export interface SerializerOpts extends ConfigableHandlerOptions {

}

@Abstract()
export abstract class SerializerFactory {
    abstract create(context: Injector | InvocationContext, options?: SerializerOpts): Serializer;
}


export class DefaultSerializer implements Serializer {
    constructor(
        private handler: Handler
    ) { }

    serialize(input: any, context: Context): Observable<any> {
        return this.handler.handle(input, context);
    }

}

@Injectable()
export class DefaultSerializerFactory implements SerializerFactory {
    create(context: Injector | InvocationContext, options?: SerializerOpts): Serializer {
        return new DefaultSerializer(createHandler(context, {
            backend: (input: any, context?: Context)=> {
                return of(JSON.stringify(input, null, 2))
            },
            enableInputType: true,
            ...options
        }));
    }

}
