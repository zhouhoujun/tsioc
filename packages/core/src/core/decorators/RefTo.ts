import { createDecorator, ArgsIterator } from '../factories';
import { RefToMetadata } from '../metadatas';
import { Registration } from '../../Registration';
import { isToken } from '../../utils';

/**
 * RefTo decorator, for class. use to define the class as service of target.
 *
 * @RefTo
 *
 * @export
 * @interface IRefToDecorator
 * @extends {IClassDecorator<RefToMetadata>}
 */
export interface IRefToDecorator {
    /**
     * RefTo decorator, for class. use to define the class as service of target.
     *
     * @RefTo
     *
     * @param {(Registration<any> | symbol | string)} refTo reference to target token.
     */
    (refTo: Registration<any> | symbol | string): ClassDecorator;

    /**
     * RefTo decorator, for class. use to define the class as service of target.
     *
     * @RefTo
     *
     * @param {RefToMetadata} [metadata] metadata map.
     */
    (metadata: RefToMetadata): ClassDecorator;
}

/**
 * RefTo decorator, for class. use to define the class as service of target.
 *
 * @RefTo
 */
export const RefTo: IRefToDecorator = createDecorator<RefToMetadata>('RefTo', ((args: ArgsIterator) => {
    args.next<RefToMetadata>({
        match: arg => isToken(arg),
        setMetadata: (metadata, arg) => {
            metadata.refTo = arg;
        }
    })
})) as IRefToDecorator;

