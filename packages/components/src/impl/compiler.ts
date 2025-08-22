import { isArray, isObject } from '@tsdi/ioc';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { ReactiveEffect } from '../ReactiveEffect';
import { TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { NodeType, RElement, RNode, RNodeList, RText } from '../renderer/Node';
import { ViewRef } from '../refs/view';
import { RootViewRef } from './view';
import { Renderer } from '../renderer/Renderer';
import { TemplateParser } from '../template/parser';


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
        return isArray(jsonObj)? jsonObj : [jsonObj];
    }
}

// 默认HTML模板解析器实现
export class HtmlTemplateParser implements TemplateParser {
    parse(template: string): RNode[] {
        const parser = new DOMParser();
        const doc = parser.parseFromString(template, 'text/html');
        return Array.from(doc.body.childNodes) as any[];
    }
}

export class TemplateCompilerImpl implements TemplateCompiler {
    private options: TemplateCompilerOptions;

    constructor(readonly effect: ReactiveEffect, readonly renderer: Renderer, readonly parser: TemplateParser, options?: TemplateCompilerOptions) {
        this.effect = effect;
        this.options = options || {};
    }

    compile(template: string, context: any): ViewRef {
        // 使用模板解析器解析模板
        const nodes = this.parser.parse(template);

        const viewRef = new RootViewRef(nodes, context, this.effect);
        // 处理动态内容
        this.walkNodes(viewRef.rootNodes, context);

        // ...解析模板逻辑...
        viewRef.rootNodes.forEach(node => this.processBindings(node, context));

        return viewRef;
    }

    private walkNodes(nodes: RNodeList | RNode[], context: any) {
        nodes.forEach(node => {
            if (node.nodeType === NodeType.Element) {
                this.processElement(node as RElement, context);
            } else if (node.nodeType === NodeType.Text) {
                this.processText(node as RText, context);
            }
            this.processBindings(node as any, context);
        });

    }

    private processElement(el: RElement, context: any) {
        // 处理属性
        Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith('@')) {
                // 事件绑定
                const eventName = attr.name.substring(1);
                const handler = this.effect.run(() => context[attr.value]);
                el.addEventListener(eventName, handler);
            } else if (attr.name.startsWith(':')) {
                // 属性绑定
                const propName = attr.name.substring(1);
                this.effect.run(() => {
                    const value = context[attr.value];
                    if (propName === 'class' || propName === 'style') {
                        this.handleSpecialAttribute(el, propName, value);
                    } else {
                        el.setAttribute(propName, value);
                    }
                });
            }
        });

        // 递归处理子节点
        if (el.childNodes.length > 0) {
            this.walkNodes(el.childNodes, context);
        }
    }

    private processText(node: RText, context: any) {
        const text = node.textContent;
        if (!text) return;

        const [open, close] = this.options.delimiters || ['{{', '}}'];
        const regex = new RegExp(`${open}(.*?)${close}`, 'g');
        const matches = text.matchAll(regex);

        for (const match of matches) {
            const expr = match[1].trim();
            this.effect.run(() => {
                const value = this.evaluateExpression(expr, context);
                node.textContent = text.replace(regex, value);
            });
        }
    }

    private evaluateExpression(expr: string, context: any): any {
        try {
            // 简单表达式求值
            return new Function('ctx', `with(ctx){return ${expr}}`)(context);
        } catch (e) {
            console.error(`Error evaluating expression: ${expr}`, e);
            return '';
        }
    }

    private handleSpecialAttribute(el: RElement, name: string, value: any) {
        if (name === 'class') {
            el.className = isObject(value)
                ? Object.keys(value).filter(k => (value as any)[k]).join(' ')
                : value;
        } else if (name === 'style') {
            el.style.setProperty(name, value);
        }
    }

    private processBindings(node: RNode, context: any) {
        if (node.nodeType === NodeType.Element) {
            const el = node as RElement;

            // 处理v-model双向绑定
            if (el.hasAttribute('v-model')) {
                const prop = el.getAttribute('v-model') as string;
                this.effect.run(() => {
                    if (el instanceof HTMLInputElement) {
                        el.value = context[prop];
                        el.addEventListener('input', () => {
                            context[prop] = el.value;
                        });
                    }
                });
            }

            // 处理其他指令...
        }

        // 递归处理子节点
        node.childNodes.forEach(child => this.processBindings(child, context));
    }
}

