import { Exception, isString, remove } from '@tsdi/ioc';
import { CompilerOptions } from '../template/compiler';
import { DIRECTIVES, BINDINGS, NodeType, RAttr, RElement, RNode, RText, COMPONENTDEF } from '../renderer/Node';
import { ComponentDef } from '../refs/component';
import { DirectiveDef, DirectiveType, Factoriable } from '../refs/directive';
import { EnvironmentContext } from '../refs/environment';
import { Renderer } from '../renderer/Renderer';
import { Bindings, NodeFactory } from '../refs/template';
import { ReactiveEffect } from '../effect';
import { reactive } from '../reactive';
import { EventEmitter } from '../EventEmitter';
import { createTemplateRef } from './template';


export type Rendering<T extends RNode> = (renderer: Renderer, effect: ReactiveEffect, environment: EnvironmentContext, context: any) => T | null;

export interface RendererOptions {
    templateTag?: string;
    delimiter: RegExp;
    textFactory: (node: RText, options: CompilerOptions) => Rendering<RText>;
    elementFactory: (node: RElement, renderer: Renderer, options: CompilerOptions, rendererOptions: RendererOptions) => Rendering<RElement>;
    attributeFactory: (attr: RAttr) => (element: RElement, renderer: Renderer) => void;
    componentFactory: (node: RElement, renderer: Renderer, componentDef: ComponentDef, attrs: RAttr[], bindings: any[]) => Rendering<RElement>,
    templateFactory: (node: RElement, renderer: Renderer, attrs: RAttr[], bindings: any[], options: CompilerOptions, rendererOptions: RendererOptions) => Rendering<RElement>,
    bindDirective: (element: RElement, directive: DirectiveDef, attrs: RAttr[], effect: ReactiveEffect, environment: EnvironmentContext, context: any, delimiter: RegExp) => void,
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
    return (renderer: Renderer, environment: EnvironmentContext, context: C, effect: ReactiveEffect) => {
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

    // 编译子节点
    const childFactories: Array<(renderer: Renderer, effect: ReactiveEffect, environment: EnvironmentContext, context: any) => RNode | null> = [];
    if (node.childNodes) {
        for (const child of node.childNodes) {
            const childFactory = compileNodeToFactory(child, renderer, options, rendererOptions);
            childFactories.push(childFactory);
        }
    }

    // 编译属性
    const compiledAttrs = attrs.map(attr => rendererOptions.attributeFactory(attr));

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
            rendererOptions.bindDirective(element, dirDef, attrs, effect, environment, context, rendererOptions.delimiter);
        });

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
): (renderer: Renderer, effect: ReactiveEffect, environment: EnvironmentContext) => RElement | null {
    const compiledAttrs = attrs.map(attr => compileAttributeToFactory(attr));

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
): (renderer: Renderer, effect: ReactiveEffect, environment: EnvironmentContext, context: any) => RElement | null {
    const compiledAttrs = attrs.map(attr => compileAttributeToFactory(attr));
    const childNodes = node.childNodes || [];
    const childFactories: Array<(renderer: Renderer, effect: ReactiveEffect, environment: EnvironmentContext, context: any) => RNode | null> = [];

    // 编译子节点
    for (const child of childNodes) {
        const childFactory = compileNodeToFactory(child, renderer, options, rendererOptions);
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
 * @param context 上下文
 * @param processDirectiveAttributes 指令属性处理函数
 */
export function applyDirectiveToElement(
    element: RElement,
    directive: DirectiveDef,
    attrs: RAttr[],
    effect: ReactiveEffect,
    environment: EnvironmentContext,
    context: any,
    delimiter: RegExp
): void {
    const elementRef = environment.getElementRef(element);
    const directiveRef = (directive as Factoriable).ƿfac?.(environment, { elementRef, context });

    if (!directiveRef) return;

    // 附加指令到环境
    environment.attachDirective(directiveRef);

    // 处理指令属性
    processDirectiveAttributes(directiveRef, directive, [], attrs, context, effect, environment, delimiter);

    // 初始化指令
    if (directiveRef.instance.onInit) {
        directiveRef.instance.onInit();
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
    nodesForBindings: ((nodes: RNode[], renderer: Renderer, delimiter: RegExp) => void) = walkNodesForBindings<C>
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
    const matches = expr.matchAll(delimiter);
    if (!matches) return null;
    return Array.from(matches);
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

    binding(node, (target: RNode, context: any, effect, environment: EnvironmentContext) => {
        const textNode = target as RText;
        evaluateDelimiterExpression(expr, context, effect, matches, (updatedText) => {
            textNode.textContent = updatedText;
        }, environment, delimiter);

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
    binding(element, (target: RNode, context: any, effect: ReactiveEffect<any>, environment: EnvironmentContext) => {
        if (environment.destroyed) return;
        const el = target as RElement;
        const elementRef = environment.getElementRef(el);
        let ctx: any;

        if (el.hasAttribute(':templateOutletContext')) {
            ctx = reactive({}, effect);
            const expr = el.getAttribute(':templateOutletContext')!;
            effect.run(() => {
                const value = evaluateExpression(expr, context, environment, delimiter);
                Object.assign(ctx, value);
            })
        } else {
            const attrs = renderer.getAttributes(el);
            const vals = attrs.filter(r => r.name.startsWith(':')).map(r => [r.name.slice(1), r.value]);

            if (vals.length) {
                ctx = reactive({}, effect);
                effect.run(() => {
                    vals.forEach(([name, expr]) => {
                        const value = evaluateExpression(expr, context, environment, delimiter);
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

    // 创建属性绑定工厂
    bindingAtrrbutes(element, attrs, renderer, delimiter);

    // 递归处理子节点
    if (element.childNodes.length > 0) {
        walkNodesForBindings(element.childNodes, renderer, delimiter);
    }

    // 处理组件和指令
    const componentDef = element[COMPONENTDEF];
    if (componentDef) {
        bindingComponentFactory(element, componentDef, attrs, renderer, delimiter);
    }

    const dirs = element[DIRECTIVES];
    if (dirs && dirs.length) {
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
        } else if (delimiter.test(value)) {
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

    binding(element, (target, context, effect, environment) => {
        const el = target as RElement;
        const handler = parseEventExpression(expr, context, effect, environment, delimiter);
        el.addEventListener(eventName, handler);

        return () => {
            el.setAttribute(attrName, expr);
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
    binding(element, (target: RNode, context: any, effect: ReactiveEffect<any>, environment: EnvironmentContext) => {
        const el = target as RElement;
        if (!el.setProperty) return;
        effect.run(() => {
            const attValue = evaluateExpression(expr, context, environment, delimiter);
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

    binding(element, (target: RNode, context: any, effect: ReactiveEffect<any>, environment: EnvironmentContext) => {
        const el = target as RElement;
        evaluateDelimiterExpression(expr, context, effect, matches, (updatedText) => {
            el.setAttribute(attrName, updatedText);
        }, environment, delimiter);

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
    binding(element, (target: RNode, context: any, effect: ReactiveEffect<any>, environment: EnvironmentContext) => {
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
 * @param element 元素节点
 * @param componentDef 组件定义
 * @param attrs 属性列表
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export function bindingComponentFactory(element: RElement, componentDef: ComponentDef, attrs: RAttr[], renderer: Renderer, delimiter: RegExp): void {
    binding(element, (target: RNode, context: any, effect: ReactiveEffect<any>, environment: EnvironmentContext) => {
        if (environment.destroyed) return;
        const el = target as RElement;
        const elementRef = environment.getElementRef(el);
        const componentRef = (componentDef as Factoriable).ƿfac?.(environment, { elementRef });

        if (componentRef) {
            environment.attachComponent(componentRef);

            // 处理组件属性绑定
            attrs.forEach(({ name, value }) => {
                processComponentAttribute(componentRef, name, value, context, effect, environment, delimiter);
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
            processConditionalBinding(element, directiveDef, selectors, attrs, renderer, delimiter);
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
 * @param environment 环境上下文
 * @param delimiter 分隔符正则表达式
 */
export function processComponentAttribute(componentRef: any, attrName: string, expr: string, context: any, effect: ReactiveEffect<any>, environment: EnvironmentContext, delimiter: RegExp): void {
    const attributes = componentRef.def?.attributes || [];

    if (attrName.startsWith('@')) {
        const eventName = attrName.substring(1);
        const inputDef = attributes.find((attr: any) => attr.alias === eventName || attr.propertyKey === eventName);
        if (inputDef) {
            effect.run(() => {
                const handler = evaluateExpression(expr, context, environment, delimiter);
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

/**
 * 创建指令绑定工厂
 * @param node 节点
 * @param dirDef 指令定义
 * @param selectors 选择器列表
 * @param attrs 属性列表
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 * @param templateNodes 模板节点列表
 */
export function bindingDirective(node: RNode, dirDef: DirectiveDef, selectors: string[], attrs: RAttr[], renderer: Renderer, delimiter: RegExp, templateNodes?: RNode[]) {
    binding(node, (target: RNode, context: any, effect: ReactiveEffect<any>, environment: EnvironmentContext) => {
        // if (environment.destroyed) return;               
        const elementRef = environment.getElementRef(target);
        // 处理条件指令;
        const templateRef = templateNodes ? createTemplateRef(templateNodes, elementRef, { environment }) : undefined;
        if (templateRef) environment.attachTemplate(templateRef);
        const directiveRef = (dirDef as Factoriable).ƿfac?.(environment, { templateRef, elementRef });

        if (directiveRef) {
            environment.attachDirective(directiveRef);
            // 处理指令属性
            processDirectiveAttributes(directiveRef, dirDef, selectors, attrs, context, effect, environment, delimiter);

            if (directiveRef.instance.onInit) {
                directiveRef.instance.onInit();
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
        parent.replaceChild(el, container);
    }

    attrs.forEach(attr => {
        renderer.setAttribute(container, attr.name, attr.value)
    });
    dirDef.attributes?.forEach(attrDef => {
        renderer.removeAttribute(container, attrDef.alias ?? attrDef.propertyKey);
    });

    selectors.forEach(selector => {
        renderer.removeAttribute(el, selector);
    });

    bindingDirective(container, dirDef, selectors, attrs, renderer, delimiter, [el])
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

    attrs.forEach(attr => {
        renderer.setAttribute(container, attr.name, attr.value)
    });
    dirDef.attributes?.forEach(attrDef => {
        renderer.removeAttribute(container, attrDef.alias ?? attrDef.propertyKey);
    });

    selectors.forEach(selector => {
        renderer.removeAttribute(container, selector);
    });

    bindingDirective(container, dirDef, selectors, attrs, renderer, delimiter, [el])
}

/**
 * 处理指令属性
 * @param directiveRef 指令引用
 * @param directiveDef 指令定义
 * @param selectors 选择器列表
 * @param attrs 属性列表
 * @param context 上下文
 * @param effect 响应式效果
 * @param environment 环境上下文
 * @param delimiter 分隔符正则表达式
 */
export function processDirectiveAttributes(directiveRef: any, directiveDef: DirectiveDef, selectors: string[], attrs: RAttr[], context: any, effect: ReactiveEffect<any>, environment: EnvironmentContext, delimiter: RegExp): void {
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
                const handler = evaluateExpression(attr.value, context, environment, delimiter);
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
                    evaluateIterableExpression(directiveInstance, propertyKey, attr.value, context, effect, environment, delimiter);
                } else {
                    effect.run(() => {
                        const attValue = evaluateExpression(attr.value, context, environment, delimiter);
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
 * @param environment 环境上下文
 * @param delimiter 分隔符正则表达式
 */
export function evaluateDelimiterExpression(text: string, context: any, effect: ReactiveEffect<any>, matches: RegExpExecArray[], update: (text: string) => void, environment: EnvironmentContext, delimiter: RegExp): void {
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
                segment.value = evaluateExpression(segment.expr, context, environment, delimiter);
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
 * @param environment 环境上下文
 * @param delimiter 分隔符正则表达式
 * @returns 评估结果
 */
export function evaluateExpression(expr: string, context: any, environment: EnvironmentContext, delimiter: RegExp): any {
    try {
        const parts = expr.split('|').map(part => part.trim());
        if (parts.length <= 1) {
            return new Function('ctx', `with(ctx){return ${expr}}`)(context);
        } else {
            const [expression, ...pipeNames] = parsePipes(parts);
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

const funcCallRegex = /^\s*([_$a-zA-Z\w.]+)\s*\(\s*(.*?)\s*\)\s*$/;
/**
 * 使用环境上下文解析事件表达式
 * @param expr 表达式
 * @param context 上下文
 * @param effect 响应式效果
 * @param environment 环境上下文
 * @param delimiter 分隔符正则表达式
 * @returns 事件监听器
 */
export function parseEventExpression(expr: string, context: any, effect: ReactiveEffect, environment: EnvironmentContext, delimiter: RegExp): EventListener {
    const match = expr.match(funcCallRegex);

    if (!match) {
        const propPath = expr.trim().split('.');
        return effect.run(() => {
            const handler = propPath.reduce((obj, prop) => obj && obj[prop], context);
            return handler.bind(context);
        });
    }

    const [, funcPath, argsStr] = match;
    const args = parseArguments(argsStr, context, environment, delimiter);

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

/**
 * 创建容器元素
 * @param renderer 渲染器
 * @param text 文本内容
 * @returns 容器元素
 */
export function createContainer(renderer: Renderer, text?: string): RElement {
    const container = renderer.createElement('v-container');
    container.nodeType = NodeType.ElementContainer;
    // if (text) container.textContent = text;
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
 * @param environment 环境上下文
 * @param delimiter 分隔符正则表达式
 */
function evaluateIterableExpression(directiveInstance: any, propertyKey: string, expr: string, context: any, effect: ReactiveEffect, environment: EnvironmentContext, delimiter: RegExp): any {
    // 1. Vue风格: item in items
    const vueStyle = expr.match(vueForRegex);
    let itemNames: string[];
    let collectionExpr: string;
    if (vueStyle) {
        collectionExpr = vueStyle[2].trim();
        itemNames = processVueStyleExpression(vueStyle[1]);
        return bindIterableExpression(directiveInstance, propertyKey, itemNames, collectionExpr, context, effect, environment, delimiter);
    }

    // 2. Angular风格: let item of items
    const angularStyle = expr.match(angularForRegex);
    if (angularStyle) {
        collectionExpr = angularStyle[2].trim();
        itemNames = [angularStyle[1].trim()];
        if (angularStyle[3] && angularStyle[4]) {
            itemNames.push(angularStyle[4].trim())
        }
        return bindIterableExpression(directiveInstance, propertyKey, itemNames, collectionExpr, context, effect, environment, delimiter);
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
 * @param environment 环境上下文
 * @param delimiter 分隔符正则表达式
 */
function bindIterableExpression(directiveInstance: any, propertyKey: string, itemNames: string[], collectionExpr: string, context: any, effect: ReactiveEffect, environment: EnvironmentContext, delimiter: RegExp) {
    // 设置v-for指令期望的属性（而不是collection）
    directiveInstance.itemNames = itemNames; // 主循环变量（如item）
    // 设置v-for指令期望的属性
    effect.run(() => {
        const collection = evaluateExpression(collectionExpr, context, environment, delimiter);
        directiveInstance[propertyKey] = collection;     // 集合数据
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
        }
        throw new Exception('iterable expression invaild.')
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
        const [pipeName, ...params] = pipePart.split(':').map(p => p.trim());
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
 * @param environment 环境上下文
 * @param delimiter 分隔符正则表达式
 * @returns 参数列表
 */
function parseArguments(argsStr: string, context: any, environment: EnvironmentContext, delimiter: RegExp): any[] {
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
            args.push(evaluateArg(currentArg.trim(), context, environment, delimiter));
            currentArg = '';
        } else if (char === '"' || char === '\'') {
            quoteChar = char;
            currentArg += char;
        } else {
            currentArg += char;
        }
    }

    if (currentArg.trim()) {
        args.push(evaluateArg(currentArg.trim(), context, environment, delimiter));
    }

    return args;
}

/**
 * 计算参数值 (字符串/数字/布尔值/变量引用)
 * @param arg 参数
 * @param context 上下文
 * @param environment 环境上下文
 * @param delimiter 分隔符正则表达式
 * @returns 参数值
 */
function evaluateArg(arg: string, context: any, environment: EnvironmentContext, delimiter: RegExp): any {
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
    return evaluateExpression(arg, context, environment, delimiter);
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
