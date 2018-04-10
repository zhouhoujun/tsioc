import { createClassDecorator, IClassDecorator } from '../factories/index';
import { ClassMetadata, AutorunMetadata } from '../metadatas/index';
import { isClassMetadata, isString } from '../../utils/index';
import { Type } from '../../types';


export interface IocModuleDecorator extends IClassDecorator<AutorunMetadata> {
    (autorun?: string): ClassDecorator;
}

/**
 * IocModule decorator and metadata. define a class.
 *
 * @IocModule
 */
export const IocModule: IocModuleDecorator = createClassDecorator<AutorunMetadata>('IocModule',
    args => {
        args.next<AutorunMetadata>({
            isMetadata: (arg) => isClassMetadata(arg, ['autorun']),
            match: (arg) => isString(arg),
            setMetadata: (metadata, arg) => {
                metadata.autorun = arg;
            }
        })
    }) as IocModuleDecorator;
