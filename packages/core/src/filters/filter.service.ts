import { ProvdierOf } from '@tsdi/ioc';
import { Filter } from './filter';

/**
 * filter service.
 */
export interface FilterService {
    /**
     * use filter
     * @param filter 
     * @param order 
     */
    useFilter(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number): this;
}
