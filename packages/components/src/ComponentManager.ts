import { Singleton } from '@tsdi/ioc';
import { ModuleConfigure } from '@tsdi/boot';

@Singleton
export class ComponentManager {
    protected componetns: WeakMap<any, any>;

    protected parents: WeakMap<any, any>;

    protected annoations: WeakMap<any, ModuleConfigure>;

    constructor() {
        this.componetns = new WeakMap();
        this.parents = new WeakMap();
        this.annoations = new WeakMap();
    }

    hasParent(component: any): boolean {
        return this.parents.has(component);
    }

    setParent(component: any, parent: any) {
        this.parents.set(component, parent);
        this.componetns.set(parent, component);
    }

    getRoot(component: any) {
        if (this.parents.has(component)) {
            return this.forIn(component, this.parents);
        }
        return null;
    }

    getParent(component: any) {
        return this.parents.has(component) ? this.parents.get(component) : null;
    }


    getScopes(component: any) {
        let scopes = [];
        if (component) {
            this.forIn(component, this.parents, com => {
                scopes.push(com);
            });
        }
        return scopes;
    }


    getLeaf(component: any): any {
        if (this.componetns.has(component)) {
            return this.forIn(component, this.componetns);
        }
        return null;
    }

    hasContent(component: any): boolean {
        return this.componetns.has(component);
    }

    setContent(component: any, content: any) {
        if (component === content) {
            return;
        }
        this.parents.set(content, component);
        this.componetns.set(component, content);
    }

    getContent(component: any) {
        return this.componetns.has(component) ? this.componetns.get(component) : null;
    }

    setAnnoation(component: any, annoation: ModuleConfigure) {
        this.annoations.set(component, annoation);
    }

    getAnnoation(component: any) {
        return this.annoations.has(component) ? this.annoations.get(component) : null;
    }



    protected forIn(component: any, map: WeakMap<any, any>, action?: (component: any) => void) {
        component = this.componetns.get(component);
        while (map.has(component)) {
            component = map.get(component);
            action && action(component);
        }
        return component;
    }

}
