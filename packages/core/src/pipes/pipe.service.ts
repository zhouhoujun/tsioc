import { TypeOf } from '@tsdi/ioc';
import { PipeTransform } from './pipe';


/**
 * pipe service.
 */
export interface PipeService {
    /**
     * use pipes.
     * @param guards 
     */
    usePipes(pipes: TypeOf<PipeTransform> | TypeOf<PipeTransform>[]): this;
}
