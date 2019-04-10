import { Singleton, InstanceFactory, Type, ProviderTypes } from '@tsdi/ioc';

@Singleton
export class SelectorManager {
    protected factories: Map<string, InstanceFactory<any>>;
    protected selectors: Map<Type<any>, string>;

    constructor() {
        this.factories = new Map();
        this.selectors = new Map();
    }

    has(selector: string): boolean {
        return this.factories.has(selector);
    }

    set(selector: string, type: Type<any>, factory: InstanceFactory<any>) {
        this.selectors.set(type, selector);
        this.factories.set(selector, factory);
    }

    resolve(selector: string, ...providers: ProviderTypes[]) {
        return this.factories.get(selector)(...providers);
    }

    forEach(func: (fac: InstanceFactory<any>, key: string) => void) {
        this.factories.forEach(func);
    }

    getSelector(type: Type<any>): string {
        return this.selectors.get(type);
    }
}
