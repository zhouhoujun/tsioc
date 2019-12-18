import { IocCoreService, Abstract } from '@tsdi/ioc';
import { ModuleConfigure } from './ModuleConfigure';
import { BootContext } from '../BootContext';

/**
 * register module hook service.
 *
 * @export
 * @abstract
 * @class ModuleRegister
 * @extends {IocCoreService}
 */
@Abstract()
export abstract class ModuleRegister<T extends BootContext = BootContext> extends IocCoreService {

    /**
     * register config setting.
     *
     * @abstract
     * @param {T} config
     * @returns {Promise<void>}
     * @memberof ConfigureRegister
     */
    abstract register(config: ModuleConfigure, ctx?: T): Promise<void>;

}
