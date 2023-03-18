import { TypeOf } from '@tsdi/ioc';
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
    useFilter(filter: TypeOf<Filter> | TypeOf<Filter>[], order?: number): this;
}
