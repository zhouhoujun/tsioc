import { IocRaiseContext } from './Action';
import { DecoratorScopes } from './DecoratorsRegisterer';

export class DecoratorActionContext extends IocRaiseContext {
    /**
     * curr decorator.
     *
     * @type {string}
     * @memberof InjectorActionContext
     */
    currDecoractor?: string;
    /**
     * curr decorator type.
     *
     * @type {DecoratorType}
     * @memberof InjectorActionContext
     */
    currDecorScope?: DecoratorScopes;
}
