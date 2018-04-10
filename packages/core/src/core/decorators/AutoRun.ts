import { IClassMethodDecorator, createClassMethodDecorator, ClassMethodDecorator } from '../factories/index';
import { AutorunMetadata } from '../metadatas/index';
import { isClassMetadata, isString } from '../../utils/index';
import { Type } from '../../types';



export interface IAutorunDecorator extends IClassMethodDecorator<AutorunMetadata> {
    (autorun?: string): ClassMethodDecorator;
}

/**
 * Autorun decorator and metadata. define a class.
 *
 * @Autorun
 */
export const Autorun: IAutorunDecorator = createClassMethodDecorator<AutorunMetadata>('Autorun', args => {
    args.next<AutorunMetadata>({
        isMetadata: (arg) => isClassMetadata(arg, ['autorun']),
        match: (arg) => isString(arg),
        setMetadata: (metadata, arg) => {
            metadata.autorun = arg;
        }
    });
}) as IAutorunDecorator;
