import { Token } from '../types';
import { IIocContainer } from '../IIocContainer';

export class IocSingletonManager {

    protected singletons: Map<Token<any>, any>;
    constructor(protected container: IIocContainer) {
        this.singletons = new Map();
    }

    has<T>(token: Token<T>): boolean {
        return this.singletons.has(this.container.getTokenKey(token));
    }

    get<T>(token: Token<T>) {
        let key = this.container.getTokenKey(token);
        if (this.singletons.has(key)) {
            return this.singletons.get(key);
        }
        return null;
    }

    set<T>(token: Token<T>, instance: T) {
        let key = this.container.getTokenKey(token);
        this.singletons.set(key, instance);
    }
}
