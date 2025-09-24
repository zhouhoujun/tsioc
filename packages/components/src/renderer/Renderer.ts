import { Abstract } from '@tsdi/ioc';
import { RAttr, RComment, RElement, RNode, RText } from './Node';

/**
 * Flags for renderer-specific style modifiers.
 * @publicApi
 */
export enum RendererStyleFlags2 {
  // TODO(misko): This needs to be refactored into a separate file so that it can be imported from
  // `node_manipulation.ts` Currently doing the import cause resolution order to change and fails
  // the tests. The work around is to have hard coded value in `node_manipulation.ts` for now.
  /**
   * Marks a style as important.
   */
  Important = 1 << 0,
  /**
   * Marks a style as using dash case naming (this-is-dash-case).
   */
  DashCase = 1 << 1,
}


@Abstract()
export abstract class Renderer {
    abstract createComment(value: string): RComment;
    abstract createElement(name: string, namespace?: string | null): RElement;
    abstract createText(value: string): RText;

    /**
     * clone node.
     * @param node node to clone.
     * @returns cloned node.
     */
    abstract cloneNode?(node: RNode): RNode;
    /**
     * This property is allowed to be null / undefined,
     * in which case the view engine won't call it.
     * This is used as a performance optimization for production mode.
     */
    abstract destroyNode?: ((node: RNode) => void) | null;

    abstract appendChild(parent: RElement, newChild: RNode): void;
    abstract insertBefore(parent: RNode, newChild: RNode, refChild: RNode | null, isMove?: boolean): void;
    abstract removeChild(parent: RElement | null, oldChild: RNode, isHostElement?: boolean): void;
    abstract selectRootElement(selectorOrNode: string | any, preserveContent?: boolean): RElement;

    abstract parentNode(node: RNode): RElement | null;
    abstract nextSibling(node: RNode): RNode | null;

    abstract setAttribute(
        el: RElement,
        name: string,
        value: string,
        namespace?: string | null,
    ): void;
    abstract removeAttribute(el: RElement, name: string, namespace?: string | null): void;

    abstract getAttributes(el: RElement): RAttr[];

    abstract addClass(el: RElement, name: string): void;
    abstract removeClass(el: RElement, name: string): void;
    abstract setStyle(el: RElement, style: string, value: any, flags?: RendererStyleFlags2): void;
    abstract removeStyle(el: RElement, style: string, flags?: RendererStyleFlags2): void;
    abstract setProperty(el: RElement, name: string, value: any): void;
    abstract setValue(node: RText | RComment, value: string): void;
}