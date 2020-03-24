import { IHandle } from './Handle';
import { DecoratorsRegisterer, AsyncHandler } from '@tsdi/ioc';
import { IocBuildDecoratorRegisterer } from './IocBuildDecoratorRegisterer';


/**
 * startup build scopes.
 *
 * @export
 * @enum {number}
 */
export enum StartupScopes {
    /**
     * build.
     */
    Build = 'Build',
    /**
     * translate bind expression.
     */
    BindExpression = 'BindExpression',
    /**
     * translate template.
     */
    TranslateTemplate = 'TranslateTemplate',
    /**
     * binding.
     */
    Binding = 'Binding',
    /**
     * valify component.
     */
    ValifyComponent = 'ValifyComponent'
}

/**
 * register application startup build process of decorator.
 *
 * @export
 * @class StartupDecoratorRegisterer
 * @extends {DecoratorsRegisterer<T, AsyncHandler>}
 * @template T
 */
export class StartupDecoratorRegisterer<T extends IHandle = IHandle> extends DecoratorsRegisterer<AsyncHandler> {

    protected createRegister(): IocBuildDecoratorRegisterer {
        return new IocBuildDecoratorRegisterer();
    }
}
