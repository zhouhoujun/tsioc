import { Abstract, Empty, InvocationContext, isArray, isObject } from '@tsdi/ioc';
import { TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { NodeType, RElement, RNode, RText } from '../renderer/Node';
import { ViewRef } from '../refs/view';
import { RootViewRef } from './view';
import { TemplateParser } from '../template/parser';
import { ComponentRef } from '../refs/component';
import { ComponentDef } from '../decorators/component';



@Abstract()
export abstract class AbstractTemplateCompiler extends TemplateCompiler {

    protected abstract get options(): TemplateCompilerOptions;

    abstract get parser(): TemplateParser;

    async compile(template: string, context: any, environument: InvocationContext): Promise<ViewRef> {
        // 使用模板解析器解析模板
        const nodes = this.parser.parse(template);

        const viewRef = new RootViewRef(nodes, context, this.effect);

        // 处理动态内容
        await this.walkNodes(viewRef.rootNodes, context, viewRef, environument);

        return viewRef;
    }

    private async walkNodes(nodes: RNode[], context: any, viewRef: ViewRef, environument: InvocationContext) {
        for (const node of nodes || Empty) {
            if (node.nodeType === NodeType.Text || node.nodeType === NodeType.Comment) {
                this.processText(node as RText, context, viewRef, environument);
            } else {              
                const factory = node.tagName? this.getComponentBySelector(node.tagName): null;
                if (factory) {
                    await this.processComponent(node as RElement, factory, context, viewRef, environument);
                } else if (node.nodeType === NodeType.Element) {
                    this.processElement(node as RElement, context, viewRef, environument);
                }
                // ...解析模板逻辑...
                this.processBindings(node, context, viewRef);
            }
        }

    }

    getComponentBySelector(tagName: string) {
        return null;
    }

    private processElement(el: RElement, context: any, viewRef: ViewRef, environument: InvocationContext) {
        // 处理属性
         this.renderer.getAttributes(el).forEach(({ name, value }) => {
            if (name.startsWith('#')) {
                const refId = name.substring(1);
                viewRef.registerNodeRef(refId, el);
            } else if (name.startsWith('@')) {
                // 事件绑定
                const eventName = name.substring(1);
                const handler = this.parseEventExpression(value, context, viewRef, environument);
                el.addEventListener(eventName, handler);
            } else if (name.startsWith(':')) {
                // 属性绑定
                const propName = name.substring(1);
                this.effect.run(() => {
                    const attValue = context[value];
                    if (propName === 'class' || propName === 'style') {
                        this.handleSpecialAttribute(el, propName, attValue);
                    } else {
                        el.setAttribute(propName, attValue);
                    }
                });
            }
        });

        // 递归处理子节点
        if (el.childNodes.length > 0) {
            this.walkNodes(el.childNodes, context, viewRef, environument);
        }
    }

    private processText(node: RText, context: any, viewRef: ViewRef, environument: InvocationContext) {
        const text = node.textContent;
        if (!text) return;

        const [open, close] = this.options.delimiters || ['{{', '}}'];
        const regex = new RegExp(`${open}(.*?)${close}`, 'g');
        const matches = text.matchAll(regex);

        for (const match of matches) {
            const expr = match[1].trim();
            this.effect.run(() => {
                const value = this.evaluateExpression(expr, context, viewRef, environument);
                node.textContent = text.replace(regex, value);
            });
        }
    }


    private async processComponent(el: RElement, factory: () => ComponentRef<any>, context: any, viewRef: ViewRef, environument: InvocationContext) {
        // 创建组件实例
        const componentRef = factory();

        const componentDef = componentRef.class.getAnnotation<ComponentDef>();
        const attributes = componentDef?.attributes || [];


        // 解析组件属性绑定
        const props: Record<string, any> = {};
        this.renderer.getAttributes(el).forEach(({ name, value }) => {
            if (name.startsWith('@')) {
                const eventName = name.substring(1);
                // 查找是否为输入属性
                const inputDef = attributes.find(attr => attr.alias === eventName || attr.propertyKey === eventName);
                if (inputDef) {
                    // 解析绑定表达式并创建响应式依赖
                    this.effect.run(() => {
                        const propValue =  this.evaluateExpression(value, context, viewRef, environument)
                        componentRef.instance[inputDef.propertyKey] = propValue;
                    });
                }
            }
        });


        // 处理组件事件绑定
        const events: Record<string, EventListener> = {};
        this.renderer.getAttributes(el).forEach(({ name, value }) => {
            if (name.startsWith('@')) {
                const eventName = name.substring(1);
                events[eventName] = this.parseEventExpression(value, context, viewRef, environument);
            }
        });

        // 将props和events传递给组件
        // componentInstance.props = props;
        // componentInstance.events = events;

        // 渲染组件并替换当前节点
        await componentRef.render();

        // const parentNode = el.parentNode;
        // if (parentNode) {
        //     // 替换原节点为组件渲染结果
        //     const index = Array.from(parentNode.childNodes).indexOf(el);
        //     parentNode.removeChild(el);
        //     componentRef.hostView.rootNodes.forEach((node, i) => {
        //         parentNode.insertBefore(node, parentNode.childNodes[index + i] || null);
        //     });
        //     // 处理组件渲染节点的绑定
        //     componentRef.hostView.rootNodes.forEach(node => this.processBindings(node, context, viewRef));
        // }
    }

    // 解析管道表达式转换为函数调用
    private parsePipes(parts: string[]): string[] {
        let result = parts[0];
        const results: string[] = [];
        for (let i = 1; i < parts.length; i++) {
            const pipePart = parts[i];
            const [pipeName, ...params] = pipePart.split(':').map(p => p.trim());
            if (!pipeName) continue;
            results.push(pipeName)
            result = `pipes['${pipeName}'].transform(${result}${params.length ? ', ' + params.join(', ') : ''})`;
        }
        results.unshift(result);
        return results;
    }

    private evaluateExpression(expr: string, context: any, viewRef: ViewRef, environument: InvocationContext): any {
        try {
            const parts = expr.split('|').map(part => part.trim());
            if (parts.length <= 1) {
                // 简单表达式求值
                return new Function('ctx', `with(ctx){return ${expr}}`)(context);
            } else {
                const [expression, ...pipeNames] = this.parsePipes(parts);
                const pipes = pipeNames.reduce((obj, name) => {
                    obj[name] = environument.get(name);
                    return obj;
                }, {} as any);
                // 将管道函数添加到执行上下文中
                return new Function('ctx', 'pipes', `with(ctx){return ${expression}}`)(context, pipes);
            }
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

    private parseEventExpression(expr: string, context: any, viewRef: ViewRef, environument: InvocationContext): EventListener {
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
        const args = this.parseArguments(argsStr, context, viewRef, environument);

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
    private parseArguments(argsStr: string, context: any, viewRef: ViewRef, environument: InvocationContext): any[] {
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
                args.push(this.evaluateArg(currentArg.trim(), context, viewRef, environument));
                currentArg = '';
            } else if (char === '"' || char === '\'') {
                quoteChar = char;
                currentArg += char;
            } else {
                currentArg += char;
            }
        }

        if (currentArg.trim()) {
            args.push(this.evaluateArg(currentArg.trim(), context, viewRef, environument));
        }

        return args;
    }

    // 计算参数值 (字符串/数字/布尔值/变量引用)
    private evaluateArg(arg: string, context: any, viewRef: ViewRef, environument: InvocationContext): any {
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

        if (arg == '$event') return arg;

        // 复杂表达式，委托给evaluateExpression处理
        return this.evaluateExpression(arg, context, viewRef, environument);
    }
}

