import { Inject, InjectToken, Injectable, Ref, isUndefined, lang, ContainerToken, IContainer, isString } from '@ts-ioc/core';
import { ModuleConfigure } from '../modules';
import { RunnableBuilderToken, CustomRegister } from './IRunnableBuilder';
import { RunnableBuilder } from './RunnableBuilder';
import { PromiseUtil } from '@ts-ioc/core/lib/utils';


/**
 * configure manager token.
 */
export const ConfigureMgrToken = new InjectToken<ConfigureManager<ModuleConfigure>>('config-mgr');

/**
 * application default configuration token.
 */
export const DefaultConfigureToken = new InjectToken<ModuleConfigure>('DI_Default_Configuration');


/**
 * configure loader.
 *
 * @export
 * @interface IConfigureLoader
 */
export interface IConfigureLoader<T extends ModuleConfigure> {
    /**
     * load config.
     *
     * @param {string} [uri]
     * @returns {Promise<T>}
     * @memberof AppConfigureLoader
     */
    load(uri?: string): Promise<T>;
}

/**
 * configure loader token.
 */
export const ConfigureLoaderToken = new InjectToken<IConfigureLoader<ModuleConfigure>>('DI_Configure_Loader');


/**
 * configure manager.
 *
 * @export
 * @class ConfigureManager
 */
@Injectable(ConfigureMgrToken)
@Ref(RunnableBuilderToken)
export class ConfigureManager<T extends ModuleConfigure> {

    /**
     * Creates an instance of ConfigureManager.
     * @param {string} [baseURL]
     * @memberof ConfigureManager
     */
    constructor(protected baseURL?: string) {
        this.configs = [];
    }

    @Inject(ContainerToken)
    container: IContainer;

    private config: T;
    protected configs: (string | T)[];
    /**
     * use configuration.
     *
     * @param {(string | AppConfigure)} [config]
     * @returns {this} this configure manager.
     * @memberof Bootstrap
     */
    useConfiguration(config?: string | T): this {
        if (isUndefined(config)) {
            config = '';
        }
        // clean cached config.
        this.config = null;
        let idx = this.configs.indexOf(config);
        if (idx >= 0) {
            this.configs.splice(idx, 1);
        }
        this.configs.push(config);

        return this;
    }

    /**
     * bind runnable builder.
     *
     * @param {RunnableBuilder<any>} builder
     * @param {...CustomRegister<any>[]} regs
     * @memberof ConfigureManager
     */
    async bindBuilder(builder: RunnableBuilder<any>, ...regs: CustomRegister<any>[]) {
        let config = await this.getConfig();
        if (this.baseURL) {
            config.baseURL = this.baseURL;
        }
        await PromiseUtil.step(regs.map(async cs => {
            let tokens = await cs(this.container, config, builder);
            return tokens;
        }));
    }

    /**
     * get config.
     *
     * @returns {Promise<T>}
     * @memberof ConfigureManager
     */
    async getConfig(): Promise<T> {
        if (!this.config) {
            this.config = await this.initConfig();
        }
        return this.config;
    }

    /**
     * init config.
     *
     * @protected
     * @returns
     * @memberof ConfigureManager
     */
    protected async initConfig() {
        let config = await this.getDefaultConfig();
        if (this.configs.length < 1) {
            this.configs.push(''); // load default loader config.
        }
        let exts = await Promise.all(this.configs.map(cfg => {
            if (isString(cfg)) {
                return this.loadConfig(cfg);
            } else {
                return cfg;
            }
        }));
        exts.forEach(exCfg => {
            if (exCfg) {
                lang.assign(config, exCfg);
            }
        });
        return config;
    }

    /**
     * load config.
     *
     * @protected
     * @param {string} src
     * @returns {Promise<T>}
     * @memberof ConfigureManager
     */
    protected async loadConfig(src: string): Promise<T> {
        if (this.container.has(ConfigureLoaderToken)) {
            let loader = this.container.resolve(ConfigureLoaderToken, { baseURL: this.baseURL, container: this.container });
            return await loader.load(src) as T;
        } else if (src) {
            let builder = this.container.getBuilder();
            let cfg = await builder.loader.load([src])
            return cfg.length ? cfg[0] as T : null;
        } else {
            return null;
        }
    }

    /**
     * get default config.
     *
     * @protected
     * @returns {Promise<T>}
     * @memberof ConfigureManager
     */
    protected async getDefaultConfig(): Promise<T> {
        if (this.container.has(DefaultConfigureToken)) {
            return this.container.resolve(DefaultConfigureToken) as T;
        } else {
            return {} as T;
        }
    }
}
