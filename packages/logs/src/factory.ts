import { Abstract } from '@tsdi/ioc';
import { Logger } from './logger';


@Abstract()
export abstract class LoggerFactory {
    /**
     * get logger.
     * @param name 
     */
    abstract getLogger(name?: string): Logger;
}

