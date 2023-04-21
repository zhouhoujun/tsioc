

import { Injector, InvocationContext } from '@tsdi/ioc';
import { ConfigableHandlerImpl } from './handler';
import { ConfigableEndpointOptions } from '../endpoints/endpoint.service';
import { ConfigableEndpoint } from '../endpoints/endpoint.factory';



export class ConfigableEndpointImpl<TInput extends InvocationContext, TOutput = any> extends ConfigableHandlerImpl<TInput, TOutput> implements ConfigableEndpoint {
    constructor(
        injector: Injector,
        options: ConfigableEndpointOptions<TInput>) {
        super(injector, options);
    }
}

