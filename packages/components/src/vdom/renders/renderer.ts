import { IComment, IElement, IText } from '../interfaces/node';

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