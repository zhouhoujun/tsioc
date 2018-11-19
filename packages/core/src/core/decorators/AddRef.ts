import { createDecorator, ArgsIterator } from '../factories';
import { AddRefMetadata } from '../metadatas';
import { Registration } from '../../Registration';
import { isToken, isArray } from '../../utils';
import { Token } from '../../types';

/**
 * @AddRef decorator, for class. use to define the class as service of target.
 *
 * @AddRef
 *
 * @export
 * @interface IAddRefDecorator
 * @extends {IClassDecorator<AddRefMetadata>}
 */
export interface IAddRefDecorator {
    /**
     * AddRef decorator, for class. use to add ref service to the class.
     *
     * @AddRef
     *
     * @param {(Registration<any> | symbol | string) | (Registration<any> | symbol | string)[])} refSerices reference to target token.
     */
    (refSerices: (Registration<any> | symbol | string) | (Registration<any> | symbol | string)[]): ClassDecorator;

    /**
     * AddRef decorator, for class. use to add ref service to the class.
     *
     * @AddRef
     *
     * @param {AddRefMetadata} [metadata] metadata map.
     */
    (metadata: AddRefMetadata): ClassDecorator;
}

/**
 * AddRef decorator, for class. use to add ref service to the class.
 *
 * @AddRef
 */
export const AddRef: IAddRefDecorator = createDecorator<AddRefMetadata>('AddRef', ((args: ArgsIterator) => {
    args.next<AddRefMetadata>({
        match: arg => isToken(arg) || isArray(arg),
        setMetadata: (metadata, arg) => {
            metadata.addRefs = arg;
        }
    })
})) as IAddRefDecorator;

