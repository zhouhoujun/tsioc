import { EMPTY, Execption, Injector, InvocationContext, createContext, isInjector } from '@tsdi/ioc';
import { GuardHandler } from '../handlers/guards';
import { ConfigableHandler, ConfigableHandlerOptions, setHandlerOptions } from '../handlers/handler.service';
import { INTERCEPTORS_TOKEN, Interceptor } from '../Interceptor';
import { CanActivate, GUARDS_TOKEN } from '../guard';
import { FILTERS_TOKEN, Filter } from '../filters/filter';



export class ConfigableHandlerImpl<TInput = any, TOutput = any> extends GuardHandler<TInput, TOutput> implements ConfigableHandler {
    constructor(
        context: Injector | InvocationContext,
        private options: ConfigableHandlerOptions<TInput>) {
        super(isInjector(context) ? createContext(context, options) : context,
            options.backend!,
            options.interceptorsToken ?? INTERCEPTORS_TOKEN,
            options.guardsToken ?? GUARDS_TOKEN,
            options.filtersToken ?? FILTERS_TOKEN);

        if (!options.backend) {
            throw new Execption('ConfigableHandlerOptions has not set backend option')
        }

        setHandlerOptions(this, options);
    }


    /**
     *  get filters. 
     */
    protected getFilters(): Filter<TInput, TOutput>[] {
        const filts = this.filtersToken ? this.injector.get(this.filtersToken, EMPTY) : EMPTY;
        return this.options.globalFiltersToken ? ([...this.injector.get(this.options.globalFiltersToken, EMPTY), ...filts]) : filts
    }

    protected override getInterceptors(): Interceptor<TInput, TOutput>[] {
        const itps = this.injector.get(this.token, EMPTY);
        return this.options.globalInterceptorsToken ? [...this.injector.get(this.options.globalInterceptorsToken, EMPTY), ...itps] : itps
    }

    protected override getGuards(): CanActivate<any>[] | null {
        const guards = this.guardsToken ? this.injector.get(this.guardsToken, null) : null;
        return this.options.globalGuardsToken ? [...this.injector.get(this.options.globalGuardsToken, EMPTY), ...(guards ?? EMPTY)] : guards

    }
}

