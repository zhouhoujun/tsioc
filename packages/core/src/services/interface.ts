import { Abstract, Destroyable, Token } from '@tsdi/ioc';
import { ApplicationContext } from '../Context';
/**
 * type parser.
 *
 * @export
 */
@Abstract()
export abstract class TypeParser {
    /**
     * parse val.
     *
     * @param {Token<T>} type
     * @param {*} paramVal
     * @returns {T}
     */
    abstract parse<T>(type: Token<T> | Function, paramVal: any): T;
}


/**
 * startup and configure services for application.
 */
export interface IStartupService extends Destroyable {
    /**
     * config service of application.
     *
     * @param {ApplicationContext} [ctx]
     * @returns {void} startup service token
     */
    configureService(ctx: ApplicationContext): void | Promise<void>;
}
