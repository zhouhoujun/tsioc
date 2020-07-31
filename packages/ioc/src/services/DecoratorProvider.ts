import { isFunction, lang, isString } from '../utils/lang';
import { IocCoreService } from '../IocCoreService';
import { Token, ProviderTypes, InjectTypes, Factory, TokenId, tokenId } from '../tokens';
import { IInjector, PROVIDERS, IProviders, InjectorProxy } from '../IInjector';
import { ITypeReflects } from './ITypeReflects';
import { IIocContainer } from '../IIocContainer';

/**
 * current decorator provide token key
 */
export const DECORATOR: TokenId<string> = tokenId<string>('DECORATOR_KEY')
/**
 * decorator default provider.
 *
 * @export
 * @class DecoratorProvider
 * @extends {IocCoreService}
 */
export class DecoratorProvider extends IocCoreService {
    protected map: Map<string, IInjector>;

    constructor(private proxy: InjectorProxy<IIocContainer>) {
        super()
        this.map = new Map();
    }

    private reflects: ITypeReflects;
    getTypeReflects() {
        if (!this.reflects) {
            this.reflects = this.proxy().getTypeReflects();
        }
        return this.reflects;
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
            let refmate = this.getTypeReflects().get(lang.getClass(decorator));
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

    bindProviders(decorator: string | Function, ...providers: InjectTypes[]): this {
        this.existify(decorator).inject(...providers);
        return this;
    }

    getProviders(decorator: string | Function): IProviders {
        return this.map.get(this.getKey(decorator));
    }

    existify(decorator: string | Function): IProviders {
        decorator = this.getKey(decorator);
        if (!this.map.has(decorator)) {
            this.map.set(decorator, this.proxy().getInstance(PROVIDERS).inject({ provide: DECORATOR, useValue: decorator }));
        }
        return this.map.get(decorator);
    }

}
