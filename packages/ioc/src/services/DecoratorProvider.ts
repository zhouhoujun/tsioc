import { Token, Factory } from '../types';
import { isFunction, lang, isString } from '../utils/lang';
import { IocCoreService } from '../IocCoreService';
import { IIocContainer } from '../IIocContainer';
import { ProviderTypes } from '../providers/types';
import { IInjector, PROVIDERS } from '../IInjector';

/**
 * decorator default provider.
 *
 * @export
 * @class DecoratorProvider
 * @extends {IocCoreService}
 */
export class DecoratorProvider extends IocCoreService {
    protected map: Map<string, IInjector>;

    constructor(private container: IIocContainer) {
        super()
        this.map = new Map();
    }

    /**
     * has provide or not.
     *
     * @param {(Token | number)} provide
     * @returns {boolean}
     * @memberof ProviderMap
     */
    has(decorator: string | Function | object, provide?: Token): boolean {
        decorator = this.getKey(decorator);
        if (decorator && this.map.has(decorator)) {
            return provide ? this.map.get(decorator).has(provide) : true;
        }
        return false;
    }

    /**
     * get decorator.
     *
     * @param {(string | Function | object)} decorator
     * @returns {string}
     * @memberof DecoratorProvider
     */
    getKey(decorator: string | Function | object): string {
        if (isString(decorator)) {
            return decorator;
        } else if (isFunction(decorator)) {
            return decorator.toString();
        } else if (decorator) {
            let refmate = this.container.getTypeReflects().get(lang.getClass(decorator));
            if (refmate && refmate.decorator) {
                return refmate.decorator;
            }
        }
        return '';
    }

    /**
     * resolve instance.
     *
     * @template T
     * @param {string} decorator
     * @param {Token<T>} provide
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof DecoratorProvider
     */
    resolve<T>(decorator: string | Function | object, provide: Token<T>, ...providers: ProviderTypes[]): T {
        decorator = this.getKey(decorator);
        if (decorator && this.map.has(decorator)) {
            return this.map.get(decorator).get(provide, ...providers);
        }
        return null;
    }

    register<T>(decorator: string | Function, provide: Token<T>, provider: Factory<T>): this {
        this.existify(decorator).register(provide, provider);
        return this;
    }

    unregister<T>(decorator: string | Function, token: Token<T>): this {
        decorator = this.getKey(decorator);
        if (this.has(decorator, token)) {
            this.map.get(decorator).unregister(token);
        }
        return this;
    }

    bindProviders(decorator: string | Function, ...providers: ProviderTypes[]): this {
        this.existify(decorator).inject(...providers);
        return this;
    }

    existify(decorator: string | Function): IInjector {
        decorator = this.getKey(decorator);
        if (!this.map.has(decorator)) {
            this.map.set(decorator, this.container.get(PROVIDERS));
        }
        return this.map.get(decorator);
    }

}
