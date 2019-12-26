import { createClassDecorator, ITypeDecorator } from '../factories/ClassDecoratorFactory';
import { AutorunMetadata } from '../metadatas/AutorunMetadata';
import { IIocContainer } from '../IIocContainer';
import { Type } from '../types';

/**
 *  ioc extend inteface.
 */
export interface IocExtentd {
    setup(container: IIocContainer);
}

/**
 * Ioc Extentd decorator.
 */
export type IocExtentdDecorator = <TFunction extends Type<IocExtentd>>(target: TFunction) => TFunction | void;

/**
 * IocExt decorator. define for class, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
 *
 * @IocExt
 */
export interface IocExtDecorator extends ITypeDecorator<AutorunMetadata> {
    /**
     * IocExt decorator. define for class, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
     *
     * @IocExt
     *
     * @param {string} [autorun] auto run special method.
     */
    (): IocExtentdDecorator;
}

/**
 * IocExt decorator. define for class, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
 *
 * @IocExt
 */
export const IocExt: IocExtDecorator = createClassDecorator<AutorunMetadata>('IocExt', null,
    (metadata) => {
        metadata.autorun = 'setup';
        metadata.singleton = true;
        return metadata;
    }) as IocExtDecorator;
