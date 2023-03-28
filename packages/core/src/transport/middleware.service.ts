import { Abstract, ProvdierOf, StaticProvider } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Endpoint } from '../Endpoint';
import { EndpointContext } from '../endpoints';
import { EndpointService } from '../EndpointService';
import { Filter } from '../filters/filter';
import { CanActivate } from '../guard';
import { Interceptor } from '../Interceptor';
import { PipeTransform } from '../pipes/pipe';
import { MiddlewareProviderOf } from './middleware';


/**
 * middleware serivce.
 */
export interface MiddlewareService {
    /**
     * use middleware.
     * @param middlewares 
     */
    use(middlewares: MiddlewareProviderOf | MiddlewareProviderOf[], order?: number): this;
}

/**
 * middleware endpoint.
 */
@Abstract()
export abstract class MiddlewareEndpoint<TCtx extends EndpointContext, TOutput> implements Endpoint<TCtx, TOutput>, EndpointService, MiddlewareService  {
    
    abstract handle(context: TCtx): Observable<TOutput>;
    
    abstract use(middlewares: MiddlewareProviderOf | MiddlewareProviderOf[], order?: number): this;

    abstract useGuards(guards: ProvdierOf<CanActivate> | ProvdierOf<CanActivate>[], order?: number): this;

    abstract useFilters(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number | undefined): this;
    
    abstract usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this;

    abstract useInterceptors(interceptor: ProvdierOf<Interceptor<any, any>> | ProvdierOf<Interceptor<any, any>>[], order?: number | undefined): this;
}
