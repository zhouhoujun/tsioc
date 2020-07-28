import { createClassDecorator, isString, Type } from '@tsdi/ioc';
import { IDirectiveMetadata } from './IComponentMetadata';

/**
 * Directive decorator
 *
 * @export
 * @interface IDirectiveDecorator
 */
export interface IDirectiveDecorator {
    /**
     * Directive decorator, , use to define class as directive element.
     *
     * @Directive
     *
     * @param {IDirectiveMetadata} [metadata] directive metadata.
     */
    (metadata?: IDirectiveMetadata): ClassDecorator;

    /**
     * Directive decorator, use to define class as directive element.
     *
     * @Directive
     *
     * @param {string} selector directive selector.
     */
    (selector: string): ClassDecorator;
    /**
     * Directive decorator, use to define class as directive element.
     *
     * @Directive
     */
    (target: Type): void;
}

/**
 * Directive decorator, define for class. use to define the class as Directive.
 *
 * @Component
 */
export const Directive: IDirectiveDecorator = createClassDecorator<IDirectiveMetadata>('Directive', [
    (ctx, next) => {
        if (isString(ctx.currArg)) {
            ctx.metadata.selector = ctx.currArg;
            ctx.next(next);
        }
    }
]);
