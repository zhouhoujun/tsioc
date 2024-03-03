import { Execption, Injector, createContext } from '@tsdi/ioc';
import { GuardHandler, setHandlerOptions } from '@tsdi/core';
import { ForbiddenExecption } from '@tsdi/common/transport';
import { TransportContext } from '../TransportContext';
import { TransportEndpoint, TransportEndpointOptions } from '../TransportEndpoint';



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

        setHandlerOptions(this, options);
    }

    protected override forbiddenError(): Execption {
        return new ForbiddenExecption()
    }
}
