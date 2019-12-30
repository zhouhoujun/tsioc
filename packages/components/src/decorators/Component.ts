import { createClassDecorator, isString, ITypeDecorator, SymbolType } from '@tsdi/ioc';
import { IComponentMetadata } from './IComponentMetadata';

/**
 * Component decorator
 *
 * @export
 * @interface IInjectableDecorator
 * @extends {IClassDecorator<IComponentMetadata>}
 */
export interface IComponentDecorator extends ITypeDecorator<IComponentMetadata> {
    /**
     * Component decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`ComponentLifecycle`]
     *
     * @Component
     *
     * @param {IComponentMetadata} [metadata] metadata map.
     */
    (metadata?: IComponentMetadata): ClassDecorator;

    /**
     * Component decorator, use to define class as Component element.
     *
     * @Task
     * @param {string} selector metadata selector.
     */
    (selector: string): ClassDecorator;
}

/**
 * Component decorator, define for class. use to define the class. it can setting provider to some token, singleton or not. it will execute  [`ComponentLifecycle`]
 *
 * @Component
 */
export const Component: IComponentDecorator = createClassDecorator<IComponentMetadata>('Component', [
    (ctx, next) => {
        if (isString(ctx.currArg)) {
            ctx.metadata.selector = ctx.currArg;
            ctx.next(next);
        }
    }
]);


const attrSelPrefix = /^ATTR_SELTR_/;
export function getAttrSelectorToken<T = any>(selector: string): SymbolType<T> {
    return attrSelPrefix.test(selector) ? selector : `ATTR_SELTR_${selector}`;
}

export function isAttrSelectorToken(token: SymbolType): boolean {
    return isString(token) && attrSelPrefix.test(token);
}

const seletPrefix = /^SELTR_/;
export function getSelectorToken<T = any>(selector: string): SymbolType<T> {
    return seletPrefix.test(selector) ? selector : `SELTR_${selector}`;
}

export function iSelectorToken(token: SymbolType): boolean {
    return isString(token) && seletPrefix.test(token);
}
