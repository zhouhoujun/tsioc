import { Abstract, Injectable, Injector, InvocationContext } from '@tsdi/ioc';
import { ConfigableHandlerOptions, Context, createHandler, Handler } from '@tsdi/core';
import { Observable, of } from 'rxjs';

@Abstract()
export abstract class Deserializer {
    abstract deserialize<TIn, TOut>(input: TIn, context: Context): Observable<TOut>;
}

export interface DeserializerOpts extends ConfigableHandlerOptions {

}


@Abstract()
export abstract class DeserializerFactory {
    abstract create(context: Injector | InvocationContext, options?: DeserializerOpts): Deserializer;
}



export class DefaultDeserializer implements Deserializer {
    constructor(
        private handler: Handler
    ) { }

    deserialize(input: any, context: Context): Observable<any> {
        return this.handler.handle(input, context);
    }

}

@Injectable()
export class DefaultDeserializerFactory implements DeserializerFactory {
    create(context: Injector | InvocationContext, options?: DeserializerOpts): Deserializer {
        return new DefaultDeserializer(createHandler(context, { 
            backend: (input: any, context?: Context) => {
                return of(JSON.parse((input as Buffer).toString()))
            },
            enableInputType: true, 
            ...options 
        }));
    }

}
