"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileToFactory = compileToFactory;
exports.compileTextToFactory = compileTextToFactory;
exports.compileElementToFactory = compileElementToFactory;
exports.compileAttributeToFactory = compileAttributeToFactory;
exports.compileComponentToFactory = compileComponentToFactory;
exports.compileTemplateToFactory = compileTemplateToFactory;
exports.applyDirectiveToElement = applyDirectiveToElement;
exports.walkNodesForBindings = walkNodesForBindings;
exports.generateNodeBindings = generateNodeBindings;
exports.binding = binding;
exports.matchDelimiter = matchDelimiter;
exports.bindingText = bindingText;
exports.bindingTemplate = bindingTemplate;
exports.bindingElement = bindingElement;
exports.bindingAtrrbutes = bindingAtrrbutes;
exports.bindingEvent = bindingEvent;
exports.bindingProperty = bindingProperty;
exports.bindingInterpolationFactory = bindingInterpolationFactory;
exports.createModelBindingFactory = createModelBindingFactory;
exports.bindingComponentFactory = bindingComponentFactory;
exports.bindingDirectiveFactory = bindingDirectiveFactory;
exports.processComponentAttribute = processComponentAttribute;
exports.bindingDirective = bindingDirective;
exports.processConditionalBinding = processConditionalBinding;
exports.processIterableBinding = processIterableBinding;
exports.processDirectiveAttributes = processDirectiveAttributes;
exports.evaluateDelimiterExpression = evaluateDelimiterExpression;
exports.evaluateExpression = evaluateExpression;
exports.parseEventExpression = parseEventExpression;
exports.createContainer = createContainer;
exports.toMatchNames = toMatchNames;
exports.camelToKebab = camelToKebab;
const ioc_1 = require("@tsdi/ioc");
const Node_1 = require("../renderer/Node");
const directive_1 = require("../refs/directive");
const reactive_1 = require("../reactive");
const EventEmitter_1 = require("../EventEmitter");
const template_1 = require("./template");
const if_dir_1 = require("../directives/if.dir");
const switch_case_dir_1 = require("../directives/switch-case.dir");
/**
 * 将模板节点编译为 factory function
 * @param nodes 模板节点
 * @param options 编译选项
 * @param compileNodeToFactory 节点编译函数
 * @returns factory function
 */
function compileToFactory(nodes, renderer, options, rendererOptions) {
    // 编译节点为创建函数
    const compiledNodes = nodes.map(node => compileNodeToFactory(node, renderer, options, rendererOptions));
    // 返回工厂函数
    return (renderer, injector, context, effect) => {
        // 执行编译好的节点创建函数
        const rootNodes = [];
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
function compileTextToFactory(node) {
    const text = node.textContent || '';
    const bindings = node[Node_1.BINDINGS] || [];
    // 如果没有绑定，直接返回静态文本节点创建函数
    if (!bindings.length) {
        return (renderer) => {
            return renderer.createText(text);
        };
    }
    // 有绑定的文本节点，返回包含绑定逻辑的工厂函数
    return (renderer, effect, injector, context) => {
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
function compileElementToFactory(node, renderer, options, rendererOptions) {
    const tagName = node.tagName;
    const attrs = renderer.getAttributes(node);
    const bindings = node[Node_1.BINDINGS] || [];
    const directives = node[Node_1.DIRECTIVES] || [];
    // 检查是否是组件
    const componentDef = node[Node_1.COMPONENTDEF];
    if (componentDef) {
        return rendererOptions.componentFactory(node, renderer, componentDef, attrs, bindings);
    }
    // 检查是否是模板标签
    if (tagName === rendererOptions.templateTag) {
        return rendererOptions.templateFactory(node, renderer, attrs, bindings, options, rendererOptions);
    }
    // 检查是否有结构指令（v-for, v-if等）
    const hasStructuralDirective = directives.some(d => d.dirType === directive_1.DirectiveType.Iterable || d.dirType === directive_1.DirectiveType.Conditional);
    // 编译子节点（如果没有结构指令）
    const childFactories = [];
    if (node.childNodes && !hasStructuralDirective) {
        for (const child of node.childNodes) {
            const childFactory = compileNodeToFactory(child, renderer, options, rendererOptions);
            childFactories.push(childFactory);
        }
    }
    // 编译属性
    const compiledAttrs = attrs.map(attr => rendererOptions.attributeFactory(attr));
    // 返回元素工厂函数
    return (renderer, effect, injector, context) => {
        // 创建元素
        const element = renderer.createElement(tagName);
        // Copy nodeType from original node to preserve ElementContainer flag (only for virtual DOM)
        try {
            element.nodeType = node.nodeType;
        }
        catch {
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
function compileNodeToFactory(node, renderer, options, rendererOptions) {
    if (node.nodeType === Node_1.NodeType.Text || node.nodeType === Node_1.NodeType.Comment) {
        return rendererOptions.textFactory(node, options);
    }
    else {
        return rendererOptions.elementFactory(node, renderer, options, rendererOptions);
    }
}
/**
 * 编译属性为应用函数
 * @param attr 属性
 * @returns 属性应用函数
 */
function compileAttributeToFactory(attr) {
    const { name, value, namespace } = attr;
    // 静态属性直接返回设置函数
    return (element, renderer) => {
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
function compileComponentToFactory(node, renderer, componentDef, attrs, bindings) {
    const compiledAttrs = attrs.map(attr => compileAttributeToFactory(attr));
    return (renderer, effect, injector) => {
        // 创建元素
        const element = renderer.createElement(node.tagName);
        // 应用属性
        compiledAttrs.forEach(applyAttr => {
            applyAttr(element, renderer);
        });
        // 创建组件实例
        const elementRef = injector.getElementRef(element);
        const componentRef = componentDef.ƿfac?.(injector, { elementRef });
        if (!componentRef)
            return element;
        // 处理静态属性
        attrs.forEach(({ name, value }) => {
            if (!name.startsWith('@') && !name.startsWith(':') && !name.startsWith('[') && !name.startsWith('v-')) {
                const inputDef = (componentRef.def?.attributes || []).find((attr) => attr.alias === name || attr.propertyKey === name);
                if (inputDef) {
                    componentRef.instance[inputDef.propertyKey] = value;
                }
            }
        });
        // 应用绑定
        bindings.forEach(binding => {
            const unbinding = binding(element, null, effect, injector);
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
function compileTemplateToFactory(node, renderer, attrs, bindings, options, rendererOptions) {
    const compiledAttrs = attrs.map(attr => compileAttributeToFactory(attr));
    const childNodes = node.childNodes || [];
    const childFactories = [];
    // 编译子节点
    for (const child of childNodes) {
        const childFactory = compileNodeToFactory(child, renderer, options, rendererOptions);
        childFactories.push(childFactory);
    }
    return (renderer, effect, injector, context) => {
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
function applyDirectiveToElement(element, directive, attrs, effect, injector, context, delimiter) {
    const elementRef = injector.getElementRef(element);
    const directiveRef = directive.ƿfac?.(injector, { elementRef, context });
    if (!directiveRef)
        return;
    // 附加指令到环境
    injector.attachDirective(directiveRef);
    const instance = directiveRef.instance;
    // 注册 SwitchDirective 到 switchChains
    if (instance instanceof switch_case_dir_1.SwitchDirective) {
        (0, switch_case_dir_1.registerSwitchDirective)(instance, element);
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
function walkNodesForBindings(nodes, renderer, delimiter) {
    for (const node of nodes) {
        node[Node_1.BINDINGS] = [];
        if (node.nodeType === Node_1.NodeType.Text || node.nodeType === Node_1.NodeType.Comment) {
            // 创建文本节点的绑定工厂
            bindingText(node, node.textContent, renderer, delimiter);
        }
        else {
            // 创建元素节点的绑定工厂
            bindingElement(node, renderer, delimiter);
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
function generateNodeBindings(nodes, directives, components, renderer, delimiter, nodesForBindings = (walkNodesForBindings), customElements = []) {
    const rootNodes = nodes;
    // 收集组件和指令
    components.forEach(cdef => {
        const nodes = renderer.querySelectorAll(rootNodes, cdef.selector);
        nodes?.forEach(n => {
            if (n[Node_1.COMPONENTDEF]) {
                throw new ioc_1.Exception('has dup component selector');
            }
            n[Node_1.COMPONENTDEF] = cdef;
        });
    });
    directives.forEach(r => {
        const nodes = renderer.querySelectorAll(rootNodes, r.selector);
        nodes?.forEach(n => {
            if (n[Node_1.COMPONENTDEF]?.type === r.type) {
                return;
            }
            const dirs = n[Node_1.DIRECTIVES];
            if (dirs) {
                dirs.push(r);
            }
            else {
                n[Node_1.DIRECTIVES] = [r];
            }
        });
    });
    // 收集自定义元素指令
    customElements.forEach(cdef => {
        const nodes = renderer.querySelectorAll(rootNodes, cdef.selector);
        nodes?.forEach(n => {
            if (n[Node_1.COMPONENTDEF]?.type === cdef.type) {
                return;
            }
            const custs = n[Node_1.CUSTOM_ELEMENTS];
            if (custs) {
                custs.push(cdef);
            }
            else {
                n[Node_1.CUSTOM_ELEMENTS] = [cdef];
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
function binding(node, factory) {
    node[Node_1.BINDINGS]?.push(factory);
}
/**
 * 匹配分隔符表达式
 * @param expr 表达式字符串
 * @param delimiter 分隔符正则表达式
 * @returns 匹配结果数组
 */
function matchDelimiter(expr, delimiter) {
    const matches = expr.matchAll(delimiter);
    if (!matches)
        return null;
    return Array.from(matches);
}
/**
 * 创建文本节点的绑定工厂
 * @param node 文本节点
 * @param expr 表达式
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
function bindingText(node, expr, renderer, delimiter) {
    if (!expr) {
        return;
    }
    const matches = matchDelimiter(expr, delimiter);
    if (!matches?.length)
        return;
    binding(node, (target, context, effect, injector) => {
        const textNode = target;
        evaluateDelimiterExpression(expr, context, effect, matches, (updatedText) => {
            textNode.textContent = updatedText;
        }, injector, delimiter);
        return () => {
            textNode.textContent = expr;
        };
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
function bindingTemplate(element, renderer, delimiter) {
    const childNodes = element.childNodes;
    element.childNodes = [];
    binding(element, (target, context, effect, injector) => {
        if (injector.destroyed)
            return;
        const el = target;
        const elementRef = injector.getElementRef(el);
        let ctx;
        if (el.hasAttribute(':templateOutletContext')) {
            ctx = (0, reactive_1.reactive)({}, effect);
            const expr = el.getAttribute(':templateOutletContext');
            effect.run(() => {
                const value = evaluateExpression(expr, context, injector, delimiter);
                Object.assign(ctx, value);
            });
        }
        else {
            const attrs = renderer.getAttributes(el);
            const vals = attrs.filter(r => r.name.startsWith(':')).map(r => [r.name.slice(1), r.value]);
            if (vals.length) {
                ctx = (0, reactive_1.reactive)({}, effect);
                effect.run(() => {
                    vals.forEach(([name, expr]) => {
                        const value = evaluateExpression(expr, context, injector, delimiter);
                        ctx[name] = value;
                    });
                });
            }
            else {
                ctx = undefined;
            }
        }
        const templateRef = (0, template_1.createTemplateRef)(childNodes, elementRef, { injector, context: ctx });
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
function bindingElement(element, renderer, delimiter) {
    const attrs = renderer.getAttributes(element);
    // 创建属性绑定工厂
    bindingAtrrbutes(element, attrs, renderer, delimiter);
    // 检查是否有结构指令
    const dirs = element[Node_1.DIRECTIVES];
    const hasStructuralDirective = dirs?.some(d => d.dirType === directive_1.DirectiveType.Iterable || d.dirType === directive_1.DirectiveType.Conditional);
    // 递归处理子节点（如果没有结构指令）
    if (!hasStructuralDirective && element.childNodes.length > 0) {
        walkNodesForBindings(element.childNodes, renderer, delimiter);
    }
    // 处理组件和指令
    const componentDef = element[Node_1.COMPONENTDEF];
    if (componentDef) {
        bindingComponentFactory(element, componentDef, attrs, renderer, delimiter);
    }
    if (dirs && dirs.length) {
        // Sort directives by priority (higher priority first)
        dirs.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
        element[Node_1.DIRECTIVES] = dirs;
        dirs.forEach(dirDef => {
            bindingDirectiveFactory(element, dirDef, attrs, renderer, delimiter);
        });
    }
    if (element.nodeType === Node_1.NodeType.Template) {
        bindingTemplate(element, renderer, delimiter);
    }
}
/**
 * 创建属性绑定工厂
 * @param element 元素节点
 * @param attrs 属性列表
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
function bindingAtrrbutes(element, attrs, renderer, delimiter) {
    // 创建属性绑定工厂
    attrs.forEach(({ name, value }) => {
        if (name.startsWith('@')) {
            // 事件绑定工厂
            bindingEvent(element, name, value, renderer, delimiter);
        }
        else if (name.startsWith(':')) {
            // 属性绑定工厂
            bindingProperty(element, name, value, renderer, delimiter);
        }
        else if (name === 'v-model') {
            createModelBindingFactory(element, value, renderer, delimiter);
        }
        else if (delimiter.test(value)) {
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
function bindingEvent(element, attrName, expr, renderer, delimiter) {
    const eventName = attrName.substring(1);
    binding(element, (target, context, effect, injector) => {
        const el = target;
        const handler = parseEventExpression(expr, context, effect, injector, delimiter);
        el.addEventListener(eventName, handler);
        return () => {
            try {
                el.setAttribute(attrName, expr);
            }
            catch {
                // Skip invalid attribute names for real DOM
            }
        };
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
function bindingProperty(element, attrName, expr, renderer, delimiter) {
    const propName = attrName.substring(1);
    binding(element, (target, context, effect, injector) => {
        const el = target;
        if (!el.setProperty)
            return;
        effect.run(() => {
            const attValue = evaluateExpression(expr, context, injector, delimiter);
            el.setProperty(propName, attValue);
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
function bindingInterpolationFactory(element, attrName, expr, renderer, delimiter) {
    if (!expr) {
        return;
    }
    const matches = matchDelimiter(expr, delimiter);
    if (!matches?.length)
        return;
    binding(element, (target, context, effect, injector) => {
        const el = target;
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
function createModelBindingFactory(element, prop, renderer, delimiter) {
    binding(element, (target, context, effect, injector) => {
        const el = target;
        effect.run(() => {
            el.setAttribute('value', context[prop]);
            el.addEventListener('input', () => {
                context[prop] = el.getAttribute('value');
            });
        });
        return () => {
            const el = target;
            el.removeAttribute('value');
            // 移除事件监听器
        };
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
function bindingComponentFactory(element, componentDef, attrs, renderer, delimiter) {
    binding(element, (target, context, effect, injector) => {
        if (injector.destroyed)
            return;
        const el = target;
        const elementRef = injector.getElementRef(el);
        const componentRef = componentDef.ƿfac?.(injector, { elementRef });
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
function bindingDirectiveFactory(element, directiveDef, attrs, renderer, delimiter) {
    const selectors = directiveDef.selector.split(',').map(sel => sel.replace(/^\[|\]$/g, ''));
    switch (directiveDef.dirType) {
        case directive_1.DirectiveType.Conditional:
            // 处理条件指令组（v-if, v-else-if, v-else, *if, *else-if, *else, v-show, *show, v-case, *case）
            // v-switch and v-case are structural directives that create containers
            if (directiveDef.selector.includes('v-switch') || directiveDef.selector.includes('*switch')) {
                // v-switch is not a structural directive - it just provides the switch value
                bindingDirective(element, directiveDef, selectors, attrs, renderer, delimiter);
            }
            else if (directiveDef.selector.includes('v-case') || directiveDef.selector.includes('*case')) {
                // v-case is a structural directive that creates a container
                processConditionalBinding(element, directiveDef, selectors, attrs, renderer, delimiter);
            }
            else {
                processConditionalBinding(element, directiveDef, selectors, attrs, renderer, delimiter);
            }
            break;
        case directive_1.DirectiveType.Iterable:
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
function processComponentAttribute(componentRef, attrName, expr, context, effect, injector, delimiter) {
    const attributes = componentRef.def?.attributes || [];
    if (attrName.startsWith('@')) {
        const eventName = attrName.substring(1);
        const inputDef = attributes.find((attr) => attr.alias === eventName || attr.propertyKey === eventName);
        if (inputDef) {
            effect.run(() => {
                const handler = evaluateExpression(expr, context, injector, delimiter);
                if (componentRef.instance[inputDef.propertyKey] instanceof EventEmitter_1.EventEmitter) {
                    componentRef.instance[inputDef.propertyKey].subscribe(handler);
                }
                else if (!componentRef.instance[inputDef.propertyKey]) {
                    componentRef.instance[inputDef.propertyKey] = handler;
                }
            });
        }
    }
    else if (attrName.startsWith(':')) {
        const propName = attrName.substring(1);
        const inputDef = attributes.find((attr) => attr.alias === propName || attr.propertyKey === propName);
        if (inputDef) {
            effect.run(() => {
                const attValue = context[expr];
                componentRef.instance[inputDef.propertyKey] = attValue;
            });
        }
    }
    else {
        const inputDef = attributes.find((attr) => attr.alias === attrName || attr.propertyKey === attrName);
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
function bindingDirective(node, dirDef, selectors, attrs, renderer, delimiter, templateNodes, parentNode) {
    binding(node, (target, context, effect, injector) => {
        const elementRef = injector.getElementRef(target);
        const templateRef = templateNodes ? (0, template_1.createTemplateRef)(templateNodes, elementRef, { injector, context }) : undefined;
        if (templateRef)
            injector.attachTemplate(templateRef);
        const viewContainerRef = injector.getViewContainerRef(target);
        const options = { templateRef, elementRef, viewContainerRef };
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
        const directiveRef = dirDef.ƿfac?.(injector, options);
        if (directiveRef && directiveRef.instance) {
            injector.attachDirective(directiveRef);
            const instance = directiveRef.instance;
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
            if (dirDef.dirType === directive_1.DirectiveType.Conditional && instance instanceof if_dir_1.BaseIfDirective) {
                const parentEl = instance instanceof if_dir_1.VIfDirective ? effectiveParent : instance.parentNode;
                (0, if_dir_1.setupIfChain)(instance, parentEl ?? effectiveParent ?? null);
            }
            // Setup switch directive
            // v-switch is not a structural directive - register on the element itself
            if (instance instanceof switch_case_dir_1.SwitchDirective) {
                (0, switch_case_dir_1.registerSwitchDirective)(instance, target);
            }
            // Setup case/default directive - find switch directive in onInit instead of here
            // because switch might not be registered yet due to element traversal order
            if (instance instanceof switch_case_dir_1.CaseDirective || instance instanceof switch_case_dir_1.DefaultDirective) {
                instance.parentNode = effectiveParent ?? null;
                instance._switchLookupNode = effectiveParent ?? null;
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
            const directives = target[Node_1.DIRECTIVES];
            (0, ioc_1.remove)(directives, dirDef);
        };
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
function processConditionalBinding(el, dirDef, selectors, attrs, renderer, delimiter) {
    const container = createContainer(renderer, dirDef.selector);
    container[Node_1.BINDINGS] = [];
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
    attrs.forEach(attr => {
        renderer.setAttribute(container, attr.name, attr.value);
    });
    dirDef.attributes?.forEach(attrDef => {
        renderer.removeAttribute(container, attrDef.alias ?? attrDef.propertyKey);
    });
    selectors.forEach(selector => {
        renderer.removeAttribute(el, selector);
    });
    const templateEl = el;
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
function processIterableBinding(el, dirDef, selectors, attrs, renderer, delimiter) {
    const container = createContainer(renderer, dirDef.selector);
    container[Node_1.BINDINGS] = [];
    const parent = renderer.parentNode(el);
    if (parent) {
        renderer.insertBefore(parent, container, el);
        renderer.removeChild(parent, el);
    }
    attrs.forEach(attr => {
        renderer.setAttribute(container, attr.name, attr.value);
    });
    dirDef.attributes?.forEach(attrDef => {
        renderer.removeAttribute(container, attrDef.alias ?? attrDef.propertyKey);
    });
    selectors.forEach(selector => {
        renderer.removeAttribute(container, selector);
    });
    // Walk child nodes of the template element for bindings
    // This ensures expressions like {{ item.name }} inside v-for templates get their bindings
    const templateEl = el;
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
function processDirectiveAttributes(directiveRef, directiveDef, selectors, attrs, context, effect, injector, delimiter) {
    const attributes = directiveDef.attributes ?? [];
    if (!attributes?.length)
        return;
    const directiveInstance = directiveRef.instance;
    attributes.forEach(a => {
        const name = a.alias ?? a.propertyKey;
        const propertyKey = a.propertyKey;
        const matchNames = toMatchNames(name);
        const attr = attrs.find(r => matchNames.includes(r.name));
        if (!attr) {
            if (directiveDef.dirType === directive_1.DirectiveType.Conditional && a.propertyKey === 'context') {
                directiveInstance[propertyKey] = context;
            }
            return;
        }
        if (attr.name.startsWith('@')) {
            effect.run(() => {
                const handler = evaluateExpression(attr.value, context, injector, delimiter);
                if (directiveInstance[propertyKey] instanceof EventEmitter_1.EventEmitter) {
                    directiveInstance[propertyKey].subscribe(handler);
                }
                else if (!directiveInstance[propertyKey]) {
                    directiveInstance[propertyKey] = handler;
                }
            });
        }
        else if (attr.name.startsWith(':')) {
            if ((0, ioc_1.isString)(attr.value)) {
                effect.run(() => {
                    const attValue = context[attr.value] ?? attr.value;
                    directiveInstance[propertyKey] = attValue;
                });
            }
            else {
                directiveInstance[propertyKey] = attr.value;
            }
        }
        else if (selectors.includes(attr.name)) {
            if ((0, ioc_1.isString)(attr.value)) {
                if (directiveDef.dirType === directive_1.DirectiveType.Iterable) {
                    evaluateIterableExpression(directiveInstance, propertyKey, attr.value, context, effect, injector, delimiter);
                }
                else {
                    // Capture attr.value in a closure-safe way
                    const attrValue = attr.value;
                    effect.run(() => {
                        const attValue = evaluateExpression(attrValue, context, injector, delimiter);
                        directiveInstance[propertyKey] = attValue;
                    });
                }
            }
            else {
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
function evaluateDelimiterExpression(text, context, effect, matches, update, injector, delimiter) {
    const segments = [];
    let lastIndex = 0;
    matches.forEach(match => {
        segments.push(text.slice(lastIndex, match.index));
        segments.push({ expr: match[1].trim(), value: null });
        lastIndex = match.index + match[0].length;
    });
    segments.push(text.slice(lastIndex));
    segments.forEach(segment => {
        if (typeof segment !== 'string') {
            effect.run(() => {
                segment.value = evaluateExpression(segment.expr, context, injector, delimiter);
                const updatedText = segments.map(s => typeof s === 'string' ? s : s.value).join('');
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
function evaluateExpression(expr, context, injector, delimiter) {
    try {
        const parts = expr.split('|').map(part => part.trim());
        if (parts.length <= 1) {
            return new Function('ctx', `with(ctx){return ${expr}}`)(context);
        }
        else {
            const [expression, ...pipeNames] = parsePipes(parts);
            const pipes = pipeNames.reduce((obj, name) => {
                obj[name] = injector.get(name);
                return obj;
            }, {});
            return new Function('ctx', 'pipes', `with(ctx){return ${expression}}`)(context, pipes);
        }
    }
    catch (e) {
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
function parseEventExpression(expr, context, effect, injector, delimiter) {
    const match = expr.match(funcCallRegex);
    if (!match) {
        const propPath = expr.trim().split('.');
        return effect.run(() => {
            const handler = propPath.reduce((obj, prop) => obj && obj[prop], context);
            return handler.bind(context);
        });
    }
    const [, funcPath, argsStr] = match;
    const args = parseArguments(argsStr, context, injector, delimiter);
    return effect.run(() => {
        const func = funcPath.split('.').reduce((obj, prop) => obj && obj[prop], context);
        if (typeof func !== 'function') {
            throw new Error(`Event handler ${funcPath} is not a function`);
        }
        return (event) => {
            const resolvedArgs = args.map(arg => {
                if (arg === '$event')
                    return event;
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
function createContainer(renderer, text) {
    const container = renderer.createElement('v-container');
    try {
        container.nodeType = Node_1.NodeType.ElementContainer;
    }
    catch {
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
function evaluateIterableExpression(directiveInstance, propertyKey, expr, context, effect, injector, delimiter) {
    // 1. Vue风格: item in items
    const vueStyle = expr.match(vueForRegex);
    let itemNames;
    let collectionExpr;
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
            itemNames.push(angularStyle[4].trim());
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
function bindIterableExpression(directiveInstance, propertyKey, itemNames, collectionExpr, context, effect, injector, delimiter) {
    // 设置v-for指令期望的属性（而不是collection）
    directiveInstance.itemNames = itemNames; // 主循环变量（如item）
    // 设置v-for指令期望的属性
    effect.run(() => {
        const collection = evaluateExpression(collectionExpr, context, injector, delimiter);
        directiveInstance[propertyKey] = collection; // 集合数据
    });
}
const vueInerMatch = /^\(\s*([^,]+)\s*(?:,\s*([^)]+))?\s*\)$/;
/**
 * Vue风格表达式处理
 * @param itemPart 项目部分
 * @returns 项目名称列表
 */
function processVueStyleExpression(itemPart) {
    let names;
    if (itemPart.trim().startsWith('(')) {
        // 处理格式如 (item, index) 的情况
        const innerMatch = itemPart.trim().match(vueInerMatch);
        if (innerMatch) {
            names = [innerMatch[1].trim(), innerMatch[2]?.trim() || ''].filter(Boolean);
        }
        throw new ioc_1.Exception('iterable expression invaild.');
    }
    else {
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
function parsePipes(parts) {
    let result = parts[0];
    const results = [];
    for (let i = 1; i < parts.length; i++) {
        const pipePart = parts[i];
        const [pipeName, ...params] = pipePart.split(':').map(p => p.trim());
        if (!pipeName)
            continue;
        results.push(pipeName);
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
function parseArguments(argsStr, context, injector, delimiter) {
    if (!argsStr.trim())
        return [];
    // 使用状态机解析参数，支持嵌套括号和引号
    const args = [];
    let currentArg = '';
    let quoteChar = null;
    let parenDepth = 0;
    for (const char of argsStr) {
        if (quoteChar) {
            if (char === quoteChar)
                quoteChar = null;
            currentArg += char;
        }
        else if (char === '(') {
            parenDepth++;
            currentArg += char;
        }
        else if (char === ')') {
            parenDepth--;
            currentArg += char;
        }
        else if (char === ',' && parenDepth === 0) {
            args.push(evaluateArg(currentArg.trim(), context, injector, delimiter));
            currentArg = '';
        }
        else if (char === '"' || char === '\'') {
            quoteChar = char;
            currentArg += char;
        }
        else {
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
function evaluateArg(arg, context, injector, delimiter) {
    if (!arg)
        return undefined;
    // 字符串字面量
    if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith('\'') && arg.endsWith('\''))) {
        return arg.slice(1, -1);
    }
    // 数字
    if (!isNaN(Number(arg))) {
        return Number(arg);
    }
    // 布尔值
    if (arg === 'true')
        return true;
    if (arg === 'false')
        return false;
    // null/undefined
    if (arg === 'null')
        return null;
    if (arg === 'undefined')
        return undefined;
    if (arg == '$event')
        return arg;
    // 复杂表达式，委托给evaluateExpression处理
    return evaluateExpression(arg, context, injector, delimiter);
}
// 保留文件末尾的辅助函数
const attrPrefixes = [':', '@', '*', 'v-'];
/**
 * 转换为匹配名称列表
 * @param attrName 属性名
 * @returns 匹配名称列表
 */
function toMatchNames(attrName) {
    const names = [];
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
function camelToKebab(str) {
    return str.replace(kebabMach, '$1-$2').toLowerCase();
}
//# sourceMappingURL=compiler-fns.js.map