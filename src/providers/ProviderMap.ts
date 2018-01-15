import { MapSet, symbols, isClass, isSymbol, isString, isFunction } from '../utils/index';
import { Type } from '../Type';
import { Token, Factory, Providers, ToInstance } from '../types';
import { Injectable, Inject } from '../core/index';
import { IContainer } from '../IContainer';
import { Registration } from '../Registration';


/**
 * Provider Map
 *
 * @export
 * @class Providers
 */
@Injectable()
export class ProviderMap {
    private maps: MapSet<Token<any>, Factory<any>>;
    constructor( @Inject(symbols.IContainer) private container: IContainer) {
        this.maps = new MapSet<Token<any>, Factory<any>>();
    }

    has<T>(provide: Token<T>) {
        return this.maps.has(provide);
    }

    add<T>(provide: Token<T>, provider: Token<T> | Factory<T>): this {
        let factory;
        if (isClass(provider) || isString(provider) || provider instanceof Registration || isSymbol(provider)) {
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
        this.maps.set(provide, provider);
        return this;
    }

    remove<T>(provide: Token<T>): this {
        if (this.maps.has(provide)) {
            this.maps.delete(provide);
        }
        return this;
    }

    resolve<T>(provide: Token<T>, ...providers: Providers[]): T {
        if (!this.maps.has(provide)) {
            return null;
        }
        let provider = this.maps.get(provide);
        return provider(...providers);
    }
}
