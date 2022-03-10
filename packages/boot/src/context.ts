import { ApplicationContext, EnvironmentOption } from '@tsdi/core';
import { Abstract, Type } from '@tsdi/ioc';
import { ApplicationConfiguration, ConfigureManager } from './configure/config';

@Abstract()
export abstract class BootApplicationContext extends ApplicationContext {
    /**
     * get application global configuration of type {@link Configuration}.
     */
    abstract getConfiguration(): ApplicationConfiguration;

    /**
     * get configure manager of type {@link ConfigureManager}.
     *
     * @returns {ConfigureManager}
     */
    abstract getConfigureManager(): ConfigureManager;
}

/**
 * BootApplication Environment option.
 */
export interface BootEnvironmentOption extends EnvironmentOption {

    /**
     * custom configures
     *
     * @type {((string | ApplicationConfiguration)[])}
     */
    configures?: (string | ApplicationConfiguration)[];
}

/**
 * BootApplicationOption option.
 */
export interface BootApplicationOption<T = any> extends BootEnvironmentOption {
    /**
     * target module type.
     *
     * @type {ClassType}
     */
    type: Type<T>;
}