import { Abstract, Exception, isString, remove } from '@tsdi/ioc';
import { CompilerOptions, TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { BIND_DIRECTIVES, BINDINGS, NodeType, RAttr, RElement, RNode, RText } from '../renderer/Node';
import { ComponentDef } from '../refs/component';
import { EventEmitter } from '../EventEmitter';
import { DirectiveDef, DirectiveType, Factoriable } from '../refs/directive';
import { createTemplateRef } from './template';
import { EnvironmentContext } from '../refs/environment';
import { Renderer } from '../renderer/Renderer';
import { Bindings, NodeFactory, TemplateFactory } from '../refs/template';
import { ReactiveEffect } from '../effect';
import { reactive } from '../reactive';



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
     * 编译模板并返回 TemplateFactory
     */
    compile<C>(template: T, options: CompilerOptions): TemplateFactory<C> {
        const nodes = this.parser.parse(template);

        const [components, directives] = this.generateNodeBindings(nodes, options.directives, options.components);

        // 将模板编译为 node factory
        const factory = this.compileToFactory<C>(nodes, directives, components, options);

        return (host, environment) => createTemplateRef<C>(factory, host, { components, directives, environment });
    }

    /**
     * 将模板节点编译为 factory function
     * @param nodes 模板节点
     * @param directives 指令映射
     * @param components 组件映射
     * @param options 编译选项
     * @returns factory function
     */
    private compileToFactory<C>(
        nodes: RNode[],
        directives: Map<RNode, DirectiveDef[]>,
        components: Map<RNode, ComponentDef>,
        options: CompilerOptions
    ): NodeFactory<C> {
        // 预处理指令和组件选择器映射
        const dirSelectorMap = new Map<string, DirectiveDef[]>();
        const compSelectorMap = new Map<string, ComponentDef>();

        // 构建指令和组件的选择器映射
        directives.forEach((dirs, node) => {
            dirs.forEach(dir => {
                const selector = dir.selector;
                if (!dirSelectorMap.has(selector)) {
                    dirSelectorMap.set(selector, []);
                }
                dirSelectorMap.get(selector)!.push(dir);
            });
        });

        components.forEach((comp, node) => {
            compSelectorMap.set(comp.selector, comp);
        });

        // 编译节点为创建函数
        const compiledNodes = nodes.map(node =>
            this.compileNodeToFactory(node, dirSelectorMap, compSelectorMap, options)
        );

        // 返回工厂函数
        return (environment: EnvironmentContext, context: C, effect: ReactiveEffect) => {
            const renderer = environment.get(Renderer);

            // 执行编译好的节点创建函数
            const rootNodes: RNode[] = [];
            compiledNodes.forEach(createNode => {
                const node = createNode(renderer, effect, environment, context);
                if (node) {
                    rootNodes.push(node);
                }
            });

            return rootNodes;
        };
    }

    /**
     * 编译单个节点为工厂函数
     * @param node 节点
     * @param dirSelectorMap 指令选择器映射
     * @param compSelectorMap 组件选择器映射
     * @param options 编译选项
     * @returns 节点工厂函数
     */
    private compileNodeToFactory(
        node: RNode,
        dirSelectorMap: Map<string, DirectiveDef[]>,
        compSelectorMap: Map<string, ComponentDef>,
        options: CompilerOptions
    ): (renderer: Renderer, effect: ReactiveEffect, environment: EnvironmentContext, context: any) => RNode | null {
        if (node.nodeType === NodeType.Text || node.nodeType === NodeType.Comment) {
            return this.compileTextToFactory(node as RText);
        } else {
            return this.compileElementToFactory(node as RElement, dirSelectorMap, compSelectorMap, options);
        }
    }

    /**
     * 编译文本节点为工厂函数
     * @param node 文本节点
     * @returns 文本节点工厂函数
     */
    private compileTextToFactory(node: RText): (renderer: Renderer, effect: ReactiveEffect, environment: EnvironmentContext, context: any) => RText | null {
        const text = node.textContent || '';
        const bindings = node[BINDINGS] || [];

        // 如果没有绑定，直接返回静态文本节点创建函数
        if (!bindings.length) {
            return (renderer: Renderer) => {
                return renderer.createText(text);
            };
        }

        // 有绑定的文本节点，返回包含绑定逻辑的工厂函数
        return (renderer: Renderer, effect: ReactiveEffect, environment: EnvironmentContext, context: any) => {
            const textNode = renderer.createText(text);

            // 应用绑定
            bindings.forEach(binding => {
                const unbinding = binding(textNode, context, effect, environment);
                unbinding && environment.onDestroy(unbinding);
            });

            return textNode;
        };
    }

    /**
     * 编译元素节点为工厂函数
     * @param node 元素节点
     * @param dirSelectorMap 指令选择器映射
     * @param compSelectorMap 组件选择器映射
     * @param options 编译选项
     * @returns 元素节点工厂函数
     */
    private compileElementToFactory(
        node: RElement,
        dirSelectorMap: Map<string, DirectiveDef[]>,
        compSelectorMap: Map<string, ComponentDef>,
        options: CompilerOptions
    ): (renderer: Renderer, effect: ReactiveEffect, environment: EnvironmentContext, context: any) => RElement | null {
        const tagName = node.tagName;
        const attrs = this.renderer.getAttributes(node);
        const bindings = node[BINDINGS] || [];
        const directives = node[BIND_DIRECTIVES] || [];

        // 检查是否是组件
        const componentDef = compSelectorMap.get(tagName);
        if (componentDef) {
            return this.compileComponentToFactory(node, componentDef, attrs, bindings);
        }

        // 检查是否是模板标签
        const templateTag = this.options.templateTag || 'template';
        if (tagName === templateTag) {
            return this.compileTemplateToFactory(node, attrs, bindings, dirSelectorMap, compSelectorMap, options);
        }

        // 编译子节点
        const childFactories: Array<(renderer: Renderer, effect: ReactiveEffect, environment: EnvironmentContext, context: any) => RNode | null> = [];
        if (node.childNodes) {
            for (const child of node.childNodes) {
                const childFactory = this.compileNodeToFactory(child, dirSelectorMap, compSelectorMap, options);
                childFactories.push(childFactory);
            }
        }

        // 编译属性
        const compiledAttrs = attrs.map(attr => this.compileAttributeToFactory(attr));

        // 返回元素工厂函数
        return (renderer: Renderer, effect: ReactiveEffect, environment: EnvironmentContext, context: any) => {
            // 创建元素
            const element = renderer.createElement(tagName);

            // 应用属性
            compiledAttrs.forEach(applyAttr => {
                applyAttr(element, renderer);
            });

            // 创建并添加子节点
            childFactories.forEach(createChild => {
                const child = createChild(renderer, effect, environment, context);
                if (child) {
                    renderer.appendChild(element, child);
                }
            });

            // 应用绑定
            bindings.forEach(binding => {
                const unbinding = binding(element, context, effect, environment);
                unbinding && environment.onDestroy(unbinding);
            });

            // 应用指令
            directives.forEach(dirDef => {
                this.applyDirectiveToElement(element, dirDef, attrs, effect, environment, context);
            });

            return element;
        };
    }

    /**
     * 编译属性为应用函数
     * @param attr 属性
     * @returns 属性应用函数
     */
    private compileAttributeToFactory(attr: RAttr): (element: RElement, renderer: Renderer) => void {
        const { name, value, namespace } = attr;

        // 静态属性直接返回设置函数
        return (element: RElement, renderer: Renderer) => {
            renderer.setAttribute(element, name, value, namespace);
        };
    }

    /**
     * 编译组件为工厂函数
     * @param node 元素节点
     * @param componentDef 组件定义
     * @param attrs 属性列表
     * @param bindings 绑定列表
     * @returns 组件工厂函数
     */
    private compileComponentToFactory(
        node: RElement,
        componentDef: ComponentDef,
        attrs: RAttr[],
        bindings: any[]
    ): (renderer: Renderer, effect: ReactiveEffect, environment: EnvironmentContext) => RElement | null {
        const compiledAttrs = attrs.map(attr => this.compileAttributeToFactory(attr));

        return (renderer: Renderer, effect: ReactiveEffect, environment: EnvironmentContext) => {
            // 创建元素
            const element = renderer.createElement(node.tagName);

            // 应用属性
            compiledAttrs.forEach(applyAttr => {
                applyAttr(element, renderer);
            });

            // 创建组件实例
            const elementRef = environment.getElementRef(element);
            const componentRef = (componentDef as Factoriable).ƿfac?.(environment, { elementRef });

            if (!componentRef) return element;

            // 应用绑定
            bindings.forEach(binding => {
                const unbinding = binding(element, null, effect, environment);
                unbinding && environment.onDestroy(unbinding);
            });

            // 附加组件到环境
            environment.attachComponent(componentRef);

            // 渲染组件
            componentRef.render();

            return element;
        };
    }

    /**
     * 编译模板为工厂函数
     * @param node 模板节点
     * @param attrs 属性列表
     * @param bindings 绑定列表
     * @returns 模板工厂函数
     */
    private compileTemplateToFactory(
        node: RElement,
        attrs: RAttr[],
        bindings: any[],
        dirSelectorMap: Map<string, DirectiveDef[]>,
        compSelectorMap: Map<string, ComponentDef>,
        options: CompilerOptions
    ): (renderer: Renderer, effect: ReactiveEffect, environment: EnvironmentContext, context: any) => RElement | null {
        const compiledAttrs = attrs.map(attr => this.compileAttributeToFactory(attr));
        const childNodes = node.childNodes || [];
        const childFactories: Array<(renderer: Renderer, effect: ReactiveEffect, environment: EnvironmentContext, context: any) => RNode | null> = [];

        // 编译子节点
        for (const child of childNodes) {
            const childFactory = this.compileNodeToFactory(child, dirSelectorMap, compSelectorMap, options);
            childFactories.push(childFactory);
        }

        return (renderer: Renderer, effect: ReactiveEffect, environment: EnvironmentContext, context: any) => {
            // 创建元素
            const element = renderer.createElement(node.tagName);

            // 应用属性
            compiledAttrs.forEach(applyAttr => {
                applyAttr(element, renderer);
            });

            // 创建并添加子节点
            childFactories.forEach(createChild => {
                const child = createChild(renderer, effect, environment, context);
                if (child) {
                    renderer.appendChild(element, child);
                }
            });

            // 应用绑定
            bindings.forEach(binding => {
                const unbinding = binding(element, null, effect, environment);
                unbinding && environment.onDestroy(unbinding);
            });

            return element;
        };
    }

    /**
     * 应用指令到元素
     * @param element 元素
     * @param directive 指令定义
     * @param attrs 属性列表
     * @param effect 响应式效果
     * @param environment 环境上下文
     */
    private applyDirectiveToElement(
        element: RElement,
        directive: DirectiveDef,
        attrs: RAttr[],
        effect: ReactiveEffect,
        environment: EnvironmentContext,
        context: any
    ): void {
        const elementRef = environment.getElementRef(element);
        const directiveRef = (directive as Factoriable).ƿfac?.(environment, { elementRef, context });

        if (!directiveRef) return;

        // 附加指令到环境
        environment.attachDirective(directiveRef);

        // 处理指令属性
        this.processDirectiveAttributes(directiveRef, directive, [], attrs, null, effect, environment);

        // 初始化指令
        if (directiveRef.instance.onInit) {
            directiveRef.instance.onInit();
        }
    }

    /**
     * 创建可复用的属性绑定工厂
     */
    private generateNodeBindings<C>(
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
        this.walkNodesForBindings(nodes, dirMap, compMap);
        return [compMap, dirMap];
    }

    /**
     * 遍历节点创建绑定工厂
     */
    private walkNodesForBindings<C>(
        nodes: RNode[],
        dirMap: Map<RNode, DirectiveDef[]>,
        compMap: Map<RNode, ComponentDef>
    ): void {
        for (const node of nodes) {
            node[BINDINGS] = [];
            if (node.nodeType === NodeType.Text || node.nodeType === NodeType.Comment) {
                // 创建文本节点的绑定工厂
                this.bindingText(node as RText, (node as RText).textContent);
            } else {
                // 创建元素节点的绑定工厂
                this.bindingElement(node as RElement, dirMap, compMap);
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
    private bindingText(node: RText, expr: string | null): void {
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
            this.bindingAtrrbutes(node, attrs);
        }
    }

    /**
     * 创建文本节点的绑定工厂
     */
    private bindingTemplate(element: RElement): void {
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
    protected bindingElement<C>(
        element: RElement,
        dirMap: Map<RNode, DirectiveDef[]>,
        compMap: Map<RNode, ComponentDef>
    ): void {
        const attrs = this.renderer.getAttributes(element);

        // 创建属性绑定工厂
        this.bindingAtrrbutes(element, attrs);

        // 递归处理子节点
        if (element.childNodes.length > 0) {
            this.walkNodesForBindings(element.childNodes, dirMap, compMap);
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
            this.bindingTemplate(element)
        }

    }

    protected bindingAtrrbutes(element: RNode, attrs: RAttr[]) {
        // 创建属性绑定工厂
        attrs.forEach(({ name, value }) => {
            if (name.startsWith('@')) {
                // 事件绑定工厂
                this.bindingEvent(element, name, value);
            } else if (name.startsWith(':')) {
                // 属性绑定工厂
                this.bindingProperty(element, name, value);
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
    private bindingEvent(element: RNode, attrName: string, expr: string): void {
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
    private bindingProperty(element: RNode, attrName: string, expr: string): void {
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