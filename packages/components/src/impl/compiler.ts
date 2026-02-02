import { Abstract, Exception, isString, remove } from '@tsdi/ioc';
import { CompilerOptions, TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { BIND_DIRECTIVES, BINDINGS, NodeType, RAttr, RElement, RNode, RText } from '../renderer/Node';
import { ComponentDef } from '../refs/component';
import { EventEmitter } from '../EventEmitter';
import { DirectiveDef, DirectiveType, Factoriable } from '../refs/directive';
import { createTemplateRef } from './template';
import { EnvironmentContext } from '../refs/environment';
import { Renderer } from '../renderer/Renderer';
import { Bindings, TemplateRef } from '../refs/template';
import { ReactiveEffect } from '../effect';
import { reactive } from '../reactive';


/**
 * 模板编译结果，包含 TemplateRef 和绑定工厂
 */
export interface TemplateCompilationResult<C = any> {
    bindingFactories: Map<RNode, Bindings<C>[]>;
    directives: Map<RNode, DirectiveDef<any>[]>;
    components: Map<RNode, ComponentDef>;
}

@Abstract()
export abstract class AbstractTemplateCompiler<T = any> extends TemplateCompiler<T> {

    protected abstract get options(): TemplateCompilerOptions;

    private _delimiter?: RegExp;
    protected get delimiter() {
        if (!this._delimiter) {
            const [open, close] = this.options.delimiters || ['{{', '}}'];
            this._delimiter = new RegExp(`${open}(.*?)${close}`, 'g');
        }
        return this._delimiter;
    }



    /**
     * 编译模板并返回 TemplateRef
     */
    compile<C>(template: T, options: CompilerOptions): TemplateRef<C> {
        const nodes = this.parser.parse(template);
        return this.compileNodesWithFactories<C>(nodes, options);

    }

    /**
     * 编译节点并返回完整的编译结果
     */
    compileNodesWithFactories<C>(nodes: RNode[], options: CompilerOptions): TemplateRef<C> {
        // 创建绑定工厂
        const [components, directives] = this.createBindingFactories(nodes, options.directives, options.components);

        return createTemplateRef(nodes, options.host, { components, directives });
    }

    /**
     * 创建可复用的属性绑定工厂
     */
    private createBindingFactories<C>(
        nodes: RNode[],
        directives: DirectiveDef[],
        components: ComponentDef[]
    ): [Map<RNode, ComponentDef>, Map<RNode, DirectiveDef[]>] {
        const rootNodes = nodes;
        const dirMap = new Map<RNode, DirectiveDef[]>();
        const compMap = new Map<RNode, ComponentDef>();
        const readerer = this.renderer;

        // 收集组件和指令
        components.forEach(r => {
            const nodes = readerer.querySelectorAll(rootNodes, r.selector);
            nodes?.forEach(n => {
                if (compMap.has(n)) {
                    throw new Exception('has dup component selector');
                }
                compMap.set(n, r);
            });
        });

        directives.forEach(r => {
            const nodes = readerer.querySelectorAll(rootNodes, r.selector);
            nodes?.forEach(n => {
                if (compMap.has(n)) {
                    return;
                }
                const dirs = dirMap.get(n);
                if (dirs) {
                    dirs.push(r);
                } else {
                    dirMap.set(n, [r]);
                }
            });
        });

        // 为每个节点创建绑定工厂
        this.walkNodesForFactories(nodes, dirMap, compMap);
        return [compMap, dirMap];
    }

    /**
     * 遍历节点创建绑定工厂
     */
    private walkNodesForFactories<C>(
        nodes: RNode[],
        dirMap: Map<RNode, DirectiveDef[]>,
        compMap: Map<RNode, ComponentDef>
    ): void {
        for (const node of nodes) {
            node[BINDINGS] = [];
            if (node.nodeType === NodeType.Text || node.nodeType === NodeType.Comment) {
                // 创建文本节点的绑定工厂
                this.bindingTextFactory(node as RText, (node as RText).textContent);
            } else {
                // 创建元素节点的绑定工厂
                this.bindingElementFactories(node as RElement, dirMap, compMap);
            }

        }
    }

    private binding(node: RNode, factory: Bindings) {
        node[BINDINGS]?.push(factory);
    }

    private matchDelimiter(expr: string): RegExpExecArray[] | null {
        const matches = expr.matchAll(this.delimiter);
        if (!matches) return null;
        return Array.from(matches);
    }

    /**
     * 创建文本节点的绑定工厂
     */
    private bindingTextFactory(node: RText, expr: string | null): void {
        if (!expr) {
            return;
        }

        const matches = this.matchDelimiter(expr);
        if (!matches?.length) return;

        this.binding(node, (target: RNode, context: any, effect, environment: EnvironmentContext) => {
            const textNode = target as RText;
            this.evaluateDelimiterExpression(expr, context, effect, matches, (updatedText) => {
                textNode.textContent = updatedText;
            }, environment);

            return () => {
                textNode.textContent = expr;
            }

        });

        const attrs = this.renderer.getAttributes(node);
        if (attrs?.length) {
            this.bindingAtrrbuteFactories(node, attrs);
        }
    }

    /**
     * 创建文本节点的绑定工厂
     */
    private bindingTemplateFactory(element: RElement): void {
        const childNodes = element.childNodes;
        element.childNodes = [];
        this.binding(element, (target: RNode, context: any, effect: ReactiveEffect<any>, environment: EnvironmentContext) => {
            if (environment.destroyed) return;
            const el = target as RElement;
            const elementRef = environment.getElementRef(el);
            let ctx: any;

            if (el.hasAttribute(':templateOutletContext')) {
                ctx = reactive({}, effect);
                const expr = el.getAttribute(':templateOutletContext')!;
                effect.run(() => {
                    const value = this.evaluateExpression(expr, context, environment);
                    Object.assign(ctx, value);
                })
            } else {
                const attrs = this.renderer.getAttributes(el);
                const vals = attrs.filter(r => r.name.startsWith(':')).map(r => [r.name.slice(1), r.value]);

                if (vals.length) {

                    ctx = reactive({}, effect);
                    effect.run(() => {
                        vals.forEach(([name, expr]) => {
                            const value = this.evaluateExpression(expr, context, environment);
                            ctx[name] = value;
                        });
                    })
                } else {
                    ctx = undefined;
                }
            }

            const templateRef = createTemplateRef(childNodes, elementRef, { environment, context: ctx })

            if (templateRef) {
                environment.attachTemplate(templateRef);
            }
        });


    }

    /**
     * 创建元素节点的绑定工厂
     */
    protected bindingElementFactories<C>(
        element: RElement,
        dirMap: Map<RNode, DirectiveDef[]>,
        compMap: Map<RNode, ComponentDef>
    ): void {
        const attrs = this.renderer.getAttributes(element);

        // 创建属性绑定工厂
        this.bindingAtrrbuteFactories(element, attrs);

        // 递归处理子节点
        if (element.childNodes.length > 0) {
            this.walkNodesForFactories(element.childNodes, dirMap, compMap);
        }

        // 处理组件和指令
        const componentDef = compMap.get(element);
        if (componentDef) {
            this.bindingComponentFactory(element, componentDef, attrs);
        }

        const dirs = dirMap.get(element);
        if (dirs && dirs.length) {
            element[BIND_DIRECTIVES] = dirs;
            dirs.forEach(dirDef => {
                this.bindingDirectiveFactory(element, dirDef, attrs);
            });
        }

        if (element.nodeType === NodeType.Template) {
            this.bindingTemplateFactory(element)
        }

    }

    protected bindingAtrrbuteFactories(element: RNode, attrs: RAttr[]) {
        // 创建属性绑定工厂
        attrs.forEach(({ name, value }) => {
            if (name.startsWith('@')) {
                // 事件绑定工厂
                this.bindingEventFactory(element, name, value);
            } else if (name.startsWith(':')) {
                // 属性绑定工厂
                this.bindingPropertyFactory(element, name, value);
            } else if (name === 'v-model') {
                this.createModelBindingFactory(element, value);
            } else if (this.delimiter.test(value)) {
                // 插值表达式绑定工厂
                this.bindingInterpolationFactory(element, name, value);
            }
        });
    }


    /**
     * 创建事件绑定工厂
     */
    private bindingEventFactory(element: RNode, attrName: string, expr: string): void {
        const eventName = attrName.substring(1);

        this.binding(element, (target, context, effect, environment) => {
            const el = target as RElement;
            const handler = this.parseEventExpression(expr, context, effect, environment);
            el.addEventListener(eventName, handler);

            return () => {
                el.setAttribute(attrName, expr);
            }

        });
    }

    /**
     * 创建属性绑定工厂
     */
    private bindingPropertyFactory(element: RNode, attrName: string, expr: string): void {
        const propName = attrName.substring(1);
        this.binding(element, (target: RNode, context: any, effect: ReactiveEffect<any>, environment: EnvironmentContext) => {
            const el = target as RElement;
            if (!el.setProperty) return;
            effect.run(() => {
                const attValue = this.evaluateExpression(expr, context, environment);
                el.setProperty!(propName, attValue);
            });
            return () => el.removeAttribute(propName);
        });
    }

    /**
     * 创建插值表达式绑定工厂
     */
    private bindingInterpolationFactory(element: RNode, attrName: string, expr: string): void {
        if (!expr) {
            return;
        }

        const matches = this.matchDelimiter(expr);
        if (!matches?.length) return;

        this.binding(element, (target: RNode, context: any, effect: ReactiveEffect<any>, environment: EnvironmentContext) => {
            const el = target as RElement;
            this.evaluateDelimiterExpression(expr, context, effect, matches, (updatedText) => {
                el.setAttribute(attrName, updatedText);
            }, environment);

            return () => el.setAttribute(attrName, expr); // 恢复原始值
        });
    }

    /**
     * 创建双向绑定工厂
     */
    private createModelBindingFactory(element: RNode, prop: string): void {
        this.binding(element, (target: RNode, context: any, effect: ReactiveEffect<any>, environment: EnvironmentContext) => {
            const el = target as RElement;
            effect.run(() => {
                el.setAttribute('value', context[prop]);
                el.addEventListener('input', () => {
                    context[prop] = el.getAttribute('value');
                });
            });

            return () => {
                const el = target as RElement;
                el.removeAttribute('value');
                // 移除事件监听器
            }
        });
    }

    /**
     * 创建组件绑定工厂
     */
    private bindingComponentFactory(element: RElement, componentDef: ComponentDef, attrs: RAttr[]): void {
        this.binding(element, (target: RNode, context: any, effect: ReactiveEffect<any>, environment: EnvironmentContext) => {
            if (environment.destroyed) return;
            const el = target as RElement;
            const elementRef = environment.getElementRef(el);
            const componentRef = (componentDef as Factoriable).ƿfac?.(environment, { elementRef });

            if (componentRef) {
                environment.attachComponent(componentRef);

                // 处理组件属性绑定
                attrs.forEach(({ name, value }) => {
                    this.processComponentAttribute(componentRef, name, value, context, effect, environment);
                });

                componentRef.render();
            }

        });
    }

    /**
     * 创建指令绑定工厂
     */
    private bindingDirectiveFactory(element: RElement, directiveDef: DirectiveDef, attrs: RAttr[]): void {
        const selectors = directiveDef.selector.split(',').map(sel => sel.replace(/^\[|\]$/g, ''));
        switch (directiveDef.dirType) {
            case DirectiveType.Conditional:
                // 处理条件指令组（v-if, v-else-if, v-else, *if, *else-if, *else, v-show, *show, v-case, *case）
                this.processConditionalBinding(element, directiveDef, selectors, attrs);
                break;

            case DirectiveType.Iterable:
                // 处理列表指令（v-for, *for）
                this.processIterableBinding(element, directiveDef, selectors, attrs);
                break;

            default:
                this.bindingDirective(element, directiveDef, selectors, attrs);
                break;
        }
    }

    /**
     * 处理组件属性
     */
    private processComponentAttribute(componentRef: any, attrName: string, expr: string, context: any, effect: ReactiveEffect<any>, environment: EnvironmentContext): void {
        const attributes = componentRef.def?.attributes || [];

        if (attrName.startsWith('@')) {
            const eventName = attrName.substring(1);
            const inputDef = attributes.find((attr: any) => attr.alias === eventName || attr.propertyKey === eventName);
            if (inputDef) {
                effect.run(() => {
                    const handler = this.evaluateExpression(expr, context, environment);
                    if (componentRef.instance[inputDef.propertyKey] instanceof EventEmitter) {
                        componentRef.instance[inputDef.propertyKey].subscribe(handler);
                    } else if (!componentRef.instance[inputDef.propertyKey]) {
                        componentRef.instance[inputDef.propertyKey] = handler;
                    }
                });
            }
        } else if (attrName.startsWith(':')) {
            const propName = attrName.substring(1);
            const inputDef = attributes.find((attr: any) => attr.alias === propName || attr.propertyKey === propName);
            if (inputDef) {
                effect.run(() => {
                    const attValue = context[expr];
                    componentRef.instance[inputDef.propertyKey] = attValue;
                });
            }
        }
    }

    private bindingDirective(node: RNode, dirDef: DirectiveDef, selectors: string[], attrs: RAttr[], templateNodes?: RNode[]) {

        this.binding(node, (target: RNode, context: any, effect: ReactiveEffect<any>, environment: EnvironmentContext) => {

            // if (environment.destroyed) return;               
            const elementRef = environment.getElementRef(target);
            // 处理条件指令;
            const templateRef = templateNodes ? createTemplateRef(templateNodes, elementRef, { environment }) : undefined;
            if (templateRef) environment.attachTemplate(templateRef);
            const directiveRef = (dirDef as Factoriable).ƿfac?.(environment, { templateRef, elementRef });

            if (directiveRef) {
                environment.attachDirective(directiveRef);
                // 处理指令属性
                this.processDirectiveAttributes(directiveRef, dirDef, selectors, attrs, context, effect, environment);

                if (directiveRef.instance.onInit) {
                    directiveRef.instance.onInit();
                }

            }

            return () => {
                // 清理指令引用
                const directives = target[BIND_DIRECTIVES];
                remove(directives, dirDef);
            }
        });
    }

    /**
     * 处理条件指令组
     */
    private processConditionalBinding(el: RNode, dirDef: DirectiveDef, selectors: string[], attrs: RAttr[]): void {
        const readerer = this.renderer;
        const container = this.createContainer(readerer, dirDef.selector);
        container[BINDINGS] = [];

        const parent = readerer.parentNode(el);
        if (parent) {
            parent.replaceChild(el, container);
        }

        attrs.forEach(attr => {
            readerer.setAttribute(container, attr.name, attr.value)
        });
        dirDef.attributes?.forEach(attrDef => {
            readerer.removeAttribute(container, attrDef.alias ?? attrDef.propertyKey);
        });

        selectors.forEach(selector => {
            readerer.removeAttribute(el, selector);
        });

        this.bindingDirective(container, dirDef, selectors, attrs, [el])

    }

    private processIterableBinding(el: RNode, dirDef: DirectiveDef, selectors: string[], attrs: RAttr[]): void {
        const readerer = this.renderer;
        const container = this.createContainer(readerer, dirDef.selector);
        container[BINDINGS] = [];

        const parent = readerer.parentNode(el);
        if (parent) {
            readerer.insertBefore(parent, container, el);
            readerer.removeChild(parent, el);
        }

        attrs.forEach(attr => {
            readerer.setAttribute(container, attr.name, attr.value)
        });
        dirDef.attributes?.forEach(attrDef => {
            readerer.removeAttribute(container, attrDef.alias ?? attrDef.propertyKey);
        });

        selectors.forEach(selector => {
            readerer.removeAttribute(container, selector);
        });

        this.bindingDirective(container, dirDef, selectors, attrs, [el])

    }

    /**
     * 处理指令属性
     */
    private processDirectiveAttributes(directiveRef: any, directiveDef: DirectiveDef, selectors: string[], attrs: RAttr[], context: any, effect: ReactiveEffect<any>, environment: EnvironmentContext): void {
        const attributes = directiveDef.attributes ?? [];
        if (!attributes?.length) return;

        const directiveInstance = directiveRef.instance;

        attributes.forEach(a => {
            const name = a.alias ?? a.propertyKey;
            const propertyKey = a.propertyKey;
            const matchNames = toMatchNames(name);
            const attr = attrs.find(r => matchNames.includes(r.name));
            if (!attr) {
                if (directiveDef.dirType === DirectiveType.Conditional && a.propertyKey === 'context') {
                    directiveInstance[propertyKey] = context;
                }
                return;
            }


            if (attr.name.startsWith('@')) {
                effect.run(() => {
                    const handler = this.evaluateExpression(attr.value, context, environment);
                    if (directiveInstance[propertyKey] instanceof EventEmitter) {
                        directiveInstance[propertyKey].subscribe(handler);
                    } else if (!directiveInstance[propertyKey]) {
                        directiveInstance[propertyKey] = handler;
                    }
                });
            } else if (attr.name.startsWith(':')) {
                if (isString(attr.value)) {
                    effect.run(() => {
                        const attValue = context[attr.value] ?? attr.value;
                        directiveInstance[propertyKey] = attValue;
                    });
                } else {
                    directiveInstance[propertyKey] = attr.value;
                }
            } else if (selectors.includes(attr.name)) {
                if (isString(attr.value)) {
                    if (directiveDef.dirType === DirectiveType.Iterable) {
                        this.evaluateIterableExpression(directiveInstance, propertyKey, attr.value, context, effect, environment);
                    } else {
                        effect.run(() => {
                            const attValue = this.evaluateExpression(attr.value, context, environment);
                            directiveInstance[propertyKey] = attValue;
                        });
                    }
                } else {
                    directiveInstance[propertyKey] = attr.value;
                }
            }
        });
    }

    /**
     * 使用环境上下文评估分隔符表达式
     */
    private evaluateDelimiterExpression(text: string, context: any, effect: ReactiveEffect<any>, matches: RegExpExecArray[], update: (text: string) => void, environment: EnvironmentContext): void {

        const segments: (string | { expr: string, value: any })[] = [];
        let lastIndex = 0;

        matches.forEach(match => {
            segments.push(text.slice(lastIndex, match.index));
            segments.push({ expr: match[1].trim(), value: null });
            lastIndex = match.index! + match[0].length;
        });
        segments.push(text.slice(lastIndex));

        segments.forEach(segment => {
            if (typeof segment !== 'string') {
                effect.run(() => {
                    segment.value = this.evaluateExpression(segment.expr, context, environment);
                    const updatedText = segments.map(s =>
                        typeof s === 'string' ? s : s.value
                    ).join('');
                    update(updatedText);
                });
            }
        });
    }

    /**
     * 使用环境上下文评估表达式
     */
    private evaluateExpression(expr: string, context: any, environment: EnvironmentContext): any {
        try {
            const parts = expr.split('|').map(part => part.trim());
            if (parts.length <= 1) {
                return new Function('ctx', `with(ctx){return ${expr}}`)(context);
            } else {
                const [expression, ...pipeNames] = this.parsePipes(parts);
                const pipes = pipeNames.reduce((obj, name) => {
                    obj[name] = environment.get(name);
                    return obj;
                }, {} as any);
                return new Function('ctx', 'pipes', `with(ctx){return ${expression}}`)(context, pipes);
            }
        } catch (e) {
            console.error(`Error evaluating expression: ${expr}`, e);
            return '';
        }
    }

    /**
     * 使用环境上下文解析事件表达式
     */
    private parseEventExpression(expr: string, context: any, effect: ReactiveEffect, environment: EnvironmentContext): EventListener {
        const funcCallRegex = /^\s*([_$a-zA-Z\w.]+)\s*\(\s*(.*?)\s*\)\s*$/;
        const match = expr.match(funcCallRegex);

        if (!match) {
            const propPath = expr.trim().split('.');
            return effect.run(() => {
                const handler = propPath.reduce((obj, prop) => obj && obj[prop], context);
                return handler.bind(context);
            });
        }

        const [, funcPath, argsStr] = match;
        const args = this.parseArguments(argsStr, context, environment);

        return effect.run(() => {
            const func = funcPath.split('.').reduce((obj, prop) => obj && obj[prop], context);
            if (typeof func !== 'function') {
                throw new Error(`Event handler ${funcPath} is not a function`);
            }

            return (event: Event) => {
                const resolvedArgs = args.map(arg => {
                    if (arg === '$event') return event;
                    if (typeof arg === 'string') {
                        return arg.split('.').reduce((obj, prop) => obj && obj[prop], context) ?? arg;
                    }
                    return arg;
                });
                return func.apply(context, resolvedArgs);
            };
        });
    }

    private createContainer(readerer: Renderer, text?: string): RElement {
        const container = readerer.createElement('v-container');
        container.nodeType = NodeType.ElementContainer;
        // if (text) container.textContent = text;
        return container;
    }


    protected evaluateIterableExpression(directiveInstance: any, propertyKey: string, expr: string, context: any, effect: ReactiveEffect, environment: EnvironmentContext): any {
        // 1. Vue风格: item in items
        const vueStyle = expr.match(/^\s*((?:\([^)]+\)|[^)])+)\s+(?:in|of)\s+([^]+)$/);
        let itemNames: string[];
        let collectionExpr: string;
        if (vueStyle) {
            collectionExpr = vueStyle[2].trim();
            itemNames = this.processVueStyleExpression(vueStyle[1]);
            return this.bindIterableExpression(directiveInstance, propertyKey, itemNames, collectionExpr, context, effect, environment);
        }

        // 2. Angular风格: let item of items
        const angularStyle = expr.match(/^\s*let\s+([^ ]+)\s+(?:of|in)\s+([^]+)(?:\s*;\s*([^ ]+)\s+as\s+([^ ]+))?$/);
        if (angularStyle) {
            collectionExpr = angularStyle[2].trim();
            itemNames = [angularStyle[1].trim()];
            if (angularStyle[3] && angularStyle[4]) {
                itemNames.push(angularStyle[4].trim())
            }
            return this.bindIterableExpression(directiveInstance, propertyKey, itemNames, collectionExpr, context, effect, environment);
        }

    }

    private bindIterableExpression(directiveInstance: any, propertyKey: string, itemNames: string[], collectionExpr: string, context: any, effect: ReactiveEffect, environment: EnvironmentContext) {

        // 设置v-for指令期望的属性（而不是collection）
        directiveInstance.itemNames = itemNames; // 主循环变量（如item）
        // 设置v-for指令期望的属性
        effect.run(() => {
            const collection = this.evaluateExpression(collectionExpr, context, environment);
            directiveInstance[propertyKey] = collection;     // 集合数据
        });
    }


    // // Vue风格表达式处理: item in items 或 (item, index) in items
    private processVueStyleExpression(itemPart: string,): string[] {
        let names: string[];
        if (itemPart.trim().startsWith('(')) {
            // 处理格式如 (item, index) 的情况
            const innerMatch = itemPart.trim().match(/^\(\s*([^,]+)\s*(?:,\s*([^)]+))?\s*\)$/);
            if (innerMatch) {
                names = [innerMatch[1].trim(), innerMatch[2]?.trim() || ''].filter(Boolean);
            }
            throw new Exception('iterable expression invaild.')
        } else {
            // 处理格式如 item 的情况
            names = [itemPart.trim()];
        }
        return names;
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


    // 解析参数列表，支持字符串、数字、布尔值和变量引用
    private parseArguments(argsStr: string, context: any, environment: EnvironmentContext): any[] {
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
                args.push(this.evaluateArg(currentArg.trim(), context, environment));
                currentArg = '';
            } else if (char === '"' || char === '\'') {
                quoteChar = char;
                currentArg += char;
            } else {
                currentArg += char;
            }
        }

        if (currentArg.trim()) {
            args.push(this.evaluateArg(currentArg.trim(), context, environment));
        }

        return args;
    }
    // 计算参数值 (字符串/数字/布尔值/变量引用)
    private evaluateArg(arg: string, context: any, environment: EnvironmentContext): any {
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
        return this.evaluateExpression(arg, context, environment);
    }

}

const attrPrefixes = [':', '@', '*', 'v-'];

function toMatchNames(attrName: string): string[] {
    const names: string[] = [];
    const kebabName = camelToKebab(attrName);
    for (const prefix of attrPrefixes) {
        names.push(prefix + attrName);
        names.push(prefix + kebabName);
    }
    return names;
}
function camelToKebab(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}