import { Injectable } from '@ts-ioc/ioc';
import { AppConfigure } from './AppConfigure';
import { IApplicationBuilder, ApplicationBuilderToken } from './IApplicationBuilder';
import { RunnableBuilder, RunnableEvents } from './RunnableBuilder';
import { IConfigureManager } from './IConfigureManager';
import { ModuleConfigure } from '../modules';
import { IEvents } from '../utils';

/**
 * application events
 *
 * @export
 * @enum {number}
 */
export const AppEvents = RunnableEvents;

/**
 * application events
 */
export const ApplicationEvents = RunnableEvents;

/**
 * application builder.
 *
 * @export
 * @class Default ApplicationBuilder
 * @extends {ModuleBuilder}
 * @template T
 */
@Injectable(ApplicationBuilderToken)
export class ApplicationBuilder<T> extends RunnableBuilder<T> implements IApplicationBuilder<T>, IEvents {

    protected configs: (string | AppConfigure)[];

    constructor(baseURL?: string) {
        super(baseURL);
        this.configs = [];
    }

    /**
     * use configuration.
     *
     * @param {(string | AppConfigure)} [config]
     * @returns {this} global config for this application.
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | AppConfigure): this {
        if (this.configMgr) {
            this.configMgr.useConfiguration(config);
        }
        this.configs.push(config);
        return this;
    }

    protected createConfigureMgr(): IConfigureManager<ModuleConfigure> {
        let cfgMgr = super.createConfigureMgr();
        if (this.configs && this.configs.length) {
            this.configs.forEach(cfg => cfgMgr.useConfiguration(cfg));
        }
        return cfgMgr;
    }
}
