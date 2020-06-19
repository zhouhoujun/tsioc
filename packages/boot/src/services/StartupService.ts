import { Abstract, IDestoryable, Destoryable, tokenId, TokenId, ClassType } from '@tsdi/ioc';
import { IBootContext } from '../BootContext';


/**
 * startups token.
 */
export const STARTUPS: TokenId<ClassType<IStartupService>[]> = tokenId<ClassType<IStartupService>[]>('STARTUPS');

/**
 * startup and configure services for application.
 */
export interface IStartupService<T extends IBootContext = IBootContext> extends IDestoryable {
    /**
     * config service of application.
     *
     * @param {T} [ctx]
     * @returns {Promise<void>} startup service token
     */
    configureService(ctx: T): Promise<void>;
}

/**
 * startup and configure services of application.
 *
 * @export
 * @abstract
 * @class ServiceRegister
 * @template T
 */
@Abstract()
export abstract class StartupService<T extends IBootContext = IBootContext> extends Destoryable implements IStartupService<T> {

    /**
     * config service of application.
     *
     * @abstract
     * @param {T} [ctx]
     * @returns {Promise<void>} startup service token
     * @memberof ConfigureRegister
     */
    abstract configureService(ctx: T): Promise<void>;

    /**
     * default do nothing.
     */
    protected destroying() {

    }
}
