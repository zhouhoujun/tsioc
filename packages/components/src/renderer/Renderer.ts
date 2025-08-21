import { Node } from './Node';

export abstract class Renderer {
    abstract getAttribute<T>(node: Node, arg1: string): T
    abstract hasAttribute(node: Node, arg1: string): boolean;
    abstract setAttribut<T>(node: Node, name: string, value: T): void;
    abstract removeAttribute(node: Node, name: string): void;

    abstract createElement(tagName: string): Node;
    abstract createTextNode(text: string): Node;
    abstract appendChild(parent: Node, child: Node): void;
    abstract setTextContent(node: Node, text: string | null): void;
    abstract addEventListener(node: Node, event: string, listener: Function): void;
}