import { createClassDecorator, ITypeDecorator } from '../factories/index';
import { ClassMetadata, AutorunMetadata } from '../metadatas/index';
import { isClassMetadata, isString } from '../../utils/index';
import { Type } from '../../types';

/**
 * IocModule decorator. define for class, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
 *
 * @IocModule
 */
export interface IocModuleDecorator extends ITypeDecorator<AutorunMetadata> {
    /**
     * IocModule decorator. define for class, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
     *
     * @IocModule
     *
     * @param {string} [autorun] auto run special method.
     */
    (autorun?: string): ClassDecorator;

    /**
     * IocModule decorator. define for class, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
     *
     * @IocModule
     *
     * @param {AutorunMetadata} [metadata] metadata map.
     */
    (metadata?: AutorunMetadata): ClassDecorator;
}

/**
 * IocModule decorator. define for class, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
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
