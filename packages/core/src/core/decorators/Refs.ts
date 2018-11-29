import { createDecorator, ArgsIterator } from '../factories';
import { RefMetadata } from '../metadatas';
import { Registration } from '../../Registration';
import { isToken, isString } from '../../utils';
import { Token } from '../../types';

/**
 * RefTo decorator, for class. use to define the class as service of target.
 *
 * @RefTo
 *
 * @export
 * @interface IRefToDecorator
 * @extends {IClassDecorator<RefMetadata>}
 */
export interface IRefsDecorator {
    /**
     * RefTo decorator, for class. use to define the class as service of target.
     *
     * @RefTo
     *
     * @param {Token<any>} target reference to target token.
     */
    (target: Token<any>): ClassDecorator;

    /**
     * RefTo decorator, for class. use to define the class as service of target.
     *
     * @RefTo
     *
     * @param {Token<any>} target reference to target token.
     * @param {Token<any>} provide define this class ref provider for provide.
     * @param {string} [alias] define this class ref provider with alias for provide.
    */
    (target: Token<any>, provide: Token<any>, alias?: string): ClassDecorator;

    /**
     * RefTo decorator, for class. use to define the class as service of target.
     *
     * @RefTo
     *
     * @param {RefMetadata} [metadata] metadata map.
     */
    (metadata: RefMetadata): ClassDecorator;
}

/**
 * RefTo decorator, for class. use to define the class as service of target.
 *
 * @RefTo
 */
export const Refs: IRefsDecorator = createDecorator<RefMetadata>('RefTo', ((args: ArgsIterator) => {
    args.next<RefMetadata>({
        match: arg => isToken(arg),
        setMetadata: (metadata, arg) => {
            metadata.refs = { target: arg };
        }
    });
    args.next<RefMetadata>({
        match: arg => isToken(arg),
        setMetadata: (metadata, arg) => {
            metadata.refs.provide = arg;
        }
    });
    args.next<RefMetadata>({
        match: arg => isString(arg),
        setMetadata: (metadata, arg) => {
            metadata.refs.alias = arg;
        }
    });
})) as IRefsDecorator;

