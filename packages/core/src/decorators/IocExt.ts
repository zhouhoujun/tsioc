import { createClassDecorator, ITypeDecorator, AutorunMetadata, isClassMetadata, isString } from '@tsdi/ioc';


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
    (autorun?: string): ClassDecorator;

    /**
     * IocExt decorator. define for class, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
     *
     * @IocExt
     *
     * @param {AutorunMetadata} [metadata] metadata map.
     */
    (metadata?: AutorunMetadata): ClassDecorator;
}

/**
 * IocExt decorator. define for class, use to define the class is Ioc extends module. it will auto run after registered to helper your to setup module.
 *
 * @IocExt
 */
export const IocExt: IocExtDecorator = createClassDecorator<AutorunMetadata>('IocExt',
    [
        (ctx, next) => {
            let arg = ctx.currArg;
            if (isString(arg)) {
                ctx.metadata.autorun = arg;
                ctx.next(next);
            }
        }
    ],
    (metadata) => {
        metadata.singleton = true;
        return metadata;
    }) as IocExtDecorator;

export const IocModule = IocExt;
