import { ProvdierOf } from '@tsdi/ioc';
import { PipeTransform } from './pipe';


/**
 * pipe service.
 */
export interface PipeService {
    /**
     * use pipes.
     * @param guards 
     */
    usePipes(pipes: ProvdierOf<PipeTransform> | ProvdierOf<PipeTransform>[]): this;
}
