
import { Injector } from '@tsdi/ioc';
import { AbstractGuardHandler, GuardHandler } from './guards';
import { ConfigableHandler, ConfigableHandlerOptions, setHandlerOptions } from './handler.service';
import { INTERCEPTORS_TOKEN } from '../Interceptor';
import { GUARDS_TOKEN } from '../guard';
import { FILTERS_TOKEN } from '../filters';




export class ConfigableHandlerImpl<TInput = any, TOutput = any> extends GuardHandler<TInput, TOutput> implements ConfigableHandler {
    constructor(
        injector: Injector,
        options: ConfigableHandlerOptions<TInput>) {
        super(injector,
            options.backend,
            options.interceptorsToken ?? INTERCEPTORS_TOKEN,
            options.guardsToken ?? GUARDS_TOKEN,
            options.filtersToken ?? FILTERS_TOKEN);
        setHandlerOptions(this, options);
    }
}


export function createHandler<TInput, TOutput>(injector: Injector, options: ConfigableHandlerOptions<TInput>): AbstractGuardHandler<TInput, TOutput> {
    return new ConfigableHandlerImpl(injector, options)
}