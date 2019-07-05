import { isString, TypeMetadata, PropParamDecorator, createParamPropDecorator } from '@tsdi/ioc';

/**
 * RefChild metadata.
 *
 * @export
 * @interface IRefChildMetadata
 * @extends {InjectableMetadata}
 */
export interface IRefChildMetadata extends TypeMetadata {
    /**
     * RefChild selector.
     *
     * @type {string}
     * @memberof IRefChildMetadata
     */
    selector?: string;
}
/**
 * RefChild decorator
 *
 * @export
 * @interface IInjectableDecorator
 * @extends {IClassDecorator<IRefChildMetadata>}
 */
export interface IRefChildDecorator {
    /**
     * RefChild decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`RefChildLifecycle`]
     *
     * @RefChild
     *
     * @param {IRefChildMetadata} [metadata] metadata map.
     */
    (metadata?: IRefChildMetadata): PropParamDecorator;

    /**
     * RefChild decorator, use to define class as RefChild element.
     *
     * @Task
     * @param {string} selector metadata selector.
     */
    (selector: string): PropParamDecorator;
}

/**
 * RefChild decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`RefChildLifecycle`]
 *
 * @RefChild
 */
export const RefChild: IRefChildDecorator = createParamPropDecorator<IRefChildMetadata>('RefChild', adapter => {
    adapter.next<IRefChildMetadata>({
        match: (arg, args) => args.length === 1 && isString(arg),
        setMetadata: (metadata, arg) => {
            metadata.selector = arg;
        }
    });
});

