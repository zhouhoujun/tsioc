import { Injector, toProvider } from '@tsdi/ioc';
import { GUARDS_TOKEN } from '../guard';
import { INTERCEPTORS_TOKEN } from '../Interceptor';
import { FILTERS_TOKEN } from '../filters/filter';
import { GuardHandler } from '../handlers/guards';
import { TransportContext } from '../transport/context';
import { TransportEndpoint, TransportEndpointOptions } from '../transport/endpoint';
import { setHandlerOptions } from '../handlers/handler.service';
import { Router } from '../transport/router';
import { Decoder, Encoder } from '../coding';


export class TransportEndpointImpl<TInput extends TransportContext = TransportContext, TOutput = any>
    extends GuardHandler<TInput, TOutput> implements TransportEndpoint<TInput, TOutput> {

    constructor(
        injector: Injector,
        options: TransportEndpointOptions<TInput>) {
        super(injector,
            options.backend ?? Router,
            options.interceptorsToken ?? INTERCEPTORS_TOKEN,
            options.guardsToken ?? GUARDS_TOKEN,
            options.filtersToken ?? FILTERS_TOKEN);

        if (options.encoder) {
            this.injector.inject(toProvider(Encoder, options.encoder))
        }

        if (options.decoder) {
            this.injector.inject(toProvider(Decoder, options.decoder))
        }
        setHandlerOptions(this, options);
    }
}
