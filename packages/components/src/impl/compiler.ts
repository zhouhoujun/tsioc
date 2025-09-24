import { Abstract, Exception, InvocationContext, isObject } from '@tsdi/ioc';
import { TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { NodeType, RAttr, RElement, RNode, RText } from '../renderer/Node';
import { ViewRef } from '../refs/view';
import { RootViewRef } from './view';
import { TemplateParser } from '../template/parser';
import { ComponentDef } from '../refs/component';
import { COMPONENTS } from '../decorators/component';
import { EventEmitter } from '../EventEmitter';
import { ElementRef } from '../refs/element';
import { DIRECTIVES } from '../decorators/directive';
import { DirectiveDef, DirectiveRef, Factoriable } from '../refs/directive';



@Abstract()
export abstract class AbstractTemplateCompiler extends TemplateCompiler {

    protected abstract get options(): TemplateCompilerOptions;

    async compile(template: string, context: any, environment: InvocationContext): Promise<ViewRef> {
        // 使用模板解析器解析模板
        const nodes = environment.get(TemplateParser).parse(template, environment);

        const viewRef = new RootViewRef(nodes, context, this.effect);

        // 处理动态内容
        await this.walkNodes(viewRef.rootNodes ?? [], context, viewRef, environment);

        return viewRef;
    }

    private async walkNodes(nodes: RNode[], context: any, viewRef: RootViewRef, environment: InvocationContext) {
        for (const node of nodes) {
            if (node.nodeType === NodeType.Text || node.nodeType === NodeType.Comment) {
                this.processText(node as RText, context, viewRef, environment);
            } else {
                // ...解析模板逻辑...
                await this.processBindings(node, context, viewRef, environment);
            }
        }

    }


    private processElement(el: RElement, attrs: RAttr[], context: any, viewRef: RootViewRef, environment: InvocationContext) {
        // 处理属性
        attrs.forEach(({ name, value }) => {
            if (name.startsWith('#')) {
                const refId = name.substring(1);
                viewRef.registerNodeRef(refId, el);
            } else if (name.startsWith('@')) {
                // 事件绑定
                const eventName = name.substring(1);
                const handler = this.parseEventExpression(value, context, viewRef, environment);
                el.addEventListener(eventName, handler);
            } else if (name.startsWith(':')) {
                // 属性绑定
                const propName = name.substring(1);
                this.effect.run(() => {
                    const attValue = context[value];
                    // 移除特殊属性处理，让指令来处理
                    el.setAttribute(propName, attValue);
                });
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
        if (el.childNodes.length > 0) {
            this.walkNodes(el.childNodes, context, viewRef, environment);
        }
    }

    private processText(node: RText, context: any, viewRef: RootViewRef, environment: InvocationContext) {
        const text = node.textContent;
        if (!text) return;

        const [open, close] = this.options.delimiters || ['{{', '}}'];
        const regex = new RegExp(`${open}(.*?)${close}`, 'g');
        const matches = text.matchAll(regex);

        for (const match of matches) {
            const expr = match[1].trim();
            this.effect.run(() => {
                const value = this.evaluateExpression(expr, context, viewRef, environment);
                node.textContent = text.replace(regex, value);
            });
        }
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

    private evaluateExpression(expr: string, context: any, viewRef: RootViewRef, environment: InvocationContext): any {
        try {
            // 检查是否为计算属性访问
            const isComputed = this.isComputedProperty(expr, context);
            if (isComputed) {
                const cacheKey = `${context.constructor.name}-${expr}`;
                let cacheEntry = viewRef.computedCache.get(cacheKey);

                if (!cacheEntry) {
                    // 创建新的缓存条目
                    cacheEntry = { value: undefined, deps: new Set() };
                    viewRef.computedCache.set(cacheKey, cacheEntry);
                }

                // 使用effect跟踪依赖并计算值
                return this.effect.run(() => {
                    // 清除旧依赖
                    cacheEntry!.deps.clear();

                    // 计算新值
                    const value = this.evaluateComputedExpression(expr, context, viewRef, environment);
                    cacheEntry!.value = value;

                    // 收集新依赖（这里需要实际实现依赖收集逻辑）
                    this.trackDependencies(expr, context, cacheEntry!.deps);

                    return value;
                });
            }
            const parts = expr.split('|').map(part => part.trim());
            if (parts.length <= 1) {
                // 简单表达式求值
                return new Function('ctx', `with(ctx){return ${expr}}`)(context);
            } else {
                const [expression, ...pipeNames] = this.parsePipes(parts);
                const pipes = pipeNames.reduce((obj, name) => {
                    obj[name] = environment.get(name);
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

    protected async processBindings(node: RNode, context: any, viewRef: RootViewRef, environment: InvocationContext, processChild?: (node: any) => void) {
        if (node.nodeType === NodeType.Element) {
            const el = node as RElement;


            const attrs = this.renderer.getAttributes(el);
            const componentDef = this.getComponentBySelector(el, environment);
            if (componentDef) {
                await this.processComponent(el, componentDef, attrs, context, viewRef, environment);
            }

            // 获取并处理class和style属性作为指令
            const classAttrs = attrs.filter(attr => attr.name === 'class');
            const styleAttrs = attrs.filter(attr => attr.name === 'style');

            // 处理class指令
            classAttrs.forEach(attr => {
                if (attr.value && (attr.value.includes('{{') || attr.value.includes('}}'))) {
                    // 创建v-class指令
                    const vClassAttr = { name: 'v-class', value: attr.value.replace(/[{}]/g, '').trim() } as RAttr;
                    this.processDirective(el, { selector: '[v-class]' } as DirectiveDef, vClassAttr, attrs, context, viewRef, environment);
                }
            });

            // 处理style指令
            styleAttrs.forEach(attr => {
                if (attr.value && (attr.value.includes('{{') || attr.value.includes('}}'))) {
                    // 创建v-style指令
                    const vStyleAttr = { name: 'v-style', value: attr.value.replace(/[{}]/g, '').trim() } as RAttr;
                    this.processDirective(el, { selector: '[v-style]' } as DirectiveDef, vStyleAttr, attrs, context, viewRef, environment);
                }
            });

            const dirs = this.getDirectiveBySelector(node, attrs, environment);

            // 优先处理指令组件
            if (dirs && dirs.length) {
                for (const paris of dirs) {
                    await this.processDirective(el, paris[1], paris[0], attrs, context, viewRef, environment);
                }
                this.processElement(el, attrs.filter(a => dirs.some(d => d[0] !== a)), context, viewRef, environment);
            } else {
                this.processElement(el, attrs, context, viewRef, environment);
            }

        }
    }

    protected getComponentBySelector(node: RElement, environment: InvocationContext) {
        if (node.nodeType === NodeType.Element && node.tagName) {
            const components = environment.get(COMPONENTS);
            const compfac = components?.find(c => c.name === node.tagName);
            if (compfac) return compfac;
        }
        return null;
    }


    private async processComponent(el: RElement, componentDef: ComponentDef, attrs: RAttr[], context: any, viewRef: RootViewRef, environment: InvocationContext) {

        const componentRef = (componentDef as Factoriable).ƿfac?.(environment, {});

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
                        const handler = this.evaluateExpression(value, context, viewRef, environment);
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
                        if (propName === 'class' || propName === 'style') {
                            this.handleSpecialAttribute(el, propName, attValue);
                        } else {
                            componentRef.instance[inputDef.propertyKey] = attValue;
                        }
                    });
                }
            }
        });


        // 处理组件事件绑定
        const events: Record<string, EventListener> = {};
        attrs.forEach(({ name, value }) => {
            if (name.startsWith('@')) {
                const eventName = name.substring(1);
                events[eventName] = this.parseEventExpression(value, context, viewRef, environment);
            }
        });

        // 渲染组件并替换当前节点
        await componentRef.render();

    }


    protected getDirectiveBySelector(node: RNode, attrs: RAttr[], environment: InvocationContext): Array<[RAttr, DirectiveDef]> | null {
        // 检查是否有指令属性
        const directiveAttrs = attrs.filter(attr =>
            attr.name.startsWith('v-') ||
            attr.name.startsWith('*')
        );

        if (!directiveAttrs.length) {
            return null;
        }

        // 获取已注册的指令
        const directives = environment.get(DIRECTIVES) || [];

        const dirs: Array<[RAttr, DirectiveDef]> = [];
        // 处理每个指令
        for (const attr of directiveAttrs) {
            // 查找匹配的指令
            const directive = directives.find(d => {
                const selector = d.selector;
                if (selector.startsWith('[')) {
                    // 处理属性选择器
                    const attrName = selector.slice(1, -1);
                    return attrName === attr.name;
                }
                return false;
            });

            if (directive) {
                // 实例化并应用指令
                dirs.push([attr, directive])
            }
        }
        return dirs;
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
    protected async processDirective(el: RElement, directive: DirectiveDef, attr: RAttr, attrs: RAttr[], context: any, viewRef: RootViewRef, environment: InvocationContext) {
        //提取指令名称和表达式
        const expr = attr.value;
        const directiveName = attr.name.startsWith('v-') ? attr.name.slice(2) : attr.name.slice(1);

        // 创建指令实例
        const directiveRef = this.createDirectiveRef(directive, el, environment);
        if (!directiveRef) throw new Exception(`directive ${directiveName} has not declaration!`);
        const attributes = directive.attributes ?? [];
        const directiveInstance = directiveRef.instance;
        // 设置指令值
        if (directiveInstance && typeof directiveInstance.instance[directiveName] === 'function') {
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
                        const handler = this.evaluateExpression(value, context, viewRef, environment);
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
                        if (propName === 'class' || propName === 'style') {
                            this.handleSpecialAttribute(el, propName, attValue);
                        } else {
                            directiveInstance[inputDef.propertyKey] = attValue;
                        }
                    });
                }
            }
        });


        // 处理组件事件绑定
        const events: Record<string, EventListener> = {};
        attrs.forEach(({ name, value }) => {
            if (name.startsWith('@')) {
                const eventName = name.substring(1);
                events[eventName] = this.parseEventExpression(value, context, viewRef, environment);
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
     * @param {RElement} element
     * @param {any} environment
     * @returns {*}
     * @memberof AbstractTemplateCompiler
     */
    protected createDirectiveRef(directive: DirectiveDef, element: RElement, environment: InvocationContext): DirectiveRef<any> | null {
        // 实际应用中需要使用注入器创建指令实例
        // 这里简化处理
        try {
            // 从环境中获取必要的依赖
            const elementRef = new ElementRef(element);

            // 创建指令实例并注入依赖
            return (directive as Factoriable).ƿfac?.(environment, { elementRef }) as DirectiveRef<any> ?? null;
        } catch (err) {
            console.error('Failed to create directive instance:', err);
            return null;
        }
    }


    private parseEventExpression(expr: string, context: any, viewRef: RootViewRef, environment: InvocationContext): EventListener {
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
        const args = this.parseArguments(argsStr, context, viewRef, environment);

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
    private parseArguments(argsStr: string, context: any, viewRef: RootViewRef, environment: InvocationContext): any[] {
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
                args.push(this.evaluateArg(currentArg.trim(), context, viewRef, environment));
                currentArg = '';
            } else if (char === '"' || char === '\'') {
                quoteChar = char;
                currentArg += char;
            } else {
                currentArg += char;
            }
        }

        if (currentArg.trim()) {
            args.push(this.evaluateArg(currentArg.trim(), context, viewRef, environment));
        }

        return args;
    }

    // 计算参数值 (字符串/数字/布尔值/变量引用)
    private evaluateArg(arg: string, context: any, viewRef: RootViewRef, environment: InvocationContext): any {
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
        return this.evaluateExpression(arg, context, viewRef, environment);
    }

    private isComputedProperty(expr: string, context: any): boolean {
        // 检查上下文对象是否有该计算属性的元数据
        const propName = expr.trim();
        return !!Reflect.getMetadata('computed', context.constructor.prototype, propName);
    }

    private evaluateComputedExpression(expr: string, context: any, viewRef: RootViewRef, environment: InvocationContext): any {
        // 计算属性表达式求值
        return new Function('ctx', `with(ctx){return ${expr}}`)(context);
    }

    private trackDependencies(expr: string, context: any, deps: Set<any>): void {
        // 实现依赖跟踪逻辑
        // 这里需要解析表达式，找出所有依赖的响应式属性
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