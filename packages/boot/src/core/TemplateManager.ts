import { Singleton } from '@tsdi/ioc';

@Singleton
export class TemplateManager {
    protected componetns: WeakMap<any, any>;

    constructor() {
        this.componetns = new WeakMap();
    }

    get(component: any): any {
        if (this.componetns.has(component)) {
            // return this.componetns.get(component);
            return this.getReslut(component);
        }
        return null;
    }

    protected getReslut(component: any) {
        component = this.componetns.get(component);
        while (this.componetns.has(component)) {
            component = this.componetns.get(component);
        }
        return component;
    }

    has(component: any): boolean {
        return this.componetns.has(component);
    }

    set(component: any, template: any) {
        this.componetns.set(component, template);
    }
}
