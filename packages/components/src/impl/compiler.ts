import { Abstract, isArray, isObject } from '@tsdi/ioc';
import { TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { NodeType, RElement, RNode, RText } from '../renderer/Node';
import { ViewRef } from '../refs/view';
import { RootViewRef } from './view';
import { TemplateParser } from '../template/parser';


// // 默认HTML模板解析器实现
// export class HtmlTemplateParser implements TemplateParser {
//     parse(template: string): RNode[] {
//         const parser = new DOMParser();
//         const doc = parser.parseFromString(template, 'text/html');
//         return Array.from(doc.body.childNodes) as any[];
//     }
// }

@Abstract()
export abstract class AbstractTemplateCompiler extends TemplateCompiler {

    protected abstract get options(): TemplateCompilerOptions;

    abstract get parser(): TemplateParser;

    compile(template: string, context: any): ViewRef {
        // 使用模板解析器解析模板
        const nodes = this.parser.parse(template);

        const viewRef = new RootViewRef(nodes, context, this.effect);
        // 处理动态内容
        this.walkNodes(viewRef.rootNodes, context, viewRef);

        // ...解析模板逻辑...
        viewRef.rootNodes?.forEach(node => this.processBindings(node, context, viewRef));

        return viewRef;
    }

    private walkNodes(nodes: RNode[], context: any, viewRef: ViewRef) {
        nodes?.forEach(node => {
            if (node.nodeType === NodeType.Element) {
                this.processElement(node as RElement, context, viewRef);
            } else if (node.nodeType === NodeType.Text) {
                this.processText(node as RText, context, viewRef);
            }
            this.processBindings(node as any, context, viewRef);
        });

    }

    private processElement(el: RElement, context: any, viewRef: ViewRef) {
        // 处理属性
        el.getAttributeNames()?.forEach(name => {
            const attrVal = el.getAttribute(name)!;
            if (name.startsWith('#')) {
                const refId = name.substring(1);
                viewRef.registerNodeRef(refId, el);
                // delete el.attributes[attrName]; // 移除#属性
            } else if (name.startsWith('@')) {
                // 事件绑定
                const eventName = name.substring(1);
                const handler = this.parseEventExpression(attrVal, context, viewRef);
                el.addEventListener(eventName, handler);
            } else if (name.startsWith(':')) {
                // 属性绑定
                const propName = name.substring(1);
                this.effect.run(() => {
                    const value = context[attrVal];
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
            this.walkNodes(el.childNodes, context, viewRef);
        }
    }

    private processText(node: RText, context: any, viewRef: ViewRef) {
        const text = node.textContent;
        if (!text) return;

        const [open, close] = this.options.delimiters || ['{{', '}}'];
        const regex = new RegExp(`${open}(.*?)${close}`, 'g');
        const matches = text.matchAll(regex);

        for (const match of matches) {
            const expr = match[1].trim();
            this.effect.run(() => {
                const value = this.evaluateExpression(expr, context, viewRef);
                node.textContent = text.replace(regex, value);
            });
        }
    }

    private evaluateExpression(expr: string, context: any, viewRef: ViewRef): any {
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

    private processBindings(node: RNode, context: any, viewRef: ViewRef) {
        if (node.nodeType === NodeType.Element) {
            const el = node as RElement;

            // 处理v-model双向绑定
            if (el.hasAttribute('v-model')) {
                const prop = el.getAttribute('v-model') as string;
                this.effect.run(() => {
                    if (el.setAttribute) {
                        el.setAttribute('value', context[prop])
                        this.renderer.setAttribute(el, 'value', context[prop]);
                        el.addEventListener('input', () => {
                            context[prop] = el.getAttribute('value');
                        });
                    }
                });
            }

            // 处理其他指令...
        }

        // 递归处理子节点
        node.childNodes?.forEach(child => this.processBindings(child, context, viewRef));
    }

    private parseEventExpression(expr: string, context: any, viewRef: ViewRef): EventListener {
        // 改进正则以支持带命名空间的函数名和复杂参数
        const funcCallRegex = /^\s*([_$a-zA-Z\w.]+)\s*\(\s*(.*?)\s*\)\s*$/;
        const match = expr.match(funcCallRegex);

        if (!match) {
            // 支持直接绑定上下文对象的方法 (如: @click="user.onClick")
            const propPath = expr.trim().split('.');
            return this.effect.run(() => {
                const handler = propPath.reduce((obj, prop) => obj && obj[prop], context);
                return handler.bind(context);
            });
        }

        const [, funcPath, argsStr] = match;
        const args = this.parseArguments(argsStr);

        return this.effect.run(() => {
            // 解析函数路径 (支持嵌套对象，如: user.service.handleClick)
            let funcTarget: any;
            const func = funcPath.split('.').reduce((obj, prop) => {
                funcTarget = obj;
                return obj && obj[prop];
            }, context);
            if (typeof func !== 'function') {
                throw new Error(`Event handler ${funcPath} is not a function`);
            }

            return (event: Event) => {
                // 解析参数值，支持 $event 特殊变量和上下文访问
                const resolvedArgs = args.map(arg => {
                    if (arg === '$event') return event;
                    if (typeof arg === 'string') {
                        return viewRef.getNodeRef(arg) ?? arg.split('.').reduce((obj, prop) => obj && obj[prop], context) ?? arg;
                    }
                    return arg;
                });
                return func.apply(funcTarget, resolvedArgs);
            };
        });
    }

    // 解析参数列表，支持字符串、数字、布尔值和变量引用
    private parseArguments(argsStr: string): any[] {
        if (!argsStr.trim()) return [];

        // 使用状态机解析参数，支持嵌套括号和引号
        const args: any[] = [];
        let currentArg = '';
        let quoteChar: string | null = null;
        let parenDepth = 0;

        for (const char of argsStr) {
            if (quoteChar) {
                if (char === quoteChar) quoteChar = null;
                currentArg += char;
            } else if (char === '(') {
                parenDepth++;
                currentArg += char;
            } else if (char === ')') {
                parenDepth--;
                currentArg += char;
            } else if (char === ',' && parenDepth === 0) {
                args.push(this.evaluateArg(currentArg.trim()));
                currentArg = '';
            } else if (char === '"' || char === '\'') {
                quoteChar = char;
                currentArg += char;
            } else {
                currentArg += char;
            }
        }

        if (currentArg.trim()) {
            args.push(this.evaluateArg(currentArg.trim()));
        }

        return args;
    }

    // 计算参数值 (字符串/数字/布尔值/变量引用)
    private evaluateArg(arg: string): any {
        if (!arg) return undefined;

        // 字符串字面量
        if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith('\'') && arg.endsWith('\''))) {
            return arg.slice(1, -1);
        }

        // 数字
        if (!isNaN(Number(arg))) {
            return Number(arg);
        }

        // 布尔值
        if (arg === 'true') return true;
        if (arg === 'false') return false;

        // null/undefined
        if (arg === 'null') return null;
        if (arg === 'undefined') return undefined;

        // 变量引用 (支持 $ 前缀，如 $user 或 $event)
        return arg;
    }
}

