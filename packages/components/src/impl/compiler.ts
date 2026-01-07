import { Abstract, Exception, getDef, isObject, isString } from '@tsdi/ioc';
import { TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { NodeType, RAttr, RElement, RNode, RText } from '../renderer/Node';
import { ViewRef, EmbeddedViewRef } from '../refs/view';
import { createEmbeddedViewRef } from './view';
import { TemplateParser } from '../template/parser';
import { ComponentDef } from '../refs/component';
import { COMPONENTS } from '../decorators/component';
import { EventEmitter } from '../EventEmitter';
import { DIRECTIVES } from '../decorators/directive';
import { DirectiveDef, DirectiveRef, DirectiveType, Factoriable } from '../refs/directive';
import { createTemplateRef } from './template';
import { EnvironmentContext } from '../refs/environment';
import { Renderer } from '../renderer/Renderer';



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

    async compile<C>(template: T, context: C, environment: EnvironmentContext): Promise<EmbeddedViewRef<C>> {
        // 使用模板解析器解析模板
        const nodes = environment.get(TemplateParser<T>).parse(template, environment);

        const viewRef = createEmbeddedViewRef(nodes, context, environment, this.effect);

        const rootNodes = viewRef.rootNodes ?? [];

        const directives = environment.get(DIRECTIVES) || [];
        const components = environment.get(COMPONENTS) || [];
        const dirMap = new Map<RNode, DirectiveDef[]>();
        const compMap = new Map<RNode, ComponentDef>();
        const readerer = environment.get(Renderer);


        components.forEach(r => {
            const nodes = readerer.querySelectorAll(rootNodes, r.selector);
            nodes?.forEach(n => {
                if (compMap.has(n)) {
                    throw new Exception('has dup component selector')
                }
                compMap.set(n, r);
            })
        })
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
            })
        });

        Array.from(dirMap.keys()).forEach((key) => {
            const sortedDirs = dirMap.get(key)!.sort((a, b) => {
                // 先按优先级排序
                if (a.priority !== b.priority) {
                    return (b.priority || 0) - (a.priority || 0);
                }
                // 再按指令类型排序
                if (a.dirType !== b.dirType) {
                    return (b.dirType || 0) - (a.dirType || 0);
                }
                return 0;
            });
            dirMap.set(key, sortedDirs);
        })




        // 处理动态内容
        await this.walkNodes(rootNodes, context, viewRef, compMap, dirMap);

        return viewRef;
    }

    private async walkNodes<C>(nodes: RNode[], context: C, viewRef: EmbeddedViewRef<C>, compMap: Map<RNode, ComponentDef>, dirMap: Map<RNode, DirectiveDef[]>) {
        for (const node of nodes) {
            if (node.nodeType === NodeType.Text || node.nodeType === NodeType.Comment) {
                this.processText(node as RText, context, viewRef, dirMap);
            } else {
                // ...解析模板逻辑...
                await this.processBindings(node, context, viewRef, compMap, dirMap);
            }
        }

    }


    private async processElement(el: RElement, attrs: RAttr[], context: any, viewRef: EmbeddedViewRef<any>, compMap: Map<RNode, ComponentDef>, dirMap: Map<RNode, DirectiveDef[]>, dirType: DirectiveType) {
        if (dirType & DirectiveType.Iterable) return;
        // 处理属性
        attrs.forEach(({ name, value }) => {
            if (name.startsWith('@')) {
                // 事件绑定
                const eventName = name.substring(1);
                const handler = this.parseEventExpression(value, context, viewRef);
                el.addEventListener(eventName, handler);
            } else if (name.startsWith(':')) {
                // 属性绑定
                const propName = name.substring(1);
                this.effect.run(() => {
                    const attValue = this.evaluateExpression(value, context, viewRef);
                    el.setAttribute(propName, attValue);
                });
            } else if (this.delimiter.test(value)) {
                this.evaluateDelimiterExpression(value, context, (updatedText) => {
                    el.setAttribute(name, updatedText);
                }, viewRef);
            }
        });

        // 处理v-model双向绑定
        if (el.hasAttribute('v-model')) {
            const prop = el.getAttribute('v-model') as string;
            this.effect.run(() => {
                el.setAttribute('value', context[prop]);
                el.addEventListener('input', () => {
                    context[prop] = el.getAttribute('value');
                });
            });
        }

        // 结构指令（List、Conditional）不处理子节点，由指令自己处理
        if (dirType & (DirectiveType.Structural | DirectiveType.Component | DirectiveType.Conditional)) return;

        // 递归处理子节点（非结构指令）
        if (el.childNodes.length > 0) {
            await this.walkNodes(el.childNodes, context, viewRef, compMap, dirMap);
        }
    }

    private processText(node: RText, context: any, viewRef: EmbeddedViewRef<any>, dirMap: Map<RNode, DirectiveDef[]>) {
        if (!node.textContent) return;

        // 处理插值表达式
        this.evaluateDelimiterExpression(node.textContent, context, (updatedText) => {
            node.textContent = updatedText;
        }, viewRef);
    }



    protected async processBindings(node: RNode, context: any, viewRef: EmbeddedViewRef<any>, compMap: Map<RNode, ComponentDef>, dirMap: Map<RNode, DirectiveDef[]>, processChild?: (node: any) => void) {

        let el = node as RElement;

        const templateTag = this.options.templateTag || 'template';
        if (el.tagName === templateTag) {
            el.tagName = el.tagName.toLowerCase();
            const templateRef = createTemplateRef(el.childNodes, viewRef.environment.getElementRef(el), viewRef.environment);
            viewRef.environment.attachTemplate(templateRef);
            return;
        }

        const attrs = this.renderer.getAttributes(el);
        let dirTyoe: DirectiveType = DirectiveType.Normal;
        const componentDef = compMap.get(el);
        if (componentDef) {
            dirTyoe |= DirectiveType.Component;
            await this.processComponent(el, componentDef, attrs, context, viewRef);
        }

        const dirs = dirMap.get(node);

        const allSelectors: string[] = [];
        // 优先处理指令组件
        if (dirs && dirs.length) {
            for (const dirDef of dirs) {
                if (dirDef.dirType) {
                    dirTyoe |= dirDef.dirType;
                }
                const selectors = dirDef.selector.split(',').map(sel => sel.replace(/^\[|\]$/g, ''));
                allSelectors.push(...selectors);
                el = await this.processDirectiveByType(el, dirDef, selectors, attrs, context, viewRef) as RElement;
            }

            // const groupedDirs = this.groupDirectivesByType(dirs);

            // // 3. 处理每个指令组
            // for (const [groupType, groupDirs] of groupedDirs) {
            //     dirTyoe |= groupType;
            //     await this.processDirectiveGroup(el, groupType, groupDirs, attrs, context, viewRef);
            // }

            // 4. 处理元素属性（排除已处理的指令属性）
            const processedAttrSelectors = new Set(allSelectors);
            await this.processElement(
                el,
                attrs.filter(a => !processedAttrSelectors.has(a.name)),
                context,
                viewRef,
                compMap,
                dirMap,
                dirTyoe
            );
        } else {
            await this.processElement(el, attrs, context, viewRef, compMap, dirMap, dirTyoe);
        }
    }

    /**
     * 处理指令组
     */
    private async processDirectiveByType(el: RElement, dir: DirectiveDef, selectors: string[], attrs: RAttr[], context: any, viewRef: EmbeddedViewRef<any>): Promise<RNode> {

        switch (dir.dirType) {
            case DirectiveType.Conditional:
                // 处理条件指令组（v-if, v-else-if, v-else, *if, *else-if, *else）
                return await this.processConditionalDirectives(el, dir, selectors, attrs, context, viewRef);

            case DirectiveType.Iterable:
                // 处理列表指令（v-for, *for）
                return await this.processListDirectives(el, dir, selectors, attrs, context, viewRef);


            case DirectiveType.Structural:
                // 处理结构指令（v-switch）, *switch）
                return await this.processStructuralDirectives(el, dir, selectors, attrs, context, viewRef);
            default:
                await this.processDirective(el, dir, selectors, attrs, context, viewRef);
                return el;
        }
    }

    /**
     * 处理条件指令组
     */
    private async processConditionalDirectives(el: RElement, dirDef: DirectiveDef, selectors: string[], attrs: RAttr[], context: any, viewRef: EmbeddedViewRef<any>): Promise<RNode> {

        const readerer = viewRef.environment.get(Renderer);
        const container = this.createContainer(readerer, dirDef.selector);
        const parent = readerer.parentNode(el);
        if (parent) {
            readerer.insertBefore(parent, container, el);
            readerer.removeChild(parent, el);
        }

        readerer.getAttributes(el).forEach(attr => {
            el.removeAttribute(attr.name);
            readerer.setAttribute(container, attr.name, attr.value)
        });
        const templateNodes = [el];

        // 处理条件指令

        await this.processDirective(container, dirDef, selectors, attrs, context, viewRef, templateNodes);

        return container;

    }

    /**
     * 处理列表指令
     */
    private async processListDirectives(el: RElement, dirDef: DirectiveDef, selectors: string[], attrs: RAttr[], context: any, viewRef: EmbeddedViewRef<any>): Promise<RNode> {
        // 为列表指令提供模板处理能力
        const readerer = viewRef.environment.get(Renderer);

        const container = this.createContainer(readerer, dirDef.selector) as RElement;
        const parent = readerer.parentNode(el);
        if (parent) {
            readerer.insertBefore(parent, container, el);
            readerer.removeChild(parent, el);
        }

        readerer.getAttributes(el).forEach(attr => {
            el.removeAttribute(attr.name);
            readerer.setAttribute(container, attr.name, attr.value)
        })

        const templateNodes = [el];

        // 列表指令通常只有一个（v-for）

        await this.processDirective(container, dirDef, selectors, attrs, context, viewRef, templateNodes);

        return container;

    }

    private createContainer(readerer: Renderer, text?: string): RElement {
        const container = readerer.createElement('v-container');
        container.nodeType = NodeType.ElementContainer;
        // if (text) container.textContent = text;
        return container;
    }

    /**
     * 处理结构指令
     */
    private async processStructuralDirectives(el: RElement, dirDef: DirectiveDef, selectors: string[], attrs: RAttr[], context: any, viewRef: EmbeddedViewRef<any>): Promise<RNode> {
        // 为列表指令提供模板处理能力
        const readerer = viewRef.environment.get(Renderer);

        const templateNodes = el.childNodes.splice(0);

        templateNodes.forEach(c => readerer.removeChild(el, c));

        // 列表指令通常只有一个（v-for）
        await this.processDirective(el, dirDef, selectors, attrs, context, viewRef, templateNodes);

        return el;

    }


    private async processComponent(el: RElement, componentDef: ComponentDef, attrs: RAttr[], context: any, viewRef: EmbeddedViewRef<any>) {
        const elementRef = viewRef.environment.getElementRef(el);
        const componentRef = (componentDef as Factoriable).ƿfac?.(viewRef.environment, { elementRef });

        // 注册组件引用到视图
        if (componentRef) {
            viewRef.environment.attachComponent(componentRef);
        }

        const attributes = componentDef?.attributes || [];

        // 解析组件属性绑定
        attrs.forEach(({ name, value }) => {
            if (name.startsWith('@')) {
                // 事件绑定
                const eventName = name.substring(1);
                // 查找是否为输入属性
                const inputDef = attributes.find(attr => attr.alias === eventName || attr.propertyKey === eventName);
                if (inputDef) {
                    // 解析绑定表达式并创建响应式依赖
                    this.effect.run(() => {
                        const handler = this.evaluateExpression(value, context, viewRef);
                        // 绑定事件处理函数
                        if (componentRef.instance[inputDef.propertyKey] instanceof EventEmitter) {
                            componentRef.instance[inputDef.propertyKey].subscribe(handler);
                        } else if (!componentRef.instance[inputDef.propertyKey]) {
                            componentRef.instance[inputDef.propertyKey] = handler;
                        }
                    });
                }
            } else if (name.startsWith(':')) {
                // 属性绑定
                const propName = name.substring(1);
                // 查找是否为输入属性
                const inputDef = attributes.find(attr => attr.alias === propName || attr.propertyKey === propName);
                if (inputDef) {
                    this.effect.run(() => {
                        const attValue = context[value];
                        // if (propName === 'class' || propName === 'style') {
                        //     this.handleSpecialAttribute(el, propName, attValue);
                        // } else {
                        componentRef.instance[inputDef.propertyKey] = attValue;
                        // }
                    });
                }
            }
        });


        // 处理组件事件绑定
        const events: Record<string, EventListener> = {};
        attrs.forEach(({ name, value }) => {
            if (name.startsWith('@')) {
                const eventName = name.substring(1);
                events[eventName] = this.parseEventExpression(value, context, viewRef);
            }
        });

        // 渲染组件并替换当前节点
        await componentRef.render();
    }

    protected async processDirective(el: RNode, directive: DirectiveDef, selectors: string[], attrs: RAttr[], context: any, viewRef: EmbeddedViewRef<any>, templateNodes?: RNode[]) {
        // 创建指令实例，并传入更多上下文信息
        const directiveRef = this.createDirectiveRef(directive, el, viewRef, templateNodes);
        if (!directiveRef) throw new Exception(`directive ${directive.selector} has not declaration!`);

        if (directiveRef) {
            viewRef.environment.attachDirective(directiveRef);
        }

        const attributes = directive.attributes ?? [];
        const directiveInstance = directiveRef.instance;

        if (directive.dirType === DirectiveType.Conditional) {
            directiveInstance.context = context;
        }

        attributes.forEach(a => {
            const name = a.alias ?? a.propertyKey;
            const propertyKey = a.propertyKey;
            const matchNames = toMatchNames(name);
            const attr = attrs.find(r => matchNames.includes(r.name));
            if (!attr) return;

            if (attr.name.startsWith('@')) {
                // 解析绑定表达式并创建响应式依赖
                this.effect.run(() => {
                    const handler = this.evaluateExpression(attr.value, context, viewRef);
                    // 绑定事件处理函数
                    if (directiveInstance[propertyKey] instanceof EventEmitter) {
                        directiveInstance[propertyKey].subscribe(handler);
                    } else if (!directiveInstance[propertyKey]) {
                        directiveInstance[propertyKey] = handler;
                    }
                });
            } else if (attr.name.startsWith(':')) {
                // 属性绑定
                // 查找是否为输入属性
                if (isString(attr.value)) {
                    this.effect.run(() => {
                        const attValue = context[attr.value] ?? attr.value;
                        directiveInstance[propertyKey] = attValue;
                    });
                } else {
                    directiveInstance[propertyKey] = attr.value;
                }

            } else if (attr.name.startsWith('v-') || attr.name.startsWith('*')) {
                // 指令表达式绑定 - 需要求值表达式以访问组件实例属性
                if (isString(attr.value)) {
                    if (directive.dirType === DirectiveType.Iterable) {
                        this.evaluateIterableExpression(directiveInstance, propertyKey, attr.value, context, viewRef);
                    } else {
                        this.effect.run(() => {
                            const attValue = this.evaluateExpression(attr.value, context, viewRef);
                            directiveInstance[propertyKey] = attValue;
                        });
                    }
                } else {
                    directiveInstance[propertyKey] = attr.value;
                }
            }

        })


        // 调用指令的初始化方法
        if (directiveInstance.onInit) {
            directiveInstance.onInit();
        }

        // 渲染指令
        if (directiveRef.render) {
            // 渲染组件并替换当前节点
            await directiveRef.render();
        }
    }

    /**
     * Create directive instance.
     *
     * @protected
     * @param {any} directive
     * @param {RElement} node
     * @param {any} environment
     * @returns {*}
     * @memberof AbstractTemplateCompiler
     */
    protected createDirectiveRef(directive: DirectiveDef, node: RNode, viewRef: EmbeddedViewRef<any>, templateNodes?: RNode[]): DirectiveRef<any> | null {
        // 实际应用中需要使用注入器创建指令实例
        // 这里简化处理
        try {
            // 从环境中获取必要的依赖
            const elementRef = viewRef.environment.getElementRef(node);

            // 创建指令实例并注入依赖
            const directiveRef = (directive as Factoriable).ƿfac?.(viewRef.environment, {
                elementRef,
                templateNodes,
                // viewContainer: viewContainerRef,
                // templateRef: templateRef
            }) as DirectiveRef<any> ?? null;

            return directiveRef;
        } catch (err) {
            console.error('Failed to create directive instance:', err);
            return null;
        }
    }

    private evaluateDelimiterExpression(text: string, context: any, update: (text: string) => void, viewRef: EmbeddedViewRef<any>) {
        const matches = text.matchAll(this.delimiter);
        const matchesArray = Array.from(matches);

        // 存储原始文本片段和表达式的映射
        const segments: (string | { expr: string, value: any })[] = [];
        let lastIndex = 0;

        // 将文本分割为静态和动态部分
        matchesArray.forEach(match => {
            segments.push(text.slice(lastIndex, match.index));
            segments.push({ expr: match[1].trim(), value: null });
            lastIndex = match.index! + match[0].length;
        });
        segments.push(text.slice(lastIndex));

        // 为每个表达式创建响应式依赖
        segments.forEach(segment => {
            if (typeof segment !== 'string') {
                this.effect.run(() => {
                    segment.value = this.evaluateExpression(segment.expr, context, viewRef);
                    // 只有在表达式值变化时才更新整个文本
                    const updatedText = segments.map(s =>
                        typeof s === 'string' ? s : s.value
                    ).join('');
                    update(updatedText);
                });
            }
        });
    }


    protected evaluateIterableExpression(directiveInstance: any, propertyKey: string, expr: string, context: any, viewRef: EmbeddedViewRef<any>): any {
        // 1. Vue风格: item in items
        const vueStyle = expr.match(/^\s*((?:\([^)]+\)|[^)])+)\s+(?:in|of)\s+([^]+)$/);
        let itemNames: string[];
        let collectionExpr: string;
        if (vueStyle) {
            collectionExpr = vueStyle[2].trim();
            itemNames = this.processVueStyleExpression(vueStyle[1]);
            return this.bindIterableExpression(directiveInstance, propertyKey, itemNames, collectionExpr, context, viewRef);
        }

        // 2. Angular风格: let item of items
        const angularStyle = expr.match(/^\s*let\s+([^ ]+)\s+(?:of|in)\s+([^]+)(?:\s*;\s*([^ ]+)\s+as\s+([^ ]+))?$/);
        if (angularStyle) {
            collectionExpr = angularStyle[2].trim();
            itemNames = [angularStyle[1].trim()];
            if (angularStyle[3] && angularStyle[4]) {
                itemNames.push(angularStyle[4].trim())
            }
            return this.bindIterableExpression(directiveInstance, propertyKey, itemNames, collectionExpr, context, viewRef);
        }

    }

    private bindIterableExpression(directiveInstance: any, propertyKey: string, itemNames: string[], collectionExpr: string, context: any, viewRef: EmbeddedViewRef<any>) {
        // 添加防抖机制，避免无限循环
        let lastCollection: any = null;
        let updateScheduled = false;

        const updateCollection = () => {
            if (updateScheduled) return;
            updateScheduled = true;

            this.effect.run(() => {
                try {
                    const collection = this.evaluateExpression(collectionExpr, context, viewRef);

                    // 只有当集合真正发生变化时才赋值
                    if (!this.isEqual(collection, lastCollection)) {
                        directiveInstance[propertyKey] = collection;
                        lastCollection = collection;
                    }

                    // 如果有索引变量，也设置（只设置一次）
                    if (itemNames.length > 1 && !directiveInstance.trackBy) {
                        directiveInstance.trackBy = itemNames[1]; // 索引变量（如index）
                    }
                } catch (error) {
                    console.error('Error in bindIterableExpression:', error);
                } finally {
                    updateScheduled = false;
                }
            });
        };

        // 初始更新
        updateCollection();

        // 监听上下文变化，但使用防抖
        const originalRun = this.effect.run;
        this.effect.run = (fn: () => void) => {
            const result = originalRun.call(this.effect, fn);
            // 延迟执行更新，避免立即触发循环
            setTimeout(updateCollection, 0);
            return result;
        };
    }

    // 深度比较两个值是否相等
    private isEqual(a: any, b: any): boolean {
        if (a === b) return true;
        if (a === null || b === null) return false;
        if (typeof a !== typeof b) return false;

        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                if (!this.isEqual(a[i], b[i])) return false;
            }
            return true;
        }

        if (typeof a === 'object' && typeof b === 'object') {
            const aKeys = Object.keys(a);
            const bKeys = Object.keys(b);
            if (aKeys.length !== bKeys.length) return false;

            for (const key of aKeys) {
                if (!this.isEqual(a[key], b[key])) return false;
            }
            return true;
        }

        return false;
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

    // 修改 evaluateExpression 方法以正确处理模板上下文
    private evaluateExpression(expr: string, context: any, viewRef: EmbeddedViewRef<any>): any {
        try {
            const parts = expr.split('|').map(part => part.trim());
            if (parts.length <= 1) {
                // 简单表达式求值
                return new Function('ctx', `with(ctx){return ${expr}}`)(context);
            } else {
                const [expression, ...pipeNames] = this.parsePipes(parts);
                const pipes = pipeNames.reduce((obj, name) => {
                    obj[name] = viewRef.environment.get(name);
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


    private parseEventExpression(expr: string, context: any, viewRef: EmbeddedViewRef<any>): EventListener {
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
        const args = this.parseArguments(argsStr, context, viewRef);

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
                        return viewRef.query(`[#${arg}]`) ?? arg.split('.').reduce((obj, prop) => obj && obj[prop], context) ?? arg;
                    }
                    return arg;
                });
                return func.apply(funcTarget, resolvedArgs);
            };
        });
    }

    // 解析参数列表，支持字符串、数字、布尔值和变量引用
    private parseArguments(argsStr: string, context: any, viewRef: EmbeddedViewRef<any>): any[] {
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
                args.push(this.evaluateArg(currentArg.trim(), context, viewRef));
                currentArg = '';
            } else if (char === '"' || char === '\'') {
                quoteChar = char;
                currentArg += char;
            } else {
                currentArg += char;
            }
        }

        if (currentArg.trim()) {
            args.push(this.evaluateArg(currentArg.trim(), context, viewRef));
        }

        return args;
    }
    // 计算参数值 (字符串/数字/布尔值/变量引用)
    private evaluateArg(arg: string, context: any, viewRef: EmbeddedViewRef<any>): any {
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
        return this.evaluateExpression(arg, context, viewRef);
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