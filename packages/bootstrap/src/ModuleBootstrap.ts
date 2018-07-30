import { IModuleBootstrap, ModuleBootstrapToken } from './IModuleBootstrap';
import { IocModule } from './ModuleType';
import { Singleton } from '@ts-ioc/core';


@Singleton(ModuleBootstrapToken)
export class ModuleBootstrap implements IModuleBootstrap {

    constructor() {

    }

    async bootstrap(iocModule: IocModule<any>, data?: any): Promise<any> {
        let bootToken = iocModule.bootstrap;
        if (!bootToken) {
            throw new Error('cant not find bootstrap token.');
        }
        let container = iocModule.container;
        if (!container) {
            throw new Error('cant not find container.');
        }
        let instance = container.resolve(bootToken, data);
        instance = await this.buildStrategy(instance, iocModule);
        return instance;
    }

    /**
     * bundle instance via config.
     *
     * @param {any} instance
     * @param {IocModule<any>} config
     * @returns {Promise<any>}
     * @memberof IModuleBuilder
     */
    async buildStrategy(instance: any, iocModule: IocModule<any>): Promise<any> {
        return instance;
    }
}
