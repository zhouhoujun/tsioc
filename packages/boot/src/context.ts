import { ApplicationArguments, ApplicationContext, ApplicationOption, EnvironmentOption } from '@tsdi/core';
import { Abstract, ClassType, ModuleDef, ModuleMetadata, Type } from '@tsdi/ioc';
import { ApplicationConfiguration, ConfigureManager } from './configure/config';

@Abstract()
export abstract class BootApplicationContext<T = any, TArg = ApplicationArguments> extends ApplicationContext<T, TArg> {
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
 * boot context.
 */
export const BootContext = BootApplicationContext;

/**
 * BootApplication Environment option.
 */
export interface BootEnvironmentOption<TArg = any> extends EnvironmentOption<TArg> {

    /**
     * custom configures
     *
     * @type {Array<string | ApplicationConfiguration>}
     */
    configures?: Array<string | ApplicationConfiguration>;
}

/**
 * BootApplicationOption option.
 */
export interface BootApplicationOption<T = any, TArg = any> extends BootEnvironmentOption<TArg> {
    /**
     * target module type.
     *
     * @type {ClassType}
     */
    module: ClassType<T> | ModuleDef<T> | ModuleMetadata;

}