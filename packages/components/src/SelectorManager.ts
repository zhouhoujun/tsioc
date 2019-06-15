import { Singleton, InstanceFactory, Type, ProviderTypes, isString } from '@tsdi/ioc';

@Singleton()
export class SelectorManager {
    protected factories: Map<string, InstanceFactory<any>>;
    protected selectors: Map<string, Type<any>>;

    constructor() {
        this.factories = new Map();
        this.selectors = new Map();
    }

    has(selector: string | Type<any>): boolean {
        if (isString(selector)) {
            return this.selectors.has(selector);
        } else {
            return Array.from(this.selectors.values()).indexOf(selector) >= 0;
        }
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

    hasAttr(name: string) {
        return this.has(this.getAttrName(name));
    }

    getAttr(name: string): Type<any> {
        return this.get(this.getAttrName(name));
    }

    getAttrName(name: string): string {
        return /^\[\w*\]$/.test(name) ? name : `[${name}]`
    }
}
