import { StaticProvider } from '@tsdi/ioc';
import { PipeTransform } from './pipe';


/**
 * pipe service.
 */
export interface PipeService {
    /**
     * use pipes.
     * @param guards 
     */
    usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this;
}
