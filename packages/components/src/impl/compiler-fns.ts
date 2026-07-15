import { Exception, isString, remove } from '@tsdi/ioc';
import { CompilerOptions } from '../template/compiler';
import { DIRECTIVES, BINDINGS, NodeType, RAttr, RElement, RNode, RText, COMPONENTDEF, CUSTOM_ELEMENTS } from '../renderer/Node';
import { ComponentDef } from '../refs/component';
import { DirectiveDef, DirectiveType, Factoriable } from '../refs/directive';
import { NodeInjector } from '../refs/injector';
import { Renderer } from '../renderer/Renderer';
import { Bindings, NodeFactory } from '../refs/template';
import { ReactiveEffect } from '../effect';
import { reactive } from '../reactive';
import { EventEmitter } from '../EventEmitter';
import { Subscription } from 'rxjs';
import { createTemplateRef } from './template';
import { TEMPLATE_SCOPE_PARENT } from './template';
import { BaseIfDirective, VIfDirective, VElseIfDirective, VElseDirective, setupIfChain } from '../directives/if.dir';
import { SwitchDirective, CaseDirective, DefaultDirective, registerSwitchDirective, findSwitchDirective } from '../directives/switch-case.dir';


export type Rendering<T extends RNode> = (renderer: Renderer, effect: ReactiveEffect, injector: NodeInjector, context: any) => T | null;

export interface RendererOptions {
    templateTag?: string;
    delimiter: RegExp;
    textFactory: (node: RText, options: CompilerOptions) => Rendering<RText>;
    elementFactory: (node: RElement, renderer: Renderer, options: CompilerOptions, rendererOptions: RendererOptions) => Rendering<RElement>;
    attributeFactory: (attr: RAttr) => (element: RElement, renderer: Renderer) => void;
    componentFactory: (node: RElement, renderer: Renderer, componentDef: ComponentDef, attrs: RAttr[], bindings: any[]) => Rendering<RElement>,
    templateFactory: (node: RElement, renderer: Renderer, attrs: RAttr[], bindings: any[], options: CompilerOptions, rendererOptions: RendererOptions) => Rendering<RElement>,
    bindDirective: (element: RElement, directive: DirectiveDef, attrs: RAttr[], effect: ReactiveEffect, injector: NodeInjector, context: any, delimiter: RegExp) => void,
}

const outputSubscriptions = new WeakMap<object, Map<string, Subscription>>();
const outputSubscriptionCleanup = new WeakSet<object>();

function replaceOutputSubscription(target: object, key: string, emitter: EventEmitter<any>, handler: any, injector: NodeInjector): void {
    let subscriptions = outputSubscriptions.get(target);
    if (!subscriptions) {
        subscriptions = new Map<string, Subscription>();
        outputSubscriptions.set(target, subscriptions);
    }
    subscriptions.get(key)?.unsubscribe();
    subscriptions.set(key, emitter.subscribe(handler));

    if (outputSubscriptionCleanup.has(target)) {
        return;
    }
    outputSubscriptionCleanup.add(target);
    injector.onDestroy(() => {
        const current = outputSubscriptions.get(target);
        current?.forEach(subscription => subscription.unsubscribe());
        current?.clear();
        outputSubscriptions.delete(target);
        outputSubscriptionCleanup.delete(target);
    });
}

/**
 * 将模板节点编译为 factory function
 * @param nodes 模板节点
 * @param options 编译选项
 * @param compileNodeToFactory 节点编译函数
 * @returns factory function
 */
export function compileToFactory<C>(
    nodes: RNode[],
    renderer: Renderer,
    options: CompilerOptions,
    rendererOptions: RendererOptions
): NodeFactory<C> {
    // 编译节点为创建函数
    const compiledNodes = nodes.map(node =>
        compileNodeToFactory(node, renderer, options, rendererOptions)
    );

    // 返回工厂函数
    return (renderer: Renderer, injector: NodeInjector, context: C, effect: ReactiveEffect) => {
        // 执行编译好的节点创建函数
        const rootNodes: RNode[] = [];
        compiledNodes.forEach(createNode => {
            const node = createNode(renderer, effect, injector, context);
            if (node) {
                rootNodes.push(node);
            }
        });

        return rootNodes;
    };
}

/**
 * 编译文本节点为工厂函数
 * @param node 文本节点
 * @returns 文本节点工厂函数
 */
export function compileTextToFactory(node: RText): Rendering<RText> {
    const text = node.textContent || '';
    const bindings = node[BINDINGS] || [];

    // 如果没有绑定，直接返回静态文本节点创建函数
    if (!bindings.length) {
        return (renderer: Renderer) => {
            return renderer.createText(text);
        };
    }

    // 有绑定的文本节点，返回包含绑定逻辑的工厂函数
    return (renderer: Renderer, effect: ReactiveEffect, injector: NodeInjector, context: any) => {
        const textNode = renderer.createText(text);

        // 应用绑定
        bindings.forEach(binding => {
            const unbinding = binding(textNode, context, effect, injector);
            unbinding && injector.onDestroy(unbinding);
        });

        return textNode;
    };
}

/**
 * 编译元素节点为工厂函数
 * @param node 元素节点
 * @param options 编译选项
 * @param compileNodeToFactory 节点编译函数
 * @param compileAttributeToFactory 属性编译函数
 * @param compileComponentToFactory 组件编译函数
 * @param compileTemplateToFactory 模板编译函数
 * @param applyDirectiveToElement 指令应用函数
 * @param templateTag 模板标签
 * @returns 元素节点工厂函数
 */
export function compileElementToFactory(
    node: RElement,
    renderer: Renderer,
    options: CompilerOptions,
    rendererOptions: RendererOptions
): Rendering<RElement> {
    const tagName = node.tagName;
    const attrs = renderer.getAttributes(node);
    const bindings = node[BINDINGS] || [];
    const directives = node[DIRECTIVES] || [];

    // 检查是否是组件
    const componentDef = node[COMPONENTDEF];
    if (componentDef) {
        return rendererOptions.componentFactory(node, renderer, componentDef, attrs, bindings);
    }

    // 检查是否是模板标签
    if (tagName === rendererOptions.templateTag) {
        return  rendererOptions.templateFactory(node, renderer, attrs, bindings, options, rendererOptions);
    }

    // 检查是否有结构指令（v-for, v-if等）
    const hasStructuralDirective = directives.some(d => 
        d.dirType === DirectiveType.Iterable || d.dirType === DirectiveType.Conditional
    );

    // 编译子节点（如果没有结构指令）
    const childFactories: Array<(renderer: Renderer, effect: ReactiveEffect, injector: NodeInjector, context: any) => RNode | null> = [];
    if (node.childNodes && !hasStructuralDirective) {
        for (const child of node.childNodes) {
            const childFactory = compileNodeToFactory(child, renderer, options, rendererOptions);
            childFactories.push(childFactory);
        }
    }

    // 编译属性
    const compiledAttrs = attrs.map(attr => rendererOptions.attributeFactory(attr));

    // 返回元素工厂函数
    return (renderer: Renderer, effect: ReactiveEffect, injector: NodeInjector, context: any) => {
        // 创建元素
        const element = renderer.createElement(tagName);
        // Copy nodeType from original node to preserve ElementContainer flag (only for virtual DOM)
        try {
            element.nodeType = node.nodeType;
        } catch {
            // Real DOM nodes have read-only nodeType, skip
        }

        // 应用属性
        compiledAttrs.forEach(applyAttr => {
            applyAttr(element, renderer);
        });

        // 创建并添加子节点
        childFactories.forEach(createChild => {
            const child = createChild(renderer, effect, injector, context);
            if (child) {
                renderer.appendChild(element, child);
            }
        });

        // 应用指令（在子节点添加后）
        directives.forEach(dirDef => {
            rendererOptions.bindDirective(element, dirDef, attrs, effect, injector, context, rendererOptions.delimiter);
        });

        // 延迟绑定执行到微任务，确保元素已被添加到父节点
        // 这样 target.parentNode 在绑定执行时会被正确设置
        if (bindings.length > 0) {
            const deferredBindings = [...bindings];
            Promise.resolve().then(() => {
                deferredBindings.forEach(binding => {
                    const unbinding = binding(element, context, effect, injector);
                    unbinding && injector.onDestroy(unbinding);
                });
            });
        }

        return element;
    };
}


/**
 * 编译单个节点为工厂函数
 * @param node 节点
 * @param options 编译选项
 * @param compileTextToFactory 文本节点编译函数
 * @param compileElementToFactory 元素节点编译函数
 * @returns 节点工厂函数
 */
function compileNodeToFactory(
    node: RNode,
    renderer: Renderer,
    options: CompilerOptions,
    rendererOptions: RendererOptions
): Rendering<RNode> {
    if (node.nodeType === NodeType.Text || node.nodeType === NodeType.Comment) {
        return rendererOptions.textFactory(node as RText, options);
    } else {
        return rendererOptions.elementFactory(node as RElement, renderer, options, rendererOptions);
    }
}

/**
 * 编译属性为应用函数
 * @param attr 属性
 * @returns 属性应用函数
 */
export function compileAttributeToFactory(attr: RAttr): (element: RElement, renderer: Renderer) => void {
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
export function compileComponentToFactory(
    node: RElement,
    renderer: Renderer,
    componentDef: ComponentDef,
    attrs: RAttr[],
    bindings: any[]
): Rendering<RElement> {
    const compiledAttrs = attrs.map(attr => compileAttributeToFactory(attr));

    return (renderer: Renderer, effect: ReactiveEffect, injector: NodeInjector, context: any) => {
        // 创建元素
        const element = renderer.createElement(node.tagName);

        // 应用属性
        compiledAttrs.forEach(applyAttr => {
            applyAttr(element, renderer);
        });

        // 创建组件实例
        const elementRef = injector.getElementRef(element);
        const componentRef = (componentDef as Factoriable).ƿfac?.(injector, { elementRef });

        if (!componentRef) return element;

        // 处理静态属性
        attrs.forEach(({ name, value }) => {
            if (!name.startsWith('@') && !name.startsWith(':') && !name.startsWith('[') && !name.startsWith('v-')) {
                const inputDef = (componentRef.def?.attributes || []).find((attr: any) => attr.alias === name || attr.propertyKey === name);
                if (inputDef) {
                    componentRef.instance[inputDef.propertyKey] = value;
                }
            }
        });

        // 应用绑定
        bindings.forEach(binding => {
            const unbinding = binding(element, context, effect, injector);
            unbinding && injector.onDestroy(unbinding);
        });

        // 附加组件到环境
        injector.attachComponent(componentRef);

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
 * @param options 编译选项
 * @param compileNodeToFactory 节点编译函数
 * @returns 模板工厂函数
 */
export function compileTemplateToFactory(
    node: RElement,
    renderer: Renderer,
    attrs: RAttr[],
    bindings: any[],
    options: CompilerOptions,
    rendererOptions: RendererOptions
): (renderer: Renderer, effect: ReactiveEffect, injector: NodeInjector, context: any) => RElement | null {
    const compiledAttrs = attrs.map(attr => compileAttributeToFactory(attr));
    const childNodes = node.childNodes || [];
    const childFactories: Array<(renderer: Renderer, effect: ReactiveEffect, injector: NodeInjector, context: any) => RNode | null> = [];

    // 编译子节点
    for (const child of childNodes) {
        const childFactory = compileNodeToFactory(child, renderer, options, rendererOptions);
        childFactories.push(childFactory);
    }

    return (renderer: Renderer, effect: ReactiveEffect, injector: NodeInjector, context: any) => {
        // 创建元素
        const element = renderer.createElement(node.tagName);

        // 应用属性
        compiledAttrs.forEach(applyAttr => {
            applyAttr(element, renderer);
        });

        // 创建并添加子节点
        childFactories.forEach(createChild => {
            const child = createChild(renderer, effect, injector, context);
            if (child) {
                renderer.appendChild(element, child);
            }
        });

        // 应用绑定
        bindings.forEach(binding => {
            const unbinding = binding(element, null, effect, injector);
            unbinding && injector.onDestroy(unbinding);
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
 * @param injector 环境上下文
 * @param context 上下文
 * @param processDirectiveAttributes 指令属性处理函数
 */
export function applyDirectiveToElement(
    element: RElement,
    directive: DirectiveDef,
    attrs: RAttr[],
    effect: ReactiveEffect,
    injector: NodeInjector,
    context: any,
    delimiter: RegExp
): void {
    const elementRef = injector.getElementRef(element);
    const directiveRef = (directive as Factoriable).ƿfac?.(injector, { elementRef, context });

    if (!directiveRef) return;

    // 附加指令到环境
    injector.attachDirective(directiveRef);

    const instance = directiveRef.instance;

    // 注册 SwitchDirective 到 switchChains
    if (instance instanceof SwitchDirective) {
        registerSwitchDirective(instance, element);
    }

    // 处理指令属性
    processDirectiveAttributes(directiveRef, directive, [], attrs, context, effect, injector, delimiter);

    // 初始化指令
    if (instance.onInit) {
        instance.onInit();
    }
}


/**
 * 遍历节点创建绑定工厂
 * @param nodes 节点列表
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export function walkNodesForBindings<C>(
    nodes: RNode[],
    renderer: Renderer,
    delimiter: RegExp
): void {
    for (const node of nodes) {
        node[BINDINGS] = [];
        if (node.nodeType === NodeType.Text || node.nodeType === NodeType.Comment) {
            // 创建文本节点的绑定工厂
            bindingText(node as RText, (node as RText).textContent, renderer, delimiter);
        } else {
            // 创建元素节点的绑定工厂
            bindingElement(node as RElement, renderer, delimiter);
        }
    }
}


/**
 * 生成节点绑定
 * @param nodes 节点列表
 * @param directives 指令定义列表
 * @param components 组件定义列表
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 * @param walkNodesForBindings 节点遍历函数
 */
export function generateNodeBindings<C>(
    nodes: RNode[],
    directives: DirectiveDef[],
    components: ComponentDef[],
    renderer: Renderer,
    delimiter: RegExp,
    nodesForBindings: ((nodes: RNode[], renderer: Renderer, delimiter: RegExp) => void) = walkNodesForBindings<C>,
    customElements: DirectiveDef[] = []
): void {
    const rootNodes = nodes;

    // 收集组件和指令
    components.forEach(cdef => {
        const nodes = renderer.querySelectorAll(rootNodes, cdef.selector);
        nodes?.forEach(n => {
            if (n[COMPONENTDEF]) {
                throw new Exception('has dup component selector');
            }
            n[COMPONENTDEF] = cdef;
        });
    });

    directives.forEach(r => {
        const nodes = renderer.querySelectorAll(rootNodes, r.selector);
        nodes?.forEach(n => {
            if (n[COMPONENTDEF]?.type === r.type) {
                return;
            }
            const dirs = n[DIRECTIVES];
            if (dirs) {
                dirs.push(r);
            } else {
                n[DIRECTIVES] = [r];
            }
        });
    });

    // 收集自定义元素指令
    customElements.forEach(cdef => {
        const nodes = renderer.querySelectorAll(rootNodes, cdef.selector);
        nodes?.forEach(n => {
            if (n[COMPONENTDEF]?.type === cdef.type) {
                return;
            }
            const custs = n[CUSTOM_ELEMENTS];
            if (custs) {
                custs.push(cdef);
            } else {
                n[CUSTOM_ELEMENTS] = [cdef];
            }
        });
    });

    // 为每个节点创建绑定工厂
    nodesForBindings(nodes, renderer, delimiter);
}


/**
 * 添加绑定到节点
 * @param node 节点
 * @param factory 绑定工厂函数
 */
export function binding(node: RNode, factory: Bindings) {
    node[BINDINGS]?.push(factory);
}

/**
 * 匹配分隔符表达式
 * @param expr 表达式字符串
 * @param delimiter 分隔符正则表达式
 * @returns 匹配结果数组
 */
export function matchDelimiter(expr: string, delimiter: RegExp): RegExpExecArray[] | null {
    const matches = expr.matchAll(createStableDelimiter(delimiter));
    if (!matches) return null;
    return Array.from(matches);
}

export function hasDelimiter(expr: string, delimiter: RegExp): boolean {
    if (!expr) {
        return false;
    }
    const tester = createStableDelimiter(delimiter);
    tester.lastIndex = 0;
    return tester.test(expr);
}

function createStableDelimiter(delimiter: RegExp): RegExp {
    const flags = delimiter.flags.includes('g')
        ? delimiter.flags
        : `${delimiter.flags}g`;
    return new RegExp(delimiter.source, flags);
}

/**
 * 创建文本节点的绑定工厂
 * @param node 文本节点
 * @param expr 表达式
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export function bindingText(node: RText, expr: string | null, renderer: Renderer, delimiter: RegExp): void {
    if (!expr) {
        return;
    }

    const matches = matchDelimiter(expr, delimiter);
    if (!matches?.length) return;

    binding(node, (target: RNode, context: any, effect, injector: NodeInjector) => {
        const textNode = target as RText;
        evaluateDelimiterExpression(expr, context, effect, matches, (updatedText) => {
            textNode.textContent = updatedText;
        }, injector, delimiter);

        return () => {
            textNode.textContent = expr;
        }
    });

    const attrs = renderer.getAttributes(node);
    if (attrs?.length) {
        bindingAtrrbutes(node, attrs, renderer, delimiter);
    }
}

/**
 * 创建模板节点的绑定工厂
 * @param element 元素节点
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export function bindingTemplate(element: RElement, renderer: Renderer, delimiter: RegExp): void {
    const childNodes = element.childNodes;
    element.childNodes = [];
    binding(element, (target: RNode, context: any, effect: ReactiveEffect<any>, injector: NodeInjector) => {
        if (injector.destroyed) return;
        const el = target as RElement;
        const elementRef = injector.getElementRef(el);
        let ctx: any;

        if (el.hasAttribute(':templateOutletContext')) {
            ctx = reactive({}, effect);
            const expr = el.getAttribute(':templateOutletContext')!;
            effect.run(() => {
                const value = evaluateExpression(expr, context, injector, delimiter);
                Object.assign(ctx, value);
            })
        } else {
            const attrs = renderer.getAttributes(el);
            const vals = attrs.filter(r => r.name.startsWith(':')).map(r => [r.name.slice(1), r.value]);

            if (vals.length) {
                ctx = reactive({}, effect);
                effect.run(() => {
                    vals.forEach(([name, expr]) => {
                        const value = evaluateExpression(expr, context, injector, delimiter);
                        ctx[name] = value;
                    });
                })
            } else {
                ctx = undefined;
            }
        }

        const templateRef = createTemplateRef(childNodes, elementRef, { injector, context: ctx })

        if (templateRef) {
            injector.attachTemplate(templateRef);
        }
    });
}

/**
 * 创建元素节点的绑定工厂
 * @param element 元素节点
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export function bindingElement<C>(
    element: RElement,
    renderer: Renderer,
    delimiter: RegExp
): void {
    const attrs = renderer.getAttributes(element);
    const dirs = element[DIRECTIVES];

    // 结构指令宿主本身的事件/属性绑定也需要保留在模板节点上，
    // 否则像 <button v-for ... @click="..."> 这类场景在嵌入视图里不会生效。
    bindingAtrrbutes(element, attrs, renderer, delimiter);

    if (element.childNodes.length > 0) {
        walkNodesForBindings(element.childNodes, renderer, delimiter);
    }

    // 处理组件和指令
    const componentDef = element[COMPONENTDEF];
    if (componentDef) {
        bindingComponentFactory(element, componentDef, attrs, renderer, delimiter);
    }

    if (dirs && dirs.length) {
        // Sort directives by priority (higher priority first)
        dirs.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
        element[DIRECTIVES] = dirs;
        dirs.forEach(dirDef => {
            bindingDirectiveFactory(element, dirDef, attrs, renderer, delimiter);
        });
    }

    if (element.nodeType === NodeType.Template) {
        bindingTemplate(element, renderer, delimiter)
    }
}

/**
 * 创建属性绑定工厂
 * @param element 元素节点
 * @param attrs 属性列表
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export function bindingAtrrbutes(element: RNode, attrs: RAttr[], renderer: Renderer, delimiter: RegExp) {
    // 创建属性绑定工厂
    attrs.forEach(({ name, value }) => {
        if (name.startsWith('@')) {
            // 事件绑定工厂
            bindingEvent(element, name, value, renderer, delimiter);
        } else if (name.startsWith(':')) {
            // 属性绑定工厂
            bindingProperty(element, name, value, renderer, delimiter);
        } else if (name === 'v-model') {
            createModelBindingFactory(element, value, renderer, delimiter);
        } else if (hasDelimiter(value, delimiter)) {
            // 插值表达式绑定工厂
            bindingInterpolationFactory(element, name, value, renderer, delimiter);
        }
    });
}

/**
 * 创建事件绑定工厂
 * @param element 元素节点
 * @param attrName 属性名
 * @param expr 表达式
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export function bindingEvent(element: RNode, attrName: string, expr: string, renderer: Renderer, delimiter: RegExp): void {
    const eventName = attrName.substring(1);

    binding(element, (target, context, effect, injector) => {
        const el = target as RElement;
        const handler = parseEventExpression(expr, context, effect, injector, delimiter);
        el.addEventListener(eventName, handler);

        return () => {
            el.removeEventListener?.(eventName, handler);
        }
    });
}

/**
 * 创建属性绑定工厂
 * @param element 元素节点
 * @param attrName 属性名
 * @param expr 表达式
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export function bindingProperty(element: RNode, attrName: string, expr: string, renderer: Renderer, delimiter: RegExp): void {
    const propName = attrName.substring(1);
    binding(element, (target: RNode, context: any, effect: ReactiveEffect<any>, injector: NodeInjector) => {
        const el = target as RElement;
        if (!el.setProperty) return;
        effect.run(() => {
            const attValue = evaluateExpression(expr, context, injector, delimiter);
            el.setProperty!(propName, attValue);
        });
        return () => el.removeAttribute(propName);
    });
}

/**
 * 创建插值表达式绑定工厂
 * @param element 元素节点
 * @param attrName 属性名
 * @param expr 表达式
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export function bindingInterpolationFactory(element: RNode, attrName: string, expr: string, renderer: Renderer, delimiter: RegExp): void {
    if (!expr) {
        return;
    }

    const matches = matchDelimiter(expr, delimiter);
    if (!matches?.length) return;

    binding(element, (target: RNode, context: any, effect: ReactiveEffect<any>, injector: NodeInjector) => {
        const el = target as RElement;
        evaluateDelimiterExpression(expr, context, effect, matches, (updatedText) => {
            el.setAttribute(attrName, updatedText);
        }, injector, delimiter);

        return () => el.setAttribute(attrName, expr); // 恢复原始值
    });
}

/**
 * 创建双向绑定工厂
 * @param element 元素节点
 * @param prop 属性名
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export function createModelBindingFactory(element: RNode, prop: string, renderer: Renderer, delimiter: RegExp): void {
    binding(element, (target: RNode, context: any, effect: ReactiveEffect<any>, injector: NodeInjector) => {
        const el = target as RElement;
        const inputHandler = () => {
            context[prop] = el.getAttribute('value');
        };
        el.addEventListener('input', inputHandler);
        effect.run(() => {
            el.setAttribute('value', context[prop]);
        });

        return () => {
            const el = target as RElement;
            el.removeAttribute('value');
            el.removeEventListener?.('input', inputHandler);
        }
    });
}

/**
 * 创建组件绑定工厂
 * @param element 元素节点
 * @param componentDef 组件定义
 * @param attrs 属性列表
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export function bindingComponentFactory(element: RElement, componentDef: ComponentDef, attrs: RAttr[], renderer: Renderer, delimiter: RegExp): void {
    binding(element, (target: RNode, context: any, effect: ReactiveEffect<any>, injector: NodeInjector) => {
        if (injector.destroyed) return;
        const el = target as RElement;
        const elementRef = injector.getElementRef(el);
        const componentRef = (componentDef as Factoriable).ƿfac?.(injector, { elementRef });

        if (componentRef) {
            injector.attachComponent(componentRef);

            // 处理组件属性绑定
            attrs.forEach(({ name, value }) => {
                processComponentAttribute(componentRef, name, value, context, effect, injector, delimiter);
            });

            componentRef.render();
        }
    });
}

/**
 * 创建指令绑定工厂
 * @param element 元素节点
 * @param directiveDef 指令定义
 * @param attrs 属性列表
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export function bindingDirectiveFactory(element: RElement, directiveDef: DirectiveDef, attrs: RAttr[], renderer: Renderer, delimiter: RegExp): void {
    const selectors = directiveDef.selector.split(',').map(sel => sel.replace(/^\[|\]$/g, ''));

    switch (directiveDef.dirType) {
        case DirectiveType.Conditional:
            // 处理条件指令组（v-if, v-else-if, v-else, *if, *else-if, *else, v-show, *show, v-case, *case）
            // v-switch and v-case are structural directives that create containers
            if (directiveDef.selector.includes('v-switch') || directiveDef.selector.includes('*switch')) {
                // v-switch is not a structural directive - it just provides the switch value
                bindingDirective(element, directiveDef, selectors, attrs, renderer, delimiter);
            } else if (directiveDef.selector.includes('v-case') || directiveDef.selector.includes('*case')) {
                // v-case is a structural directive that creates a container
                processConditionalBinding(element, directiveDef, selectors, attrs, renderer, delimiter);
            } else {
                processConditionalBinding(element, directiveDef, selectors, attrs, renderer, delimiter);
            }
            break;

        case DirectiveType.Iterable:
            // 处理列表指令（v-for, *for）
            processIterableBinding(element, directiveDef, selectors, attrs, renderer, delimiter);
            break;

        default:
            bindingDirective(element, directiveDef, selectors, attrs, renderer, delimiter);
            break;
    }
}

/**
 * 处理组件属性
 * @param componentRef 组件引用
 * @param attrName 属性名
 * @param expr 表达式
 * @param context 上下文
 * @param effect 响应式效果
 * @param injector 环境上下文
 * @param delimiter 分隔符正则表达式
 */
export function processComponentAttribute(componentRef: any, attrName: string, expr: string, context: any, effect: ReactiveEffect<any>, injector: NodeInjector, delimiter: RegExp): void {
    const attributes = componentRef.def?.attributes || [];

    if (attrName.startsWith('@')) {
        const eventName = attrName.substring(1);
        const inputDef = attributes.find((attr: any) => attr.alias === eventName || attr.propertyKey === eventName);
        if (inputDef) {
            effect.run(() => {
                const handler = evaluateExpression(expr, context, injector, delimiter);
                if (componentRef.instance[inputDef.propertyKey] instanceof EventEmitter) {
                    replaceOutputSubscription(
                        componentRef.instance,
                        `component:${inputDef.propertyKey}:${eventName}`,
                        componentRef.instance[inputDef.propertyKey],
                        handler,
                        injector
                    );
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
    } else {
        const inputDef = attributes.find((attr: any) => attr.alias === attrName || attr.propertyKey === attrName);
        if (inputDef) {
            componentRef.instance[inputDef.propertyKey] = expr;
        }
    }
}

/**
 * 创建指令绑定工厂
 * @param node 节点
 * @param dirDef 指令定义
 * @param selectors 选择器列表
 * @param attrs 属性列表
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 * @param templateNodes 模板节点列表
 * @param parentNode 父节点引用
 */
export function bindingDirective(node: RNode, dirDef: DirectiveDef, selectors: string[], attrs: RAttr[], renderer: Renderer, delimiter: RegExp, templateNodes?: RNode[], parentNode?: RNode | null) {
    binding(node, (target: RNode, context: any, effect: ReactiveEffect<any>, injector: NodeInjector) => {
        const elementRef = injector.getElementRef(target);
        const templateRef = templateNodes ? createTemplateRef(templateNodes, elementRef, { injector, context }) : undefined;
        if (templateRef) injector.attachTemplate(templateRef);

        const viewContainerRef = injector.getViewContainerRef(target);
        const options: any = { templateRef, elementRef, viewContainerRef };

        // 对于结构指令，确保使用正确的父节点引用
        // 如果 target.parentNode 为空（子节点还未添加），使用编译时捕获的 parentNode
        // 但如果 parentNode 是 AST 节点，需要从 injector 获取正确的渲染时父节点
        let effectiveParent = target.parentNode || parentNode;

        // 尝试从 injector 获取已注册的父节点（渲染时的元素）
        if (!effectiveParent || (parentNode && effectiveParent === parentNode)) {
            const renderedParent = injector.getParentNode?.(target);
            if (renderedParent) {
                effectiveParent = renderedParent;
            }
        }

        if (effectiveParent) {
            injector.setParentNode(target, effectiveParent);
        }

        const directiveRef = (dirDef as Factoriable).ƿfac?.(injector, options);

        if (directiveRef && directiveRef.instance) {
            injector.attachDirective(directiveRef);
            const instance = directiveRef.instance as any;
            
            // Set essential properties first
            if (instance.injector === undefined) {
                instance.injector = injector;
            }
            if (instance.viewContainer === undefined && viewContainerRef) {
                instance.viewContainer = viewContainerRef;
            }
            if (instance.context === undefined) {
                instance.context = context;
            }
            
            // For structural directives, set template before processing attributes
            if (instance.template === undefined && templateRef) {
                instance.template = templateRef;
            }
            
            // Setup if chain for conditional directives
            if (dirDef.dirType === DirectiveType.Conditional && instance instanceof BaseIfDirective) {
                const parentEl = instance instanceof VIfDirective ? effectiveParent : (instance as any).parentNode;
                setupIfChain(instance, parentEl ?? effectiveParent ?? null);
            }

            // Setup switch directive
            // v-switch is not a structural directive - register on the element itself
            if (instance instanceof SwitchDirective) {
                registerSwitchDirective(instance, target);
            }

            // Setup case/default directive - find switch directive in onInit instead of here
            // because switch might not be registered yet due to element traversal order
            if (instance instanceof CaseDirective || instance instanceof DefaultDirective) {
                (instance as any).parentNode = effectiveParent ?? null;
                (instance as any)._switchLookupNode = effectiveParent ?? null;
                // Switch lookup and registration will happen in onInit
            }
            
            // Process directive attributes (this may trigger for/if setters)
            processDirectiveAttributes(directiveRef, dirDef, selectors, attrs, context, effect, injector, delimiter);

            // Initialize directive
            if (instance.onInit) {
                instance.onInit();
            }
        }

        return () => {
            // 清理指令引用
            const directives = target[DIRECTIVES];
            remove(directives, dirDef);
        }
    });
}

/**
 * 处理条件指令组
 * @param el 元素节点
 * @param dirDef 指令定义
 * @param selectors 选择器列表
 * @param attrs 属性列表
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export function processConditionalBinding(el: RNode, dirDef: DirectiveDef, selectors: string[], attrs: RAttr[], renderer: Renderer, delimiter: RegExp): void {
    const container = createContainer(renderer, dirDef.selector);
    container[BINDINGS] = [];

    const parent = renderer.parentNode(el);
    if (parent) {
        renderer.insertBefore(parent, container, el);
        renderer.removeChild(parent, el);
        if (el.childNodes?.length) {
            const childNodes = [...el.childNodes];
            childNodes.forEach(child => {
                if (child.nodeType === 1 || child.nodeType === 32) {
                    renderer.appendChild(container, child);
                }
            });
        }
    }

    selectors.forEach(selector => {
        renderer.removeAttribute(el, selector);
    });

    const templateEl = el as RElement;
    if (templateEl.childNodes?.length) {
        walkNodesForBindings(templateEl.childNodes, renderer, delimiter);
    }

    bindingDirective(container, dirDef, selectors, attrs, renderer, delimiter, [el], parent);
}

/**
 * 处理列表指令
 * @param el 元素节点
 * @param dirDef 指令定义
 * @param selectors 选择器列表
 * @param attrs 属性列表
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export function processIterableBinding(el: RNode, dirDef: DirectiveDef, selectors: string[], attrs: RAttr[], renderer: Renderer, delimiter: RegExp): void {
    const container = createContainer(renderer, dirDef.selector);
    container[BINDINGS] = [];

    const parent = renderer.parentNode(el);
    if (parent) {
        renderer.insertBefore(parent, container, el);
        renderer.removeChild(parent, el);
    }

    selectors.forEach(selector => {
        renderer.removeAttribute(container, selector);
    });

    // Walk child nodes of the template element for bindings
    // This ensures expressions like {{ item.name }} inside v-for templates get their bindings
    const templateEl = el as RElement;
    if (templateEl.childNodes?.length) {
        walkNodesForBindings(templateEl.childNodes, renderer, delimiter);
    }

    bindingDirective(container, dirDef, selectors, attrs, renderer, delimiter, [el], parent);
}

/**
 * 处理指令属性
 * @param directiveRef 指令引用
 * @param directiveDef 指令定义
 * @param selectors 选择器列表
 * @param attrs 属性列表
 * @param context 上下文
 * @param effect 响应式效果
 * @param injector 环境上下文
 * @param delimiter 分隔符正则表达式
 */
export function processDirectiveAttributes(directiveRef: any, directiveDef: DirectiveDef, selectors: string[], attrs: RAttr[], context: any, effect: ReactiveEffect<any>, injector: NodeInjector, delimiter: RegExp): void {
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
                const handler = evaluateExpression(attr.value, context, injector, delimiter);
                if (directiveInstance[propertyKey] instanceof EventEmitter) {
                    replaceOutputSubscription(
                        directiveInstance,
                        `directive:${propertyKey}:${attr.name}`,
                        directiveInstance[propertyKey],
                        handler,
                        injector
                    );
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
                    evaluateIterableExpression(directiveInstance, propertyKey, attr.value, context, effect, injector, delimiter);
                } else {
                    // Capture attr.value in a closure-safe way
                    const attrValue = attr.value;
                    effect.run(() => {
                        const attValue = evaluateExpression(attrValue, context, injector, delimiter);
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
 * @param text 文本内容
 * @param context 上下文
 * @param effect 响应式效果
 * @param matches 匹配结果
 * @param update 更新函数
 * @param injector 环境上下文
 * @param delimiter 分隔符正则表达式
 */
export function evaluateDelimiterExpression(text: string, context: any, effect: ReactiveEffect<any>, matches: RegExpExecArray[], update: (text: string) => void, injector: NodeInjector, delimiter: RegExp): void {
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
                segment.value = evaluateExpression(segment.expr, context, injector, delimiter);
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
 * @param expr 表达式
 * @param context 上下文
 * @param injector 环境上下文
 * @param delimiter 分隔符正则表达式
 * @returns 评估结果
 */
export function evaluateExpression(expr: string, context: any, injector: NodeInjector, delimiter: RegExp): any {
    try {
        const parts = splitTopLevel(expr, '|').map(part => part.trim()).filter(Boolean);
        if (parts.length <= 1) {
            return new Function('ctx', `with(ctx){return ${expr}}`)(context);
        } else {
            const [expression, ...pipeNames] = parsePipes(parts);
            const pipes = pipeNames.reduce((obj, name) => {
                obj[name] = injector.get(name);
                return obj;
            }, {} as any);
            return new Function('ctx', 'pipes', `with(ctx){return ${expression}}`)(context, pipes);
        }
    } catch (e) {
        console.error(`Error evaluating expression: ${expr}`, e);
        return '';
    }
}

const funcCallRegex = /^\s*([_$a-zA-Z\w.]+)\s*\(\s*(.*?)\s*\)\s*$/;
/**
 * 使用环境上下文解析事件表达式
 * @param expr 表达式
 * @param context 上下文
 * @param effect 响应式效果
 * @param injector 环境上下文
 * @param delimiter 分隔符正则表达式
 * @returns 事件监听器
 */
export function parseEventExpression(expr: string, context: any, effect: ReactiveEffect, injector: NodeInjector, delimiter: RegExp): EventListener {
    const match = expr.match(funcCallRegex);

    if (!match) {
        const propPath = expr.trim().split('.');
        return effect.run(() => {
            const resolved = resolvePath(context, propPath);
            const handler = resolved.value;
            return handler.bind(resolved.owner ?? context);
        });
    }

    const [, funcPath, argsStr] = match;
    const funcParts = funcPath.split('.');
    const args = parseArguments(argsStr, context, injector, delimiter);

    return effect.run(() => {
        const resolved = resolvePath(context, funcParts);
        const func = resolved.value;
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
            return func.apply(resolved.owner ?? context, resolvedArgs);
        };
    });
}

function resolvePath(context: any, path: string[]): { owner: any; value: any } {
    let owner = context;
    let value = context;

    for (let index = 0; index < path.length; index++) {
        const prop = path[index];
        if (value == null) {
            return { owner: value, value: undefined };
        }

        if (index === path.length - 1) {
            const resolvedOwner = Object.prototype.hasOwnProperty.call(value, prop)
                ? value
                : resolveScopeContext(value, prop) ?? (prop in Object(value) ? value : resolvePropertyOwner(value, prop) ?? value);
            return { owner: resolvedOwner, value: resolvedOwner?.[prop] };
        }

        value = value[prop];
        owner = value;
    }

    return { owner, value };
}

function resolvePropertyOwner(target: any, prop: string): any {
    let current = target;
    while (current != null) {
        if (Object.prototype.hasOwnProperty.call(current, prop)) {
            return current;
        }
        current = Object.getPrototypeOf(current);
    }
    return null;
}

function resolveScopeContext(target: any, prop: string): any {
    let current = target?.[TEMPLATE_SCOPE_PARENT];
    while (current != null) {
        if (prop in Object(current)) {
            return current;
        }
        current = current?.[TEMPLATE_SCOPE_PARENT];
    }
    return null;
}

/**
 * 创建容器元素
 * @param renderer 渲染器
 * @param text 文本内容
 * @returns 容器元素
 */
export function createContainer(renderer: Renderer, text?: string): RElement {
     const container = renderer.createElement('v-container');
     try {
         container.nodeType = NodeType.ElementContainer;
     } catch {
         // Real DOM nodes have read-only nodeType, skip
     }
     return container;
 }

const vueForRegex = /^\s*((?:\([^)]+\)|[^)])+)\s+(?:in|of)\s+([^]+)$/;
const angularForRegex = /^\s*let\s+([^ ]+)\s+(?:of|in)\s+([^]+)(?:\s*;\s*([^ ]+)\s+as\s+([^ ]+))?$/;
/**
 * 评估列表指令表达式
 * @param directiveInstance 指令实例
 * @param propertyKey 属性键
 * @param expr 表达式
 * @param context 上下文
 * @param effect 响应式效果
 * @param injector 环境上下文
 * @param delimiter 分隔符正则表达式
 */
function evaluateIterableExpression(directiveInstance: any, propertyKey: string, expr: string, context: any, effect: ReactiveEffect, injector: NodeInjector, delimiter: RegExp): any {
    // 1. Vue风格: item in items
    const vueStyle = expr.match(vueForRegex);
    let itemNames: string[];
    let collectionExpr: string;
    if (vueStyle) {
        collectionExpr = vueStyle[2].trim();
        itemNames = processVueStyleExpression(vueStyle[1]);
        return bindIterableExpression(directiveInstance, propertyKey, itemNames, collectionExpr, context, effect, injector, delimiter);
    }

    // 2. Angular风格: let item of items
    const angularStyle = expr.match(angularForRegex);
    if (angularStyle) {
        collectionExpr = angularStyle[2].trim();
        itemNames = [angularStyle[1].trim()];
        if (angularStyle[3] && angularStyle[4]) {
            itemNames.push(angularStyle[4].trim())
        }
        return bindIterableExpression(directiveInstance, propertyKey, itemNames, collectionExpr, context, effect, injector, delimiter);
    }
}

/**
 * 绑定列表指令表达式
 * @param directiveInstance 指令实例
 * @param propertyKey 属性键
 * @param itemNames 项目名称列表
 * @param collectionExpr 集合表达式
 * @param context 上下文
 * @param effect 响应式效果
 * @param injector 环境上下文
 * @param delimiter 分隔符正则表达式
 */
function bindIterableExpression(directiveInstance: any, propertyKey: string, itemNames: string[], collectionExpr: string, context: any, effect: ReactiveEffect, injector: NodeInjector, delimiter: RegExp) {
    // 设置v-for指令期望的属性（而不是collection）
    effect.untrack(() => {
        directiveInstance.itemNames = itemNames; // 主循环变量（如item）
    });
    // 设置v-for指令期望的属性
    effect.run(() => {
        const collection = evaluateExpression(collectionExpr, context, injector, delimiter);
        effect.untrack(() => {
            directiveInstance[propertyKey] = collection;     // 集合数据
        });
    });
}

const vueInerMatch = /^\(\s*([^,]+)\s*(?:,\s*([^)]+))?\s*\)$/;
/**
 * Vue风格表达式处理
 * @param itemPart 项目部分
 * @returns 项目名称列表
 */
function processVueStyleExpression(itemPart: string): string[] {
    let names: string[];
    if (itemPart.trim().startsWith('(')) {
        // 处理格式如 (item, index) 的情况
        const innerMatch = itemPart.trim().match(vueInerMatch);
        if (innerMatch) {
            names = [innerMatch[1].trim(), innerMatch[2]?.trim() || ''].filter(Boolean);
        } else {
            throw new Exception('iterable expression invaild.');
        }
    } else {
        // 处理格式如 item 的情况
        names = [itemPart.trim()];
    }
    return names;
}

/**
 * 解析管道表达式转换为函数调用
 * @param parts 部分列表
 * @returns 解析结果
 */
function parsePipes(parts: string[]): string[] {
    let result = parts[0];
    const results: string[] = [];
    for (let i = 1; i < parts.length; i++) {
        const pipePart = parts[i];
        const [pipeName, ...params] = splitTopLevel(pipePart, ':').map(p => p.trim()).filter(Boolean);
        if (!pipeName) continue;
        results.push(pipeName)
        result = `pipes['${pipeName}'].transform(${result}${params.length ? ', ' + params.join(', ') : ''})`;
    }
    results.unshift(result);
    return results;
}

/**
 * 解析参数列表，支持字符串、数字、布尔值和变量引用
 * @param argsStr 参数字符串
 * @param context 上下文
 * @param injector 环境上下文
 * @param delimiter 分隔符正则表达式
 * @returns 参数列表
 */
function parseArguments(argsStr: string, context: any, injector: NodeInjector, delimiter: RegExp): any[] {
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
            args.push(evaluateArg(currentArg.trim(), context, injector, delimiter));
            currentArg = '';
        } else if (char === '"' || char === '\'') {
            quoteChar = char;
            currentArg += char;
        } else {
            currentArg += char;
        }
    }

    if (currentArg.trim()) {
        args.push(evaluateArg(currentArg.trim(), context, injector, delimiter));
    }

    return args;
}

/**
 * 计算参数值 (字符串/数字/布尔值/变量引用)
 * @param arg 参数
 * @param context 上下文
 * @param injector 环境上下文
 * @param delimiter 分隔符正则表达式
 * @returns 参数值
 */
function evaluateArg(arg: string, context: any, injector: NodeInjector, delimiter: RegExp): any {
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
    return evaluateExpression(arg, context, injector, delimiter);
}

function splitTopLevel(input: string, separator: '|' | ':'): string[] {
    const parts: string[] = [];
    let current = '';
    let quoteChar: string | null = null;
    let escapeNext = false;
    let parenDepth = 0;
    let braceDepth = 0;
    let bracketDepth = 0;

    for (let index = 0; index < input.length; index++) {
        const char = input[index];
        const prev = input[index - 1];
        const next = input[index + 1];

        if (escapeNext) {
            current += char;
            escapeNext = false;
            continue;
        }

        if (quoteChar) {
            current += char;
            if (char === '\\') {
                escapeNext = true;
            } else if (char === quoteChar) {
                quoteChar = null;
            }
            continue;
        }

        if (char === '"' || char === '\'') {
            quoteChar = char;
            current += char;
            continue;
        }

        if (char === '(') {
            parenDepth++;
            current += char;
            continue;
        }
        if (char === ')') {
            parenDepth--;
            current += char;
            continue;
        }
        if (char === '{') {
            braceDepth++;
            current += char;
            continue;
        }
        if (char === '}') {
            braceDepth--;
            current += char;
            continue;
        }
        if (char === '[') {
            bracketDepth++;
            current += char;
            continue;
        }
        if (char === ']') {
            bracketDepth--;
            current += char;
            continue;
        }

        const isTopLevel = parenDepth === 0 && braceDepth === 0 && bracketDepth === 0;
        const isPipeSeparator = separator === '|'
            && char === '|'
            && prev !== '|'
            && next !== '|';
        const isColonSeparator = separator === ':' && char === ':';

        if (isTopLevel && (isPipeSeparator || isColonSeparator)) {
            parts.push(current);
            current = '';
            continue;
        }

        current += char;
    }

    parts.push(current);
    return parts;
}

// 保留文件末尾的辅助函数
const attrPrefixes = [':', '@', '*', 'v-'];

/**
 * 转换为匹配名称列表
 * @param attrName 属性名
 * @returns 匹配名称列表
 */
export function toMatchNames(attrName: string): string[] {
    const names: string[] = [];
    const kebabName = camelToKebab(attrName);
    if (kebabName !== attrName) {
        names.push(kebabName);
    }
    for (const prefix of attrPrefixes) {
        names.push(prefix + attrName);
        names.push(prefix + kebabName);
    }
    return names;
}

const kebabMach = /([a-z0-9])([A-Z])/g;

/**
 * 驼峰命名转换为短横线命名
 * @param str 字符串
 * @returns 转换后的字符串
 */
export function camelToKebab(str: string): string {
    return str.replace(kebabMach, '$1-$2').toLowerCase();
}
