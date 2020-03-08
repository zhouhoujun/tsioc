import { Abstract, Token } from '@tsdi/ioc';
import { IBootContext } from '../BootContext';


/**
 * startup and configure services of application.
 *
 * @export
 * @abstract
 * @class ServiceRegister
 * @template T
 */
@Abstract()
export abstract class StartupService<T extends IBootContext = IBootContext> {

    constructor() { }

    /**
     * config service of application.
     *
     * @abstract
     * @param {T} [ctx]
     * @returns {Promise<void | Token | Token[]>} startup service token
     * @memberof ConfigureRegister
     */
    abstract configureService(ctx: T): Promise<void | Token | Token[]>;
}
