import { IocActionContext } from './Action';
import { DecoratorScopes } from '../services';

export class DecoratorActionContext extends IocActionContext {
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
