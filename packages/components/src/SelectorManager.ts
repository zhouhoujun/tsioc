import { Singleton, InstanceFactory, Type, ProviderTypes, isString, ClassType, Inject, TypeReflects } from '@tsdi/ioc';
import { IBindingTypeReflect } from './bindings';

const attrChkExp = /^\[\w*\]$/;
/**
 * selector manager.
 *
 * @export
 * @class SelectorManager
 */
@Singleton()
export class SelectorManager {
    protected factories: Map<string, InstanceFactory>;
    protected selectors: Map<string, Type>;

    @Inject() protected reflects: TypeReflects;

    constructor() {
        this.factories = new Map();
        this.selectors = new Map();
    }

    has(selector: string | ClassType): boolean {
        if (isString(selector)) {
            return this.selectors.has(selector);
        } else {
            let refl = this.reflects.get<IBindingTypeReflect>(selector);
            return refl ? !!(refl.componentSelector || refl.attrSelector) : false;
            // return Array.from(this.selectors.values()).some(it => it === selector);
        }
    }

    set(selector: string, type: Type, factory: InstanceFactory) {
        this.selectors.set(selector, type);
        this.factories.set(selector, factory);
    }

    resolve(selector: string, ...providers: ProviderTypes[]) {
        return this.factories.get(selector)(...providers);
    }

    forEach(func: (type: Type, selector: string) => void) {
        this.selectors.forEach(func);
    }

    get(selector: string): Type {
        return this.selectors.get(selector);
    }

    hasAttr(selector: string | ClassType) {
        if (isString(selector)) {
            return this.selectors.has(this.getAttrName(selector));
        } else {
            let refl = this.reflects.get<IBindingTypeReflect>(selector);
            return refl ? !!refl.attrSelector : false;
        }
    }

    getAttr(name: string): Type {
        return this.get(this.getAttrName(name));
    }

    getAttrName(name: string): string {
        return attrChkExp.test(name) ? name : `[${name}]`
    }
}
