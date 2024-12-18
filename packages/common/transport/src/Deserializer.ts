import { Abstract, Injectable, Injector, InvocationContext } from '@tsdi/ioc';
import { ConfigableHandlerOptions, createHandler, ExecptionHandlerFilter, Handler } from '@tsdi/core';
import { Observable, of } from 'rxjs';
import { TransportContext } from './context';

@Abstract()
export abstract class Deserializer {
    abstract deserialize<TIn, TOut>(input: TIn, context: TransportContext): Observable<TOut>;
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

    deserialize(input: any, context: TransportContext): Observable<any> {
        return this.handler.handle(input, context);
    }

}

@Injectable()
export class DefaultDeserializerFactory implements DeserializerFactory {
    create(context: Injector | InvocationContext, options?: DeserializerOpts): Deserializer {
        const handler = createHandler(context, { 
            backend: (input: any, context?: TransportContext) => {
                return of(JSON.parse((input as Buffer).toString()))
            },
            enableInputType: true, 
            ...options 
        });
        handler.useFilters(ExecptionHandlerFilter, 0);
        return new DefaultDeserializer(handler);
    }

}
