import { Abstract, Exception, getDef, isObject } from '@tsdi/ioc';
import { TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { NodeType, RAttr, RElement, RNode, RText } from '../renderer/Node';
import { ViewRef, EmbeddedViewRef } from '../refs/view';
import { createEmbeddedViewRef } from './view';
import { TemplateParser } from '../template/parser';
import { ComponentDef } from '../refs/component';
import { COMPONENTS } from '../decorators/component';
import { EventEmitter } from '../EventEmitter';
import { DIRECTIVES } from '../decorators/directive';
import { DirectiveDef, DirectiveRef, Factoriable } from '../refs/directive';
import { createTemplateRef } from './template';
import { EnvironmentContext } from '../refs/environment';
import { ComputedMetadata } from '../decorators/computed';



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

        rootNodes.forEach(node => {
            components.forEach(r => {
                const nodes = node.querySelectorAll(r.selector);
                nodes?.forEach(n => {
                    if (compMap.has(n)) {
                        throw new Exception('has dup component selector')
                    }
                    compMap.set(n, r);
                })
            })
            directives.forEach(r => {
                const nodes = node.querySelectorAll(r.selector);
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
            })
        });


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


    private async processElement(el: RElement, attrs: RAttr[], context: any, viewRef: EmbeddedViewRef<any>, compMap: Map<RNode, ComponentDef>, dirMap: Map<RNode, DirectiveDef[]>, isContainer?: boolean) {
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
                    const attValue = this.evaluateExpression(value, context, viewRef);//context[value];
                    // 移除特殊属性处理，让指令来处理
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

        // 递归处理子节点
        if (!isContainer && el.childNodes.length > 0) {
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

        const el = node as RElement;

        const templateTag = this.options.templateTag || 'template';
        if (el.tagName === templateTag) {
            el.tagName = el.tagName.toLowerCase();
            const templateRef = createTemplateRef(el.childNodes, viewRef.environment.getElementRef(el), viewRef.environment);
            viewRef.environment.attachTemplate(templateRef);
            return;
        }

        const attrs = this.renderer.getAttributes(el);
        let isContainer = false;
        const componentDef = compMap.get(el);
        if (componentDef) {
            isContainer = true;
            await this.processComponent(el, componentDef, attrs, context, viewRef);
        }

        // // 获取并处理class和style属性作为指令
        // const classAttrs = attrs.filter(attr => attr.name === 'class');
        // const styleAttrs = attrs.filter(attr => attr.name === 'style');

        // // 处理class指令
        // classAttrs.forEach(attr => {
        //     if (attr.value && (attr.value.includes('{{') || attr.value.includes('}}'))) {
        //         // 创建v-class指令
        //         const vClassAttr = { name: 'v-class', value: attr.value.replace(/[{}]/g, '').trim() } as RAttr;
        //         this.processDirective(el, { selector: '[v-class]' } as DirectiveDef, vClassAttr, attrs, context, viewRef, environment);
        //     }
        // });

        // // 处理style指令
        // styleAttrs.forEach(attr => {
        //     if (attr.value && (attr.value.includes('{{') || attr.value.includes('}}'))) {
        //         // 创建v-style指令
        //         const vStyleAttr = { name: 'v-style', value: attr.value.replace(/[{}]/g, '').trim() } as RAttr;
        //         this.processDirective(el, { selector: '[v-style]' } as DirectiveDef, vStyleAttr, attrs, context, viewRef, environment);
        //     }
        // });

        const dirs = dirMap.get(node);

        // 优先处理指令组件
        if (dirs && dirs.length) {
            for (const dirDef of dirs) {
                if (dirDef.nodeType && dirDef.nodeType & NodeType.Container) {
                    isContainer = true;
                }
                await this.processDirective(el, dirDef, attrs, context, viewRef);
            }
            await this.processElement(el, attrs.filter(a => dirs.some(d => d.selector !== a.name)), context, viewRef, compMap, dirMap, isContainer);
        } else {
            await this.processElement(el, attrs, context, viewRef, compMap, dirMap, isContainer);
        }


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

    /**
     * Apply directive to element.
     *
     * @protected
     * @param {RElement} element
     * @param {any} directive
     * @param {any} attr
     * @param {any} environment
     * @memberof AbstractTemplateCompiler
     */
    protected async processDirective(el: RNode, directive: DirectiveDef, attrs: RAttr[], context: any, viewRef: EmbeddedViewRef<any>) {
        //提取指令名称和表达式
        const expr = attrs.find(a => a.name === directive.selector)?.value;
        const directiveName = directive.selector.startsWith('v-') ? directive.selector.slice(2) : directive.selector.slice(1);

        // 创建指令实例
        const directiveRef = this.createDirectiveRef(directive, el, viewRef);
        if (!directiveRef) throw new Exception(`directive ${directiveName} has not declaration!`);
        if (directiveRef) {
            viewRef.environment.attachDirective(directiveRef);
        }
        const attributes = directive.attributes ?? [];
        const directiveInstance = directiveRef.instance;
        // 设置指令值
        if (directiveInstance && typeof directiveInstance[directiveName] === 'function') {
            directiveInstance[directiveName](expr);
        } else if (directiveInstance && directiveName in directiveInstance) {
            (directiveInstance as any)[directiveName] = expr;
        }

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
                        if (directiveInstance[inputDef.propertyKey] instanceof EventEmitter) {
                            directiveInstance[inputDef.propertyKey].subscribe(handler);
                        } else if (!directiveInstance[inputDef.propertyKey]) {
                            directiveInstance[inputDef.propertyKey] = handler;
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
                        directiveInstance[inputDef.propertyKey] = attValue;
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
    protected createDirectiveRef(directive: DirectiveDef, node: RNode, viewRef: EmbeddedViewRef<any>): DirectiveRef<any> | null {
        // 实际应用中需要使用注入器创建指令实例
        // 这里简化处理
        try {
            // 从环境中获取必要的依赖
            const elementRef = viewRef.environment.getElementRef(node);
            // 创建指令实例并注入依赖
            return (directive as Factoriable).ƿfac?.(viewRef.environment, { elementRef }) as DirectiveRef<any> ?? null;
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
            // // 检查是否为计算属性访问
            // const computed = this.getComputedProperty(expr, context);
            // if (computed) {
            //     const cacheKey = `${context.constructor.name}-${expr}`;
            //     let cacheEntry = viewRef.computedCache.get(cacheKey);

            //     if (!cacheEntry) {
            //         // 创建新的缓存条目
            //         cacheEntry = { value: undefined, deps: new Set() };
            //         viewRef.computedCache.set(cacheKey, cacheEntry);
            //     }

            //     // 使用effect跟踪依赖并计算值
            //     return this.effect.run(() => {
            //         // 清除旧依赖
            //         cacheEntry!.deps.clear();

            //         // 计算新值
            //         const value = this.evaluateComputedExpression(computed, expr, context, viewRef);
            //         cacheEntry!.value = value;

            //         // 收集新依赖（这里需要实际实现依赖收集逻辑）
            //         this.trackDependencies(expr, context, cacheEntry!.deps);

            //         return value;
            //     });
            // }
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

    private getComputedProperty(expr: string, context: any): ComputedMetadata | undefined {
        // 检查上下文对象是否有该计算属性的元数据
        const propName = expr.trim();
        const cDef = getDef(context) as ComponentDef | DirectiveDef;
        return cDef?.computeds?.find(r=> r.propertyKey === propName);
    }

    private evaluateComputedExpression(computed: ComputedMetadata, expr: string, context: any, viewRef: EmbeddedViewRef<any>): any {
        // 计算属性表达式求值
        const compute = computed.compute;
        if (typeof compute === 'function') {
            return compute(context);
        }
        return new Function('ctx', `with(ctx){return ${computed.compute ?? expr}}`)(context);
    }

    private trackDependencies(expr: string, context: any, deps: Set<any>): void {
        // 实现依赖跟踪逻辑
        // 解析表达式，找出所有依赖的响应式属性
        const dependencies = this.parseDependencies(expr);
        dependencies.forEach(dep => {
            deps.add(dep);
        });
    }

    private parseDependencies(expr: string): string[] {
        // 简单的依赖解析，实际实现可能需要更复杂的表达式解析
        const propRegex = /([a-zA-Z_$][\w$]*)/g;
        const matches = expr.match(propRegex) || [];
        return [...new Set(matches)]; // 返回唯一的属性名
    }
}
