import { Singleton, InstanceFactory } from '@tsdi/ioc';

@Singleton
export class SelectorManager {
    protected map: Map<string, InstanceFactory<any>>;

    constructor() {
        this.map = new Map();
    }

    has(selector: string): boolean {
        return this.map.has(selector);
    }

    set(selector: string, factory: InstanceFactory<any>) {
        this.map.set(selector, factory);
    }

    get(selector: string) {
        return this.map.get(selector);
    }

    forEach(func: (fac: InstanceFactory<any>, key: string) => void) {
        this.map.forEach(func);
    }
}
