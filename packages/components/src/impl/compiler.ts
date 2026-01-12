import { Abstract, Exception, isString, remove } from '@tsdi/ioc';
import { CompilerOptions, TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { BIND_DIRECTIVES, BINDINGS, NodeType, RAttr, RComment, RElement, RNode, RText } from '../renderer/Node';
import { EmbeddedViewRef } from '../refs/view';
import { createEmbeddedViewRef } from './view';
import { TemplateParser } from '../template/parser';
import { ComponentDef } from '../refs/component';
import { COMPONENTS } from '../decorators/component';
import { EventEmitter } from '../EventEmitter';
import { DIRECTIVES } from '../decorators/directive';
import { DirectiveDef, DirectiveOptions, DirectiveRef, DirectiveType, Factoriable } from '../refs/directive';
import { createTemplateRef } from './template';
import { EnvironmentContext } from '../refs/environment';
import { Renderer } from '../renderer/Renderer';
import { BindingFactory, TemplateRef } from '../refs/template';
import { ReactiveEffect } from '../effect';
import { ElementRef } from '../refs/element';


/**
 * 模板编译结果，包含 TemplateRef 和绑定工厂
 */
export interface TemplateCompilationResult<C = any> {
    bindingFactories: Map<RNode, BindingFactory<C>[]>;
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
     * 编译模板并返回完整的编译结果，包含绑定工厂
     */
    compileNodes<C>(nodes: RNode[], options: CompilerOptions): TemplateRef<C> {
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
            const factories: BindingFactory<C>[] = [];

            if (node.nodeType === NodeType.Text || node.nodeType === NodeType.Comment) {
                // 创建文本节点的绑定工厂
                const textFactory = this.createTextBindingFactory(node as RText);
                if (textFactory) {
                    factories.push(textFactory);
                }
            } else {
                // 创建元素节点的绑定工厂
                const element = node as RElement;
                const elementFactories = this.createElementBindingFactories(element, dirMap, compMap);
                factories.push(...elementFactories);
            }

            if (factories.length > 0) {
                if (!node[BINDINGS]) {
                    node[BINDINGS] = factories;
                } else {
                    node[BINDINGS].push(...factories);
                }
            }
        }
    }

    /**
     * 创建文本节点的绑定工厂
     */
    private createTextBindingFactory(node: RText): BindingFactory<any> | null {
        if (!node.textContent || !this.delimiter.test(node.textContent)) {
            return null;
        }

        const textContent = node.textContent;
        return {
            bind: (target: RNode, context: any, environment: EnvironmentContext) => {
                const textNode = target as RText;
                this.evaluateDelimiterExpression(node.textContent!, context, (updatedText) => {
                    textNode.textContent = updatedText;
                }, environment);
            },
            unbind: (target: RNode, environment: EnvironmentContext) => {
                // 清理文本节点的绑定
                const textNode = target as RText;
                textNode.textContent = textContent; // 恢复原始文本
            },
            update: (target: RNode, context: any, environment: EnvironmentContext) => {
                // 文本节点的更新在 bind 方法中通过响应式处理
            }
        };
    }

    /**
     * 创建元素节点的绑定工厂
     */
    private createElementBindingFactories<C>(
        element: RElement,
        dirMap: Map<RNode, DirectiveDef[]>,
        compMap: Map<RNode, ComponentDef>
    ): BindingFactory<C>[] {
        const factories: BindingFactory<C>[] = [];
        const attrs = this.renderer.getAttributes(element);

        // 创建属性绑定工厂
        attrs.forEach(({ name, value }) => {
            if (name.startsWith('@')) {
                // 事件绑定工厂
                const eventFactory = this.createEventBindingFactory(element, name, value);
                factories.push(eventFactory);
            } else if (name.startsWith(':')) {
                // 属性绑定工厂
                const propFactory = this.createPropertyBindingFactory(element, name, value);
                factories.push(propFactory);
            } else if (this.delimiter.test(value)) {
                // 插值表达式绑定工厂
                const interpolationFactory = this.createInterpolationBindingFactory(element, name, value);
                factories.push(interpolationFactory);
            }
        });

        // 处理 v-model 双向绑定
        if (element.hasAttribute('v-model')) {
            const prop = element.getAttribute('v-model') as string;
            const modelFactory = this.createModelBindingFactory(element, prop);
            factories.push(modelFactory);
        }

        // 处理组件和指令
        const componentDef = compMap.get(element);
        if (componentDef) {
            const componentFactory = this.createComponentBindingFactory(element, componentDef, attrs);
            factories.push(componentFactory);
        }

        const dirs = dirMap.get(element);
        if (dirs && dirs.length) {
            element[BIND_DIRECTIVES] = dirs;
            dirs.forEach(dirDef => {
                const directiveFactory = this.createDirectiveBindingFactory(element, dirDef, attrs);
                factories.push(directiveFactory);
            });
        }

        // 递归处理子节点
        if (element.childNodes.length > 0) {
            this.walkNodesForFactories(element.childNodes, dirMap, compMap);
        }

        return factories;
    }

    /**
     * 创建事件绑定工厂
     */
    private createEventBindingFactory(element: RElement, attrName: string, expr: string): BindingFactory<any> {
        const eventName = attrName.substring(1);

        return {
            bind: (target: RNode, context: any, environment: EnvironmentContext) => {
                const el = target as RElement;
                const handler = this.parseEventExpression(expr, context, environment);
                el.addEventListener(eventName, handler);
            },
            unbind: (target: RNode, environment) => {
                const el = target as RElement;
                // 移除事件监听器（需要存储引用）
            },
            update: (context: any, environment) => {
                // 事件绑定通常不需要更新
            }
        };
    }

    /**
     * 创建属性绑定工厂
     */
    private createPropertyBindingFactory(element: RElement, attrName: string, expr: string): BindingFactory<any> {
        const propName = attrName.substring(1);

        return {
            bind: (target: RNode, context: any, environment: EnvironmentContext) => {
                const el = target as RElement;
                const effect = environment.get(ReactiveEffect);
                effect.run(() => {
                    const attValue = this.evaluateExpression(expr, context, environment);
                    el.setAttribute(propName, attValue);
                });
            },
            unbind: (target: RNode, environment) => {
                const el = target as RElement;
                el.removeAttribute(propName);
            },
            update: (context: any, environment) => {
                // 属性更新通过响应式 effect 处理
            }
        };
    }

    /**
     * 创建插值表达式绑定工厂
     */
    private createInterpolationBindingFactory(element: RElement, attrName: string, expr: string): BindingFactory<any> {
        return {
            bind: (target: RNode, context: any, environment: EnvironmentContext) => {
                const el = target as RElement;
                this.evaluateDelimiterExpression(expr, context, (updatedText) => {
                    el.setAttribute(attrName, updatedText);
                }, environment);
            },
            unbind: (target: RNode, environment) => {
                const el = target as RElement;
                el.setAttribute(attrName, expr); // 恢复原始值
            },
            update: (context: any, environment) => {
                // 插值更新通过响应式 effect 处理
            }
        };
    }

    /**
     * 创建双向绑定工厂
     */
    private createModelBindingFactory(element: RElement, prop: string): BindingFactory<any> {
        return {
            bind: (target: RNode, context: any, environment: EnvironmentContext) => {
                const el = target as RElement;
                const effect = environment.get(ReactiveEffect);
                effect.run(() => {
                    el.setAttribute('value', context[prop]);
                    el.addEventListener('input', () => {
                        context[prop] = el.getAttribute('value');
                    });
                });
            },
            unbind: (target: RNode, environment) => {
                const el = target as RElement;
                el.removeAttribute('value');
                // 移除事件监听器
            },
            update: (context: any, environment) => {
                // 双向绑定通过响应式 effect 处理
            }
        };
    }

    /**
     * 创建组件绑定工厂
     */
    private createComponentBindingFactory(element: RElement, componentDef: ComponentDef, attrs: RAttr[]): BindingFactory<any> {
        return {
            bind: async (target: RNode, context: any, environment: EnvironmentContext) => {
                const el = target as RElement;
                const elementRef = environment.getElementRef(el);
                const componentRef = (componentDef as Factoriable).ƿfac?.(environment, { elementRef });

                if (componentRef) {
                    environment.attachComponent(componentRef);

                    // 处理组件属性绑定
                    attrs.forEach(({ name, value }) => {
                        this.processComponentAttribute(componentRef, name, value, context, environment);
                    });

                    await componentRef.render();
                }
            },
            unbind: (target: RNode, environment) => {
                // 清理组件引用
            },
            update: (context: any, environment) => {
                // 组件属性更新
            }
        };
    }

    /**
     * 创建指令绑定工厂
     */
    private createDirectiveBindingFactory<C>(
        element: RElement,
        directiveDef: DirectiveDef,
        attrs: RAttr[]
    ): BindingFactory<C> {
        return {
            bind: (target: RNode, context: any, environment: EnvironmentContext) => {
                const directiveRef = this.createDirectiveRef(directiveDef, target, environment);

                if (directiveRef) {
                    environment.attachDirective(directiveRef);
                    // 处理指令属性
                    this.processDirectiveAttributes(directiveRef, directiveDef, attrs, context, environment);

                    if (directiveRef.instance.onInit) {
                        directiveRef.instance.onInit();
                    }

                    if (directiveRef.render) {
                        directiveRef.render();
                    }
                }
            },
            unbind: (target: RNode, environment) => {
                // 清理指令引用
                const directives = target[BIND_DIRECTIVES];
                remove(directives, directiveDef);
            },
            update: (target: RNode, context: any, environment: EnvironmentContext) => {
                // 指令属性更新
                const directives = target[BIND_DIRECTIVES];
                directives?.forEach(dir => {
                    this.processDirectiveAttributes(dir, directiveDef, attrs, context, environment);
                });
            }
        };
    }

    /**
     * 处理组件属性
     */
    private processComponentAttribute(componentRef: any, attrName: string, expr: string, context: any, environment: EnvironmentContext): void {
        const attributes = componentRef.def?.attributes || [];

        if (attrName.startsWith('@')) {
            const eventName = attrName.substring(1);
            const inputDef = attributes.find((attr: any) => attr.alias === eventName || attr.propertyKey === eventName);
            if (inputDef) {
                const effect = environment.get(ReactiveEffect);
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
                const effect = environment.get(ReactiveEffect);
                effect.run(() => {
                    const attValue = context[expr];
                    componentRef.instance[inputDef.propertyKey] = attValue;
                });
            }
        }
    }

    private createDirectiveRef(dir: DirectiveDef, target: RNode, environment: EnvironmentContext): any {
        const options: DirectiveOptions = {};
        const selectors = dir.selector.split(',').map(sel => sel.replace(/^\[|\]$/g, ''));
        const attrs = this.renderer.getAttributes(target);
        switch (dir.dirType) {
            case DirectiveType.Conditional:
                // 处理条件指令组（v-if, v-else-if, v-else, *if, *else-if, *else）
                this.processConditionalOptions(target, dir, selectors, attrs, options);
                break;

            case DirectiveType.Iterable:
                // 处理列表指令（v-for, *for）
                this.processIterableOptions(target, dir, selectors, attrs, options);
                break;



            case DirectiveType.Structural:
                // 处理结构指令（v-switch）, *switch）
                this.processStructuralOptions(target, dir, selectors, attrs, options);
                break;
            default:

                break;
        }
        return (dir as Factoriable).ƿfac?.(environment, options);
    }

    /**
     * 处理条件指令组
     */
    private processConditionalOptions(el: RNode, dirDef: DirectiveDef, selectors: string[], attrs: RAttr[], options: DirectiveOptions): void {
        const readerer = this.renderer;
        const container = this.createContainer(readerer, dirDef.selector);
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

        const templateNodes = [el];

        const elementRef = new ElementRef(container);

        // 处理条件指令;
        const templateRef = createTemplateRef(templateNodes, elementRef);


        options.elementRef = elementRef;
        options.templateRef = templateRef;

    }

    private processIterableOptions(el: RNode, dirDef: DirectiveDef, selectors: string[], attrs: RAttr[], options: DirectiveOptions): void {
        const readerer = this.renderer;
        const container = this.createContainer(readerer, dirDef.selector);

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

        const templateNodes = [el];

        const elementRef = new ElementRef(container);

        // 处理列表指令;
        const templateRef = createTemplateRef(templateNodes, elementRef);


        options.elementRef = elementRef;
        options.templateRef = templateRef;
    }

    private processStructuralOptions(el: RNode, dirDef: DirectiveDef, selectors: string[], attrs: RAttr[], options: DirectiveOptions): void {
        const readerer = this.renderer;

        const templateNodes = el.childNodes.splice(0);
        dirDef.requires?.forEach(reqSelector => {
            const reqEl = readerer.querySelector(el, reqSelector);
            if (reqEl) {
                templateNodes.push(reqEl);
            }
        });

        templateNodes.forEach(c => readerer.removeChild(el, c));
    }

    /**
     * 处理指令属性
     */
    private processDirectiveAttributes(directiveRef: any, directiveDef: DirectiveDef, attrs: RAttr[], context: any, environment: EnvironmentContext): void {
        const attributes = directiveDef.attributes ?? [];
        if (!attributes?.length) return;

        const directiveInstance = directiveRef.instance;
        const effect = environment.get(ReactiveEffect);

        attributes.forEach(a => {
            const name = a.alias ?? a.propertyKey;
            const propertyKey = a.propertyKey;
            const matchNames = toMatchNames(name);
            const attr = attrs.find(r => matchNames.includes(r.name));
            if (!attr) return;


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
            } else if (attr.name.startsWith('v-') || attr.name.startsWith('*')) {
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
    private evaluateDelimiterExpression(text: string, context: any, update: (text: string) => void, environment: EnvironmentContext): void {
        const matches = text.matchAll(this.delimiter);
        const matchesArray = Array.from(matches);
        const segments: (string | { expr: string, value: any })[] = [];
        let lastIndex = 0;

        matchesArray.forEach(match => {
            segments.push(text.slice(lastIndex, match.index));
            segments.push({ expr: match[1].trim(), value: null });
            lastIndex = match.index! + match[0].length;
        });
        segments.push(text.slice(lastIndex));

        const effect = environment.get(ReactiveEffect);
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
    private parseEventExpression(expr: string, context: any, environment: EnvironmentContext): EventListener {
        const funcCallRegex = /^\s*([_$a-zA-Z\w.]+)\s*\(\s*(.*?)\s*\)\s*$/;
        const match = expr.match(funcCallRegex);

        if (!match) {
            const propPath = expr.trim().split('.');
            const effect = environment.get(ReactiveEffect);
            return effect.run(() => {
                const handler = propPath.reduce((obj, prop) => obj && obj[prop], context);
                return handler.bind(context);
            });
        }

        const [, funcPath, argsStr] = match;
        const args = this.parseArguments(argsStr, context, environment);

        const effect = environment.get(ReactiveEffect);
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


    // private async walkNodes<C>(nodes: RNode[], context: C, viewRef: EmbeddedViewRef<C>, compMap: Map<RNode, ComponentDef>, dirMap: Map<RNode, DirectiveDef[]>) {
    //     for (const node of nodes) {
    //         if (node.nodeType === NodeType.Text || node.nodeType === NodeType.Comment) {
    //             this.processText(node as RText, context, viewRef, dirMap);
    //         } else {
    //             // ...解析模板逻辑...
    //             await this.processBindings(node, context, viewRef, compMap, dirMap);
    //         }
    //     }

    // }


    // private processElement(el: RElement, attrs: RAttr[], context: any, viewRef: EmbeddedViewRef<any>, compMap: Map<RNode, ComponentDef>, dirMap: Map<RNode, DirectiveDef[]>, dirType: DirectiveType) {
    //     if (dirType & DirectiveType.Iterable) return;
    //     // 处理属性
    //     attrs.forEach(({ name, value }) => {
    //         if (name.startsWith('@')) {
    //             // 事件绑定
    //             const eventName = name.substring(1);
    //             const handler = this.parseEventExpression(value, context, viewRef);
    //             el.addEventListener(eventName, handler);
    //         } else if (name.startsWith(':')) {
    //             // 属性绑定
    //             const propName = name.substring(1);
    //             viewRef.effect.run(() => {
    //                 const attValue = this.evaluateExpression(value, context, viewRef);
    //                 el.setAttribute(propName, attValue);
    //             });
    //         } else if (this.delimiter.test(value)) {
    //             this.evaluateDelimiterExpression(value, context, (updatedText) => {
    //                 el.setAttribute(name, updatedText);
    //             }, viewRef);
    //         }
    //     });

    //     // 处理v-model双向绑定
    //     if (el.hasAttribute('v-model')) {
    //         const prop = el.getAttribute('v-model') as string;
    //         viewRef.effect.run(() => {
    //             el.setAttribute('value', context[prop]);
    //             el.addEventListener('input', () => {
    //                 context[prop] = el.getAttribute('value');
    //             });
    //         });
    //     }

    //     // 结构指令（List、Conditional）不处理子节点，由指令自己处理
    //     if (dirType & (DirectiveType.Structural | DirectiveType.Component | DirectiveType.Conditional)) return;

    //     // 递归处理子节点（非结构指令）
    //     if (el.childNodes.length > 0) {
    //         this.walkNodes(el.childNodes, context, viewRef, compMap, dirMap);
    //     }
    // }

    // private processText(node: RText, context: any, viewRef: EmbeddedViewRef<any>, dirMap: Map<RNode, DirectiveDef[]>) {
    //     if (!node.textContent) return;

    //     // 处理插值表达式
    //     this.evaluateDelimiterExpression(node.textContent, context, (updatedText) => {
    //         node.textContent = updatedText;
    //     }, viewRef);
    // }



    // protected async processBindings(node: RNode, context: any, viewRef: EmbeddedViewRef<any>, compMap: Map<RNode, ComponentDef>, dirMap: Map<RNode, DirectiveDef[]>, processChild?: (node: any) => void) {

    //     let el = node as RElement;

    //     const templateTag = this.options.templateTag || 'template';
    //     if (el.tagName === templateTag) {
    //         el.tagName = el.tagName.toLowerCase();
    //         const templateRef = createTemplateRef(el.childNodes, viewRef.environment.getElementRef(el), viewRef.environment);
    //         viewRef.environment.attachTemplate(templateRef);
    //         return;
    //     }

    //     const attrs = this.renderer.getAttributes(el);
    //     let dirTyoe: DirectiveType = DirectiveType.Normal;
    //     const componentDef = compMap.get(el);
    //     if (componentDef) {
    //         dirTyoe |= DirectiveType.Component;
    //         await this.processComponent(el, componentDef, attrs, context, viewRef);
    //     }

    //     const dirs = dirMap.get(node);

    //     const allSelectors: string[] = [];
    //     const dattrs = new Set<string>();
    //     // 优先处理指令组件
    //     if (dirs && dirs.length) {
    //         for (const dirDef of dirs) {
    //             if (dirDef.dirType) {
    //                 dirTyoe |= dirDef.dirType;
    //             }
    //             const selectors = dirDef.selector.split(',').map(sel => sel.replace(/^\[|\]$/g, ''));
    //             allSelectors.push(...selectors);
    //             dirDef.attributes?.forEach(attrDef => {
    //                 dattrs.add(attrDef.alias ?? attrDef.propertyKey);
    //             });
    //             el = await this.processDirectiveByType(el, dirDef, selectors, attrs, context, viewRef) as RElement;
    //         }

    //         //处理元素属性（排除已处理的指令属性）
    //         const processedAttrSelectors = new Set(allSelectors);
    //         await this.processElement(
    //             el,
    //             attrs.filter(a => !(dattrs.has(a.name) || processedAttrSelectors.has(a.name))),
    //             context,
    //             viewRef,
    //             compMap,
    //             dirMap,
    //             dirTyoe
    //         );
    //     } else {
    //         await this.processElement(el, attrs, context, viewRef, compMap, dirMap, dirTyoe);
    //     }
    // }

    // /**
    //  * 处理指令组
    //  */
    // private async processDirectiveByType(el: RElement, dir: DirectiveDef, selectors: string[], attrs: RAttr[], context: any, viewRef: EmbeddedViewRef<any>): Promise<RNode> {

    //     switch (dir.dirType) {
    //         case DirectiveType.Conditional:
    //             // 处理条件指令组（v-if, v-else-if, v-else, *if, *else-if, *else）
    //             return await this.processConditionalDirectives(el, dir, selectors, attrs, context, viewRef);

    //         case DirectiveType.Iterable:
    //             // 处理列表指令（v-for, *for）
    //             return await this.processListDirectives(el, dir, selectors, attrs, context, viewRef);


    //         case DirectiveType.Structural:
    //             // 处理结构指令（v-switch）, *switch）
    //             return await this.processStructuralDirectives(el, dir, selectors, attrs, context, viewRef);
    //         default:
    //             await this.processDirective(el, dir, selectors, attrs, context, viewRef);
    //             return el;
    //     }
    // }

    // /**
    //  * 处理条件指令组
    //  */
    // private async processConditionalDirectives(el: RElement, dirDef: DirectiveDef, selectors: string[], attrs: RAttr[], context: any, viewRef: EmbeddedViewRef<any>): Promise<RNode> {
    //     const readerer = this.renderer;
    //     const container = this.createContainer(readerer, dirDef.selector);
    //     const parent = readerer.parentNode(el);
    //     if (parent) {
    //         readerer.insertBefore(parent, container, el);
    //         readerer.removeChild(parent, el);
    //     }

    //     attrs.forEach(attr => {
    //         readerer.setAttribute(container, attr.name, attr.value)
    //     });
    //     dirDef.attributes?.forEach(attrDef => {
    //         readerer.removeAttribute(container, attrDef.alias ?? attrDef.propertyKey);
    //     });

    //     selectors.forEach(selector => {
    //         readerer.removeAttribute(container, selector);
    //     });

    //     const templateNodes = [el];

    //     // 处理条件指令

    //     await this.processDirective(container, dirDef, selectors, attrs, context, viewRef, templateNodes);

    //     return container;

    // }

    // /**
    //  * 处理列表指令
    //  */
    // private async processListDirectives(el: RElement, dirDef: DirectiveDef, selectors: string[], attrs: RAttr[], context: any, viewRef: EmbeddedViewRef<any>): Promise<RNode> {
    //     // 为列表指令提供模板处理能力
    //     const readerer = this.renderer;

    //     const container = this.createContainer(readerer, dirDef.selector) as RElement;
    //     const parent = readerer.parentNode(el);
    //     if (parent) {
    //         readerer.insertBefore(parent, container, el);
    //         readerer.removeChild(parent, el);
    //     }

    //     attrs.forEach(attr => {
    //         readerer.setAttribute(container, attr.name, attr.value)
    //     });

    //     dirDef.attributes?.forEach(attrDef => {
    //         readerer.removeAttribute(el, attrDef.alias ?? attrDef.propertyKey);
    //     });

    //     selectors.forEach(selector => {
    //         readerer.removeAttribute(el, selector);
    //     });

    //     const templateNodes = [el];

    //     // 列表指令通常只有一个（v-for）

    //     await this.processDirective(container, dirDef, selectors, attrs, context, viewRef, templateNodes);

    //     return container;

    // }


    // /**
    //  * 处理结构指令
    //  */
    // private async processStructuralDirectives(el: RElement, dirDef: DirectiveDef, selectors: string[], attrs: RAttr[], context: any, viewRef: EmbeddedViewRef<any>): Promise<RNode> {
    //     // 为列表指令提供模板处理能力
    //     const readerer = this.renderer;

    //     const templateNodes = el.childNodes.splice(0);

    //     templateNodes.forEach(c => readerer.removeChild(el, c));

    //     await this.processDirective(el, dirDef, selectors, attrs, context, viewRef, templateNodes);

    //     return el;

    // }


    // private async processComponent(el: RElement, componentDef: ComponentDef, attrs: RAttr[], context: any, viewRef: EmbeddedViewRef<any>) {
    //     const elementRef = viewRef.environment.getElementRef(el);
    //     const componentRef = (componentDef as Factoriable).ƿfac?.(viewRef.environment, { elementRef });

    //     // 注册组件引用到视图
    //     if (componentRef) {
    //         viewRef.environment.attachComponent(componentRef);
    //     }

    //     const attributes = componentDef?.attributes || [];

    //     // 解析组件属性绑定
    //     attrs.forEach(({ name, value }) => {
    //         if (name.startsWith('@')) {
    //             // 事件绑定
    //             const eventName = name.substring(1);
    //             // 查找是否为输入属性
    //             const inputDef = attributes.find(attr => attr.alias === eventName || attr.propertyKey === eventName);
    //             if (inputDef) {
    //                 // 解析绑定表达式并创建响应式依赖
    //                 viewRef.effect.run(() => {
    //                     const handler = this.evaluateExpression(value, context, viewRef);
    //                     // 绑定事件处理函数
    //                     if (componentRef.instance[inputDef.propertyKey] instanceof EventEmitter) {
    //                         componentRef.instance[inputDef.propertyKey].subscribe(handler);
    //                     } else if (!componentRef.instance[inputDef.propertyKey]) {
    //                         componentRef.instance[inputDef.propertyKey] = handler;
    //                     }
    //                 });
    //             }
    //         } else if (name.startsWith(':')) {
    //             // 属性绑定
    //             const propName = name.substring(1);
    //             // 查找是否为输入属性
    //             const inputDef = attributes.find(attr => attr.alias === propName || attr.propertyKey === propName);
    //             if (inputDef) {
    //                 viewRef.effect.run(() => {
    //                     const attValue = context[value];
    //                     // if (propName === 'class' || propName === 'style') {
    //                     //     this.handleSpecialAttribute(el, propName, attValue);
    //                     // } else {
    //                     componentRef.instance[inputDef.propertyKey] = attValue;
    //                     // }
    //                 });
    //             }
    //         }
    //     });


    //     // 处理组件事件绑定
    //     const events: Record<string, EventListener> = {};
    //     attrs.forEach(({ name, value }) => {
    //         if (name.startsWith('@')) {
    //             const eventName = name.substring(1);
    //             events[eventName] = this.parseEventExpression(value, context, viewRef);
    //         }
    //     });

    //     // 渲染组件并替换当前节点
    //     await componentRef.render();
    // }

    // protected async processDirective(el: RNode, directive: DirectiveDef, selectors: string[], attrs: RAttr[], context: any, viewRef: EmbeddedViewRef<any>, templateNodes?: RNode[]) {
    //     // 创建指令实例，并传入更多上下文信息
    //     const directiveRef = this.createDirectiveRef(directive, el, viewRef, templateNodes);
    //     if (!directiveRef) throw new Exception(`directive ${directive.selector} has not declaration!`);

    //     if (directiveRef) {
    //         viewRef.environment.attachDirective(directiveRef);
    //     }

    //     const attributes = directive.attributes ?? [];
    //     const directiveInstance = directiveRef.instance;

    //     if (directive.dirType === DirectiveType.Conditional) {
    //         directiveInstance.context = context;
    //     }

    //     attributes.forEach(a => {
    //         const name = a.alias ?? a.propertyKey;
    //         const propertyKey = a.propertyKey;
    //         const matchNames = toMatchNames(name);
    //         const attr = attrs.find(r => matchNames.includes(r.name));
    //         if (!attr) return;

    //         if (attr.name.startsWith('@')) {
    //             // 解析绑定表达式并创建响应式依赖
    //             viewRef.effect.run(() => {
    //                 const handler = this.evaluateExpression(attr.value, context, viewRef);
    //                 // 绑定事件处理函数
    //                 if (directiveInstance[propertyKey] instanceof EventEmitter) {
    //                     directiveInstance[propertyKey].subscribe(handler);
    //                 } else if (!directiveInstance[propertyKey]) {
    //                     directiveInstance[propertyKey] = handler;
    //                 }
    //             });
    //         } else if (attr.name.startsWith(':')) {
    //             // 属性绑定
    //             // 查找是否为输入属性
    //             if (isString(attr.value)) {
    //                 viewRef.effect.run(() => {
    //                     const attValue = context[attr.value] ?? attr.value;
    //                     directiveInstance[propertyKey] = attValue;
    //                 });
    //             } else {
    //                 directiveInstance[propertyKey] = attr.value;
    //             }

    //         } else if (attr.name.startsWith('v-') || attr.name.startsWith('*')) {
    //             // 指令表达式绑定 - 需要求值表达式以访问组件实例属性
    //             if (isString(attr.value)) {
    //                 if (directive.dirType === DirectiveType.Iterable) {
    //                     this.evaluateIterableExpression(directiveInstance, propertyKey, attr.value, context, viewRef);
    //                 } else {
    //                     viewRef.effect.run(() => {
    //                         const attValue = this.evaluateExpression(attr.value, context, viewRef);
    //                         directiveInstance[propertyKey] = attValue;
    //                     });
    //                 }
    //             } else {
    //                 directiveInstance[propertyKey] = attr.value;
    //             }
    //         }

    //     })


    //     // 调用指令的初始化方法
    //     if (directiveInstance.onInit) {
    //         directiveInstance.onInit();
    //     }

    //     // 渲染指令
    //     if (directiveRef.render) {
    //         // 渲染组件并替换当前节点
    //         await directiveRef.render();
    //     }
    // }

    // /**
    //  * Create directive instance.
    //  *
    //  * @protected
    //  * @param {any} directive
    //  * @param {RElement} node
    //  * @param {any} environment
    //  * @returns {*}
    //  * @memberof AbstractTemplateCompiler
    //  */
    // protected createDirectiveRef(directive: DirectiveDef, node: RNode, viewRef: EmbeddedViewRef<any>, templateNodes?: RNode[]): DirectiveRef<any> | null {
    //     // 实际应用中需要使用注入器创建指令实例
    //     // 这里简化处理
    //     try {
    //         // 从环境中获取必要的依赖
    //         const elementRef = viewRef.environment.getElementRef(node);

    //         // 创建指令实例并注入依赖
    //         const directiveRef = (directive as Factoriable).ƿfac?.(viewRef.environment, {
    //             elementRef,
    //             templateNodes,
    //             // viewContainer: viewContainerRef,
    //             // templateRef: templateRef
    //         }) as DirectiveRef<any> ?? null;

    //         return directiveRef;
    //     } catch (err) {
    //         console.error('Failed to create directive instance:', err);
    //         return null;
    //     }
    // }

    // private evaluateDelimiterExpression(text: string, context: any, update: (text: string) => void, viewRef: EmbeddedViewRef<any>) {
    //     const matches = text.matchAll(this.delimiter);
    //     const matchesArray = Array.from(matches);

    //     // 存储原始文本片段和表达式的映射
    //     const segments: (string | { expr: string, value: any })[] = [];
    //     let lastIndex = 0;

    //     // 将文本分割为静态和动态部分
    //     matchesArray.forEach(match => {
    //         segments.push(text.slice(lastIndex, match.index));
    //         segments.push({ expr: match[1].trim(), value: null });
    //         lastIndex = match.index! + match[0].length;
    //     });
    //     segments.push(text.slice(lastIndex));

    //     // 为每个表达式创建响应式依赖
    //     segments.forEach(segment => {
    //         if (typeof segment !== 'string') {
    //             viewRef.effect.run(() => {
    //                 segment.value = this.evaluateExpression(segment.expr, context, viewRef);
    //                 // 只有在表达式值变化时才更新整个文本
    //                 const updatedText = segments.map(s =>
    //                     typeof s === 'string' ? s : s.value
    //                 ).join('');
    //                 update(updatedText);
    //             });
    //         }
    //     });
    // }


    // // 深度比较两个值是否相等
    // private isEqual(a: any, b: any): boolean {
    //     if (a === b) return true;
    //     if (a === null || b === null) return false;
    //     if (typeof a !== typeof b) return false;

    //     if (Array.isArray(a) && Array.isArray(b)) {
    //         if (a.length !== b.length) return false;
    //         for (let i = 0; i < a.length; i++) {
    //             if (!this.isEqual(a[i], b[i])) return false;
    //         }
    //         return true;
    //     }

    //     if (typeof a === 'object' && typeof b === 'object') {
    //         const aKeys = Object.keys(a);
    //         const bKeys = Object.keys(b);
    //         if (aKeys.length !== bKeys.length) return false;

    //         for (const key of aKeys) {
    //             if (!this.isEqual(a[key], b[key])) return false;
    //         }
    //         return true;
    //     }

    //     return false;
    // }


    // // 修改 evaluateExpression 方法以正确处理模板上下文
    // private evaluateExpression(expr: string, context: any, viewRef: EmbeddedViewRef<any>): any {
    //     try {
    //         const parts = expr.split('|').map(part => part.trim());
    //         if (parts.length <= 1) {
    //             // 简单表达式求值
    //             return new Function('ctx', `with(ctx){return ${expr}}`)(context);
    //         } else {
    //             const [expression, ...pipeNames] = this.parsePipes(parts);
    //             const pipes = pipeNames.reduce((obj, name) => {
    //                 obj[name] = viewRef.environment.get(name);
    //                 return obj;
    //             }, {} as any);
    //             // 将管道函数添加到执行上下文中
    //             return new Function('ctx', 'pipes', `with(ctx){return ${expression}}`)(context, pipes);
    //         }
    //     } catch (e) {
    //         console.error(`Error evaluating expression: ${expr}`, e);
    //         return '';
    //     }
    // }


    // private parseEventExpression(expr: string, context: any, viewRef: EmbeddedViewRef<any>): EventListener {
    //     // 改进正则以支持带命名空间的函数名和复杂参数
    //     const funcCallRegex = /^\s*([_$a-zA-Z\w.]+)\s*\(\s*(.*?)\s*\)\s*$/;
    //     const match = expr.match(funcCallRegex);

    //     if (!match) {
    //         // 支持直接绑定上下文对象的方法 (如: @click="user.onClick")
    //         const propPath = expr.trim().split('.');
    //         return viewRef.effect.run(() => {
    //             const handler = propPath.reduce((obj, prop) => obj && obj[prop], context);
    //             return handler.bind(context);
    //         });
    //     }

    //     const [, funcPath, argsStr] = match;
    //     const args = this.parseArguments(argsStr, context, viewRef);

    //     return viewRef.effect.run(() => {
    //         // 解析函数路径 (支持嵌套对象，如: user.service.handleClick)
    //         let funcTarget: any;
    //         const func = funcPath.split('.').reduce((obj, prop) => {
    //             funcTarget = obj;
    //             return obj && obj[prop];
    //         }, context);

    //         if (typeof func !== 'function') {
    //             throw new Error(`Event handler ${funcPath} is not a function`);
    //         }

    //         return (event: Event) => {
    //             // 解析参数值，支持 $event 特殊变量和上下文访问
    //             const resolvedArgs = args.map(arg => {
    //                 if (arg === '$event') return event;
    //                 if (typeof arg === 'string') {
    //                     return viewRef.query(`[#${arg}]`) ?? arg.split('.').reduce((obj, prop) => obj && obj[prop], context) ?? arg;
    //                 }
    //                 return arg;
    //             });
    //             return func.apply(funcTarget, resolvedArgs);
    //         };
    //     });
    // }


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