import { isObject } from '@tsdi/ioc';
import { ReactiveEffect } from '../ReactiveEffect';
import { TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';


export class TemplateCompilerImpl implements TemplateCompiler {

    private options: TemplateCompilerOptions;

    constructor(readonly effect: ReactiveEffect, options?: TemplateCompilerOptions) {
        this.effect = effect;
        this.options = options || {};
    }

    compile(template: string, context: any): DocumentFragment {
        const fragment = document.createDocumentFragment();
        const parser = new DOMParser();
        const doc = parser.parseFromString(template, 'text/html');
        
        // 处理动态内容
        this.walkNodes(doc.body.childNodes, context);
        
        fragment.append(...Array.from(doc.body.childNodes));
        // ...解析模板逻辑...
        this.processBindings(fragment, context);

        return fragment;
    }

    private walkNodes(nodes: NodeList, context: any) {
        nodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                this.processElement(node as HTMLElement, context);
            } else if (node.nodeType === Node.TEXT_NODE) {
                this.processText(node as Text, context);
            }
        });
    }

    private processElement(el: HTMLElement, context: any) {
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

    private processText(node: Text, context: any) {
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

    private handleSpecialAttribute(el: HTMLElement, name: string, value: any) {
        if (name === 'class') {
            el.className = isObject(value) 
                ? Object.keys(value).filter(k => (value as any)[k]).join(' ')
                : value;
        } else if (name === 'style') {
            el.style.cssText = isObject(value)
                ? Object.entries(value).map(([k, v]) => `${k}:${v}`).join(';')
                : value;
        }
    }

    private processBindings(node: Node, context: any) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            
            // 处理v-model双向绑定
            if (el.hasAttribute('v-model')) {
                const prop = el.getAttribute('v-model')!;
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
