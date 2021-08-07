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
    abstract parse<T>(type: Token<T>, paramVal): T;
}


/**
 * startup and configure services for application.
 */
export interface IStartupService<R = Promise<void>> extends Destroyable {
    /**
     * config service of application.
     *
     * @param {ApplicationContext} [ctx]
     * @returns {R} startup service token
     */
    configureService(ctx: ApplicationContext): R;
}