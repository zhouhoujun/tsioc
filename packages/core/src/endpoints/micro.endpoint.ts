import { Abstract, InvocationContext, ProvdierOf, StaticProvider } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { CanActivate } from '../guard';
import { Handler } from '../Handler';
import { Interceptor } from '../Interceptor';
import { PipeTransform } from '../pipes/pipe';
import { Filter } from '../filters/filter';
import { EndpointService } from './endpoint.service';

/**
 * MicroService endpoint.
 */
@Abstract()
export abstract class MicroServiceEndpoint<TCtx extends InvocationContext, TOutput> implements Handler<TCtx, TOutput>, EndpointService {

    abstract handle(context: TCtx): Observable<TOutput>;

    abstract useGuards(guards: ProvdierOf<CanActivate> | ProvdierOf<CanActivate>[], order?: number): this;

    abstract useFilters(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number): this;

    abstract usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this;

    abstract useInterceptors(interceptor: ProvdierOf<Interceptor> | ProvdierOf<Interceptor>[], order?: number): this;
}

