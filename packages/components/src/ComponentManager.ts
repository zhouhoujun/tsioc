import { Singleton } from '@tsdi/ioc';
import { ModuleConfigure } from '@tsdi/boot';

/**
 * component manager.
 *
 * @export
 * @class ComponentManager
 */
@Singleton
export class ComponentManager {

    protected composites: WeakMap<any, any>;
    protected parents: WeakMap<any, any>;
    protected annoations: WeakMap<any, ModuleConfigure>;

    constructor() {
        this.composites = new WeakMap();
        this.parents = new WeakMap();
        this.annoations = new WeakMap();
    }

    hasParent(component: any): boolean {
        return this.parents.has(component);
    }

    setParent(component: any, parent: any) {
        this.parents.set(component, parent);
        this.composites.set(parent, component);
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
        if (this.composites.has(component)) {
            return this.forIn(component, this.composites);
        }
        return null;
    }

    hasComposite(component: any): boolean {
        return this.composites.has(component);
    }

    setComposite(component: any, composite: any) {
        if (component === composite) {
            return;
        }
        this.parents.set(composite, component);
        this.composites.set(component, composite);
    }

    getComposite(component: any) {
        return this.composites.has(component) ? this.composites.get(component) : null;
    }

    setAnnoation(component: any, annoation: ModuleConfigure) {
        this.annoations.set(component, annoation);
    }

    getAnnoation(component: any) {
        return this.annoations.has(component) ? this.annoations.get(component) : null;
    }

    protected forIn(component: any, map: WeakMap<any, any>, action?: (component: any) => void) {
        component = this.composites.get(component);
        while (map.has(component)) {
            component = map.get(component);
            action && action(component);
        }
        return component;
    }

}
