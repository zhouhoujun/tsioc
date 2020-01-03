import { Abstract, Type, isClass, isString, Inject, lang, Token, TypeReflectsToken, ITypeReflects } from '@tsdi/ioc';
import { AnnoationContext } from '@tsdi/boot';
import { NodeSelector } from './NodeSelector';
import { IComponentReflect } from './IComponentReflect';
import { COMPONENT_REFS, ComponentFactory, DefaultComponentFactory, IComponentRef } from './ComponentRef';



/**
 * ref element identfy selector.
 *
 * @export
 * @abstract
 * @class RefIdentfy
 */
@Abstract()
export abstract class RefSelector {

    @Inject(TypeReflectsToken) reflects: ITypeReflects;

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

    getDefaultComponentFactory(): Token<ComponentFactory> {
        return DefaultComponentFactory;
    }

    createComponentRef(type: Type, target: Object, context: AnnoationContext, ...nodes: Object[]): IComponentRef {
        let factory = context.getContainer().getService({ token: ComponentFactory, target: type, default: this.getDefaultComponentFactory() });
        return factory.create(type, target, context, ...nodes);
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

