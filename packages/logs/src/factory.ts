import { Abstract } from '@tsdi/ioc';
import { ILogger } from './logger';


@Abstract()
export abstract class LoggerFactory {
    /**
     * get logger.
     * @param name 
     */
    abstract getLogger(name?: string): ILogger;
}

