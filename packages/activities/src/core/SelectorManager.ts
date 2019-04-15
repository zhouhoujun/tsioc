import { Singleton, InstanceFactory, Type, ProviderTypes } from '@tsdi/ioc';

@Singleton
export class SelectorManager {
    protected factories: Map<string, InstanceFactory<any>>;
    protected selectors: Map<string, Type<any>>;

    constructor() {
        this.factories = new Map();
        this.selectors = new Map();
    }

    has(selector: string): boolean {
        return this.selectors.has(selector);
    }

    set(selector: string, type: Type<any>, factory: InstanceFactory<any>) {
        this.selectors.set(selector, type);
        this.factories.set(selector, factory);
    }

    resolve(selector: string, ...providers: ProviderTypes[]) {
        return this.factories.get(selector)(...providers);
    }

    forEach(func: (type: Type<any>, selector: string) => void) {
        this.selectors.forEach(func);
    }

    get(selector: string): Type<any> {
        return this.selectors.get(selector);
    }
}
