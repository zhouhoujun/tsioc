import { Token } from '../types';
import { IocCoreService } from '../IocCoreService';
import { IInjector } from '../IInjector';

export class IocSingletonManager extends IocCoreService {

    protected singletons: Map<Token, any>;
    constructor(protected injector: IInjector) {
        super()
        this.singletons = new Map();
    }

    has<T>(token: Token<T>): boolean {
        return this.singletons.has(this.injector.getTokenKey(token));
    }

    get<T>(token: Token<T>) {
        let key = this.injector.getTokenKey(token);
        return this.singletons.get(key) || null;
    }

    set<T>(token: Token<T>, instance: T) {
        let key = this.injector.getTokenKey(token);
        this.singletons.set(key, instance);
    }
}
