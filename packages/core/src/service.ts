import { ApplicationContext } from './context';

/**
 * configure services for application.
 */
export interface ConfigureService {
    /**
     * config service of application.
     *
     * @param {ApplicationContext} [ctx]
     * @returns {void} startup service token
     */
    configureService(ctx: ApplicationContext): void | Promise<void>;
}

