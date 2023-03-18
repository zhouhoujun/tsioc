import { Abstract, Type, TypeOf } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { ApplicationEvent } from './ApplicationEvent';
import { Endpoint } from './Endpoint';
import { EndpointService } from './EndpointService';
import { Filter } from './filters/filter';
import { CanActivate } from './guard';
import { Interceptor } from './Interceptor';
import { PipeTransform } from './pipes/pipe';

/**
 * providing the basic listener registration facility.
 */
@Abstract()
export abstract class ApplicationEventMulticaster implements EndpointService {
    /**
     * use pipes.
     * @param guards 
     */
    abstract usePipes(pipes: TypeOf<PipeTransform> | TypeOf<PipeTransform>[]): this;
    /**
     * use guards.
     * @param guards 
     */
    abstract useGuards(guards: TypeOf<CanActivate> | TypeOf<CanActivate>[]): this;
    /**
     * use interceptor
     * @param interceptor 
     * @param order 
     */
    abstract useInterceptor(interceptor: TypeOf<Interceptor<ApplicationEvent, any>> | TypeOf<Interceptor<ApplicationEvent, any>>[], order?: number): this;
    /**
     * use filter
     * @param filter 
     * @param order 
     */
    abstract useFilter(filter: TypeOf<Filter> | TypeOf<Filter>[], order?: number): this;
    /**
     * add event endpoint.
     * @param event 
     * @param endpoint 
     */
    abstract addListener(event: Type<ApplicationEvent>, endpoint: Endpoint, order?: number): this;
    /**
     * multicast emit event.
     * @param event 
     */
    abstract emit(event: ApplicationEvent): Observable<any>;


    abstract clear(): void;

}
