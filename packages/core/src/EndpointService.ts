import { TypeOf } from '@tsdi/ioc';
import { PipeService } from './pipes/pipe.service';
import { FilterService } from './filters/filter.service';
import { CanActivate } from './guard';
import { InterceptorService } from './Interceptor';


/**
 * endpoint service.
 */
export interface EndpointService extends FilterService, PipeService, InterceptorService {
    /**
     * use guards.
     * @param guards 
     */
    useGuards(guards: TypeOf<CanActivate> | TypeOf<CanActivate>[]): this;
}

