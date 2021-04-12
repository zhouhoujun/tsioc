// import { RendererStyleFlags } from '../../type';
import { IComment, IElement, INode, IText } from '../interfaces/node';

/**
 * custom renderer
 */
export interface Renderer {
    createComment(data: string): IComment;
    createElement(tagName: string): IElement;
    createElementNS(namespace: string, tagName: string): IElement;
    createTextNode(data: string): IText;
    querySelector(selectors: string): IElement;
}

// /**
//  * native renderer
//  */
// @Abstract()
// export abstract class NativeRenderer {

//     abstract destroy(): void;
//     abstract createComment(value: string): IComment;
//     abstract createElement(name: string, namespace?: string|null): IElement;
//     abstract createText(value: string): IText;
//     /**
//      * This property is allowed to be null / undefined,
//      * in which case the view engine won't call it.
//      * This is used as a performance optimization for production mode.
//      */
//     abstract destroyNode?: ((node: INode) => void);
//     abstract appendChild(parent: IElement, newChild: INode): void;
//     abstract insertBefore(parent: INode, newChild: INode, refChild: INode|null, isMove?: boolean): void;
//     abstract removeChild(parent: IElement, oldChild: INode, isHostElement?: boolean): void;
//     abstract selectRootElement(selectorOINode: string|any, preserveContent?: boolean): IElement;
  
//     abstract parentNode(node: INode): IElement|null;
//     abstract nextSibling(node: INode): INode|null;
  
//     abstract setAttribute(
//         el: IElement, name: string, value: string,
//         namespace?: string|null): void;
//     abstract removeAttribute(el: IElement, name: string, namespace?: string|null): void;
//     abstract  addClass(el: IElement, name: string): void;
//     abstract removeClass(el: IElement, name: string): void;
//     abstract setStyle(
//         el: IElement, style: string, value: any,
//         flags?: RendererStyleFlags): void;
//     abstract removeStyle(el: IElement, style: string, flags?: RendererStyleFlags): void;
//     abstract setProperty(el: IElement, name: string, value: any): void;
//     abstract setValue(node: IText|IComment, value: string): void;
  
//     // TODO(misko): Deprecate in favor of addEventListener/removeEventListener
//     abstract  listen(
//         target: INode, eventName: string,
//         callback: (event: any) => boolean | void): () => void;
// }

export interface RendererFactory {
    /**
     * create and initializes a custom renderer.
     * @param hostElement 
     * @param type 
     */
    create(hostElement?: IElement, type?: string): Renderer;
    /**
     * A callback invoked when rendering has begun.
     */
    begin?(): void;
    /**
     * A callback invoked when rendering has completed.
     */
    end?(): void;
}