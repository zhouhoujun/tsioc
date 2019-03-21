import { IocCoreService, Abstract } from '@ts-ioc/ioc';
import { IContainer } from '@ts-ioc/core';

/**
 * global registerer serivce.
 *
 * @export
 * @abstract
 * @class GlobalRegisterer
 * @extends {IocCoreService}
 */
@Abstract()
export abstract class GlobalRegisterer extends IocCoreService {

    /**
     * register config setting.
     *
     * @abstract
     * @param {IContainer} container
     * @memberof GlobalRegisterer
     */
    abstract register(container: IContainer): void;

}
