import { MapSet, isToken, isNumber, isFunction, isUndefined } from '../../utils';
import { Token, Factory, Providers, ToInstance, Express2 } from '../../types';
import { IContainer } from '../../IContainer';
import { InjectToken } from '../../InjectToken';

export const ProviderMapToken = new InjectToken<ProviderMap>('__IOC_ProviderMap');

/**
 * Provider Map
 *
 * @export
 * @class Providers
 */
export class ProviderMap {
    private maps: MapSet<Token<any> | number, Factory<any>>;
    constructor(private container: IContainer) {
        this.maps = new MapSet<Token<any> | number, Factory<any>>();
    }

    has(provide: Token<any> | number): boolean {
        return this.maps.has(provide);
    }

    get<T>(provide: Token<T> | number): Token<T> | Factory<T> {
        return this.maps.get(provide);
    }

    add<T>(provide: Token<T> | number, provider: Token<T> | Factory<T>): this {
        if (isUndefined(provide)) {
            return this;
        }
        let factory;
        if (isToken(provider) && this.container.has(provider)) {
            factory = (...providers: Providers[]) => {
                return this.container.resolve(provider, ...providers);
            };
        } else {
            if (isFunction(provider)) {
                factory = (...providers: Providers[]) => {
                    return (<ToInstance<any>>provider)(this.container, ...providers);
                };
            } else {
                factory = () => {
                    return provider;
                };
            }
        }
        this.maps.set(provide, factory);
        return this;
    }

    remove<T>(provide: Token<T> | number): this {
        if (this.maps.has(provide)) {
            this.maps.delete(provide);
        }
        return this;
    }

    resolve<T>(provide: Token<T> | number, ...providers: Providers[]): T {
        if (!this.maps.has(provide)) {
            return (!isNumber(provide) && this.container.has(provide)) ? this.container.resolve(provide, ...providers) : null;
        }

        let provider = this.maps.get(provide);
        return isToken(provider) ? this.container.resolve(provider, ...providers) : provider(...providers);
    }

    forEach(express: Express2<Factory<any>, Token<any> | number, void | boolean>) {
        this.maps.forEach(express);
    }

    copy(map: ProviderMap) {
        if (!map) {
            return;
        }
        map.forEach((val, token) => {
            this.maps.set(token, val);
        });
    }
}
