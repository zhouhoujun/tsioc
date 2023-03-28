import { ProvdierOf } from '@tsdi/ioc';
import { Filter } from './filter';

/**
 * filter service.
 */
export interface FilterService {
    /**
     * use filters
     * @param filters 
     * @param order 
     */
    useFilters(filters: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number): this;
}
