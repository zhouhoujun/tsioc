import { createDecorator, ArgsIterator } from '../factories';
import { RefMetadata } from '../metadatas';
import { Registration } from '../../Registration';
import { isToken } from '../../utils';

/**
 * Ref decorator, for class. use to define the class as service of target.
 *
 * @Ref
 *
 * @export
 * @interface IRefDecorator
 * @extends {IClassDecorator<RefMetadata>}
 */
export interface IRefDecorator {
    /**
     * Ref decorator, for class. use to define the class as service of target.
     *
     * @Ref
     *
     * @param {(Registration<any> | symbol | string)} refTarget reference to target token.
     */
    (refTarget: Registration<any> | symbol | string): ClassDecorator;

    /**
     * Ref decorator, for class. use to define the class as service of target.
     *
     * @Ref
     *
     * @param {RefMetadata} [metadata] metadata map.
     */
    (metadata: RefMetadata): ClassDecorator;
}

/**
 * Ref decorator, for class. use to define the class as service of target.
 *
 * @Ref
 */
export const Ref: IRefDecorator = createDecorator<RefMetadata>('Ref', ((args: ArgsIterator) => {
    args.next<RefMetadata>({
        match: arg => isToken(arg),
        setMetadata: (metadata, arg) => {
            metadata.refTarget = arg;
        }
    })
})) as IRefDecorator;

