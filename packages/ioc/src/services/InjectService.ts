import { Modules, Type } from '../types';
import { Abstract } from '../decorators/Abstract';
import { IInjector } from '../IInjector';
import { IocCoreService } from '../IocCoreService';

/**
 * inject service.
 *
 * @export
 * @abstract
 * @class InjectService
 */
@Abstract()
export abstract class InjectService extends IocCoreService {
    /**
     * inject types in injector.
     *
     * @abstract
     * @param {IInjector} injector
     * @param {...Modules[]} types
     * @memberof InjectService
     */
    abstract inject(injector: IInjector, ...types: Modules[]): Type[];
}
