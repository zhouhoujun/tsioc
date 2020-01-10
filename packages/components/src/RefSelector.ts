import { Abstract, Type, isString, Inject, lang, Token, TypeReflectsToken, ITypeReflects, SymbolType, isClass } from '@tsdi/ioc';
import { AnnoationContext } from '@tsdi/boot';
import { NodeSelector } from './NodeSelector';
import { COMPONENT_REFS, ComponentFactory, DefaultComponentFactory, ComponentRef, ElementRef } from './ComponentRef';
import { IComponentReflect } from './IComponentReflect';


const attrSelPrefix = /^ATTR__/;
const seletPrefix = /^SELTR_/;
const pipePrefix = /^PIPE_/;
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

    createComponentRef(type: Type, target: Object, context: AnnoationContext, ...nodes: Object[]): ComponentRef {
        let factory = context.injector.getService({ token: ComponentFactory, target: type, default: this.getDefaultComponentFactory() });
        return factory.create(type, target, context, ...nodes);
    }

    createElementRef<T>(target: T, context: AnnoationContext): ElementRef<T> {
        return new ElementRef(context, target);
    }

    toSelectorToken(selector: string): SymbolType {
        return seletPrefix.test(selector) ? selector : `SELTR_${selector}`;
    }

    toAttrSelectorToken(selector: string): SymbolType {
        return attrSelPrefix.test(selector) ? selector : `ATTR_${selector}`;
    }

    toPipeToken(name: string): SymbolType {
        return pipePrefix.test(name) ? name : `PIPE_${name}`;
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
        let cmpSelector = element instanceof ComponentRef ? element.getNodeSelector() : this.createNodeSelector(element);
        if (cmpSelector) {
            return cmpSelector.find(e => selFunc(e));
        }
        return null;
    }

    isNodeType(element: any): boolean {
        return this.isComponentType(element) || this.isElementType(element);
    }

    isComponentType(element: any): boolean {
        return isClass(element) && this.reflects.get<IComponentReflect>(element).component;
    }

    abstract isElementType(element: any): boolean;

}

