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
 export interface IStartupService<T extends ApplicationContext = ApplicationContext> extends Destroyable {
    /**
     * config service of application.
     *
     * @param {T} [ctx]
     * @returns {Promise<void>} startup service token
     */
    configureService(ctx: T): Promise<void>;
}