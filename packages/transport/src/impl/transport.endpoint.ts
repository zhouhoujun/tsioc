import { Injector, createContext, toProvider } from '@tsdi/ioc';
import { GuardHandler, setHandlerOptions } from '@tsdi/core';
import { TransportContext } from '../TransportContext';
import { TransportEndpoint, TransportEndpointOptions } from '../TransportEndpoint';
import { Decoder, Encoder } from '../coding';


export class TransportEndpointImpl<TInput extends TransportContext = TransportContext, TOutput = any>
    extends GuardHandler<TInput, TOutput> implements TransportEndpoint<TInput, TOutput> {

    constructor(
        injector: Injector,
        options: TransportEndpointOptions<TInput>) {
        super(createContext(injector, options),
            options.backend!,
            options.interceptorsToken!,
            options.guardsToken,
            options.filtersToken);

        if (options.encoder) {
            this.injector.inject(toProvider(Encoder, options.encoder))
        }

        if (options.decoder) {
            this.injector.inject(toProvider(Decoder, options.decoder))
        }
        setHandlerOptions(this, options);
    }
}
