import { isString, lang } from '../utils';
import { IocDecoratorRegisterer } from './IocDecoratorRegisterer';
import { Registration } from '../Registration';
import { IIocContainer } from '../IIocContainer';
import { IocActionType } from './Action';



export enum DecoratorScopes {
    Class = 'Class',
    Parameter = 'Parameter',
    Property = 'Property',
    Method = 'Method',
    BeforeConstructor = 'BeforeConstructor',
    AfterConstructor = 'AfterConstructor'
}

/**
 * decorator register.
 *
 * @export
 * @class DecoratorRegisterer
 */
export abstract class DecoratorScopeRegisterer {
    constructor(protected container: IIocContainer) {

    }

    /**
     * register decorator actions.
     *
     * @param {(string | Function)} decorator
     * @param {...IocActionType[]} actions
     * @memberof DecoratorRegister
     */
    register(decorator: string | Function, scope: DecoratorScopes, ...actions: IocActionType[]): this {
        this.getRegisterer(scope)
            .register(decorator, ...actions);
        return this;
    }

    has(decorator: string | Function, scope: DecoratorScopes): boolean {
        return this.getRegisterer(scope).has(decorator);
    }

    getKey(decorator: string | Function) {
        return isString(decorator) ? decorator : decorator.toString();
    }

    get(decorator: string | Function, scope: DecoratorScopes): IocActionType[] {
        return this.getRegisterer(scope).get(decorator) || [];
    }

    getFuncs(container: IIocContainer, decorator: string | Function, scope: DecoratorScopes): lang.IAction<any>[] {
        return this.getRegisterer(scope).getFuncs(container, decorator);
    }

    getRegisterer(scope: DecoratorScopes): IocDecoratorRegisterer {
        let rg = this.getRegistration(scope);
        if (!this.container.has(rg)) {
            this.container.registerSingleton(rg, () => new IocDecoratorRegisterer());
        }
        return this.container.get(rg);
    }

    protected getRegistration(scope: DecoratorScopes): Registration<IocDecoratorRegisterer> {
        return new Registration(IocDecoratorRegisterer, this.getScopeKey(scope));
    }

    protected abstract getScopeKey(scope: DecoratorScopes): string;

}

/**
 * design decorator register.
 *
 * @export
 * @class DesignDecoratorRegisterer
 * @extends {DecoratorScopeRegisterer}
 */
export class DesignDecoratorRegisterer extends DecoratorScopeRegisterer {
    protected getScopeKey(scope: DecoratorScopes): string {
        return 'design_' + scope;
    }
}

/**
 * runtiem decorator registerer.
 *
 * @export
 * @class RuntimeDecoratorRegisterer
 * @extends {DecoratorScopeRegisterer}
 */
export class RuntimeDecoratorRegisterer extends DecoratorScopeRegisterer {
    protected getScopeKey(scope: DecoratorScopes): string {
        return 'runtime_' + scope;
    }
}
