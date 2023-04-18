
import { Execption, Injector } from '@tsdi/ioc';
import { GuardHandler } from '../handlers/guards';
import { ConfigableHandler, ConfigableHandlerOptions, setHandlerOptions } from '../handlers/handler.service';
import { INTERCEPTORS_TOKEN } from '../Interceptor';
import { GUARDS_TOKEN } from '../guard';
import { FILTERS_TOKEN } from '../filters';



export class ConfigableHandlerImpl<TInput = any, TOutput = any> extends GuardHandler<TInput, TOutput> implements ConfigableHandler {
    constructor(
        injector: Injector,
        options: ConfigableHandlerOptions<TInput>) {
        super(injector,
            options.backend!,
            options.interceptorsToken ?? INTERCEPTORS_TOKEN,
            options.guardsToken ?? GUARDS_TOKEN,
            options.filtersToken ?? FILTERS_TOKEN);

        if(!options.backend){
            throw new Execption('ConfigableHandlerOptions has not set backend option')
        }
        setHandlerOptions(this, options);
    }
}

