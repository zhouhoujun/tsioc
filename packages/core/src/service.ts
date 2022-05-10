import { ApplicationContext } from './context';

/**
 * configure services for application.
 */
export interface ConfigureService {
    /**
     * config application.
     *
     * @param {ApplicationContext} [ctx]
     * @returns {void} startup service token
     */
    configureService(ctx: ApplicationContext): void | Promise<void>;
}

