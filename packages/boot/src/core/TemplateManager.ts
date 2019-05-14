import { Singleton } from '@tsdi/ioc';

@Singleton
export class TemplateManager {
    protected componetns: Map<any, any>;

    constructor() {
        this.componetns = new Map();
    }

    get(component: any): any {
        if (this.componetns.has(component)) {
            return this.componetns.get(component);
        }
    }

    has(component: any): boolean {
        return this.componetns.has(component);
    }

    set(component: any, template: any) {
        this.componetns.set(component, template);
    }
}
