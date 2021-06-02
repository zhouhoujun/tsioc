import { Destroyable, Token } from '@tsdi/ioc';
import { ApplicationContext } from '../Context';
/**
 * base type parser.
 *
 * @export
 * @interface IBaseTypeParser
 */
export interface IBaseTypeParser {
    /**
     * parse val.
     *
     * @param {Token<T>} type
     * @param {*} paramVal
     * @returns {T}
     */
    parse<T>(type: Token<T>, paramVal): T;
}


/**
 * startup and configure services for application.
 */
 export interface IStartupService extends Destroyable {
    /**
     * config service of application.
     *
     * @param {ApplicationContext} [ctx]
     * @returns {Promise<void>} startup service token
     */
    configureService(ctx: ApplicationContext): Promise<void>;
}