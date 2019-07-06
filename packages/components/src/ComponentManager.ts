import { Singleton } from '@tsdi/ioc';
import { ModuleConfigure } from '@tsdi/boot';
import { CompositeNode } from './CompositeNode';

/**
 * component manager.
 *
 * @export
 * @class ComponentManager
 */
@Singleton
export class ComponentManager {

    protected composites: WeakMap<any, CompositeNode>
    protected annoations: WeakMap<any, ModuleConfigure>;

    constructor() {
        this.composites = new WeakMap();
        this.annoations = new WeakMap();
    }

    hasComposite(component: any): boolean {
        return this.composites.has(component);
    }

    setComposite(component: any, composite: CompositeNode) {
        if (component === composite) {
            return;
        }
        this.composites.set(component, composite);
    }

    getComposite(component: any): CompositeNode {
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
