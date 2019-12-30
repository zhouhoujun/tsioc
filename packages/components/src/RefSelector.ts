import { Abstract, Type, isClass, isString, TypeReflects, Inject, lang } from '@tsdi/ioc';
import { AnnoationContext } from '@tsdi/boot';
import { NodeSelector } from './NodeSelector';
import { IComponentReflect } from './IComponentReflect';
import { COMPONENT_REFS, ComponentRef, RootNodeRef, NodeType, NodeRef, NodeRefFactory } from './ComponentRef';



/**
 * ref element identfy selector.
 *
 * @export
 * @abstract
 * @class RefIdentfy
 */
@Abstract()
export abstract class RefSelector {

    @Inject() reflects: TypeReflects;

    abstract getSelectorKey(): string;

    abstract getRefSelectKey(): string;

    abstract getDefaultCompose(): Type;

    createNodeSelector(element): NodeSelector {
        return this.reflects.get(lang.getClass(element))
            ?.getInjector()
            ?.get(COMPONENT_REFS)
            ?.get(element)
            ?.getNodeSelector();
    }

    createComponentRef<T>(type: Type<T>, target: T, context: AnnoationContext): ComponentRef<T> {
        return new ComponentRef(type, target, context);
    }

    createRootNodeRef<T>(roots: NodeType<T> | NodeType<T>[], context: AnnoationContext): RootNodeRef<T> {
        return new RootNodeRef(roots, context);
    }

    createNodeRef<T>(node: T, context: AnnoationContext): NodeRef<T> {
        let type = lang.getClass(node);
        let factory = this.reflects.get(type)?.getInjector()?.resolve({ token: NodeRefFactory, target: type });
        return factory ? factory.create(node, context) : null;
    }

    /**
     * select ref tag in element.
     *
     * @param {*} element
     * @param {(string | ((e: any) => boolean))} selector
     * @returns {*}
     * @memberof RefSelector
     */
    select(element: any, selector: string | ((e: any) => boolean)): any {
        let selFunc: (e: any) => boolean;
        if (isString(selector)) {
            let id = this.getRefSelectKey();
            selFunc = e => e[id] === selector;
        } else {
            selFunc = selector;
        }
        if (selFunc(element)) {
            return element;
        }
        let cmpSelector = this.createNodeSelector(element);
        if (cmpSelector) {
            return cmpSelector.find(e => selFunc(e));
        }
        return null;
    }

    isComponentType(element: any): boolean {
        return isClass(element) && this.reflects.get<IComponentReflect>(element).component;
    }

}

