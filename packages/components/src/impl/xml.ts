import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { TemplateParser } from '../template/parser';
import { RComment, RElement, RNode, RText, NodeType } from '../renderer/Node';
import { Inject, isArray, Module } from '@tsdi/ioc';
import { AbstractTemplateCompiler } from './compiler';
import { ReactiveEffect } from '../ReactiveEffect';
import { TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { Renderer, RendererStyleFlags2 } from '../renderer/Renderer';


// XML模板解析器实现示例
export class XmlTemplateParser implements TemplateParser {
    parse(template: string): RNode[] {
        const parser = new XMLParser();
        const jsonObj = parser.parse(template);
        // 将JSON对象转换为虚拟DOM节点
        return this.convertToNodes(jsonObj);
    }

    private convertToNodes(jsonObj: any): RNode[] {
        // 实现JSON到节点的转换逻辑
        // ...
        return isArray(jsonObj) ? jsonObj : [jsonObj];
    }
}

export class XmlRenderer implements Renderer {
    // XML节点构建器
    private builder = new XMLBuilder({
        ignoreAttributes: false,
        format: true
    });

    // 创建XML注释节点
    createComment(value: string): RComment {
        return {
            nodeType: NodeType.Comment,
            textContent: value,
            parentNode: null,
            nextSibling: null,
            childNodes: [],
            parentElement: null
        };
    }

    // 创建XML元素节点（支持命名空间）
    createElement(name: string, namespace?: string | null): RElement {
        const element: RElement & { attrs: Map<string, any> } = {
            nodeType: NodeType.Element,
            tagName: name,
            // namespaceURI: namespace || null,
            attrs: new Map(),
            childNodes: [] as RNode[],
            parentNode: null,
            nextSibling: null,
            parentElement: null,
            firstChild: null,
            style: {} as any,
            classList: { add: () => { }, remove: () => { } } as any,
            className: '',
            textContent: null,

            getAttributeNames: () => {
                return Array.from(element.attrs.keys());
            },
            // 属性操作实现
            hasAttribute: (attrName) => element.attrs.has(attrName),
            getAttribute: (attrName) => element.attrs.get(attrName) ?? null,
            setAttribute: (attrName, value) => element.attrs.set(attrName, value),
            removeAttribute: (attrName) => element.attrs.delete(attrName),
            setAttributeNS: (ns, qualifiedName, value) => {
                element.attrs.set(`${ns}:${qualifiedName}`, value);
            },

            // 子节点操作
            appendChild: (child) => {
                element.childNodes.push(child);
                return child;
            },
            insertBefore: (newChild, refChild) => {
                const index = refChild ? element.childNodes.indexOf(refChild) : 0;
                if (index !== -1) {
                    element.childNodes.splice(index, 0, newChild);
                } else {
                    element.childNodes.push(newChild);
                }
            }
        };
        if(namespace){
            element.setAttributeNS(namespace, name, namespace);
        }
        return element;
    }

    // 创建XML文本节点
    createText(value: string): RText {
        return {
            nodeType: NodeType.Text,
            textContent: value,
            parentNode: null,
            nextSibling: null,
            childNodes: [],
            parentElement: null
        };
    }

    // 实现节点.appendChild
    appendChild(parent: RElement, newChild: RNode): void {
        newChild.parentNode = parent;
        if (parent.firstChild === null) {
            parent.firstChild = newChild;
        } else {
            const lastChild = parent.childNodes[parent.childNodes.length - 1];
            lastChild.nextSibling = newChild;
        }
        parent.childNodes.push(newChild);
    }

    // 实现节点.insertBefore
    insertBefore(parent: RNode, newChild: RNode, refChild: RNode | null): void {
        throw new Error('Method not implemented.');
    }

    removeChild(parent: RElement | null, oldChild: RNode, isHostElement?: boolean): void {
        throw new Error('Method not implemented.');
    }
    selectRootElement(selectorOrNode: string | any, preserveContent?: boolean): RElement {
        throw new Error('Method not implemented.');
    }
    parentNode(node: RNode): RElement | null {
        throw new Error('Method not implemented.');
    }
    nextSibling(node: RNode): RNode | null {
        throw new Error('Method not implemented.');
    }
    setAttribute(el: RElement, name: string, value: string, namespace?: string | null): void {
        throw new Error('Method not implemented.');
    }
    removeAttribute(el: RElement, name: string, namespace?: string | null): void {
        throw new Error('Method not implemented.');
    }
    addClass(el: RElement, name: string): void {
        throw new Error('Method not implemented.');
    }
    removeClass(el: RElement, name: string): void {
        throw new Error('Method not implemented.');
    }
    setStyle(el: RElement, style: string, value: any, flags?: RendererStyleFlags2): void {
        throw new Error('Method not implemented.');
    }
    removeStyle(el: RElement, style: string, flags?: RendererStyleFlags2): void {
        throw new Error('Method not implemented.');
    }
    setProperty(el: RElement, name: string, value: any): void {
        throw new Error('Method not implemented.');
    }
    setValue(node: RText | RComment, value: string): void {
        throw new Error('Method not implemented.');
    }

}


export class XmlTemplateCompiler extends AbstractTemplateCompiler {

    constructor(
        readonly effect: ReactiveEffect,
        readonly renderer: XmlRenderer,
        readonly parser: XmlTemplateParser,
        protected options: TemplateCompilerOptions = {}) {
        super()
    }
}


@Module({
    providers: [
        XmlTemplateCompiler,
        XmlTemplateParser,
        XmlRenderer,
        { provide: TemplateCompiler, useClass: XmlTemplateCompiler, asDefault: true }
    ]
})
export class XmlTemplateModule {

}