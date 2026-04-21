import { CompilerOptions } from '../template/compiler';
import { RAttr, RElement, RNode, RText } from '../renderer/Node';
import { ComponentDef } from '../refs/component';
import { DirectiveDef } from '../refs/directive';
import { NodeInjector } from '../refs/injector';
import { Renderer } from '../renderer/Renderer';
import { Bindings, NodeFactory } from '../refs/template';
import { ReactiveEffect } from '../effect';
export type Rendering<T extends RNode> = (renderer: Renderer, effect: ReactiveEffect, injector: NodeInjector, context: any) => T | null;
export interface RendererOptions {
    templateTag?: string;
    delimiter: RegExp;
    textFactory: (node: RText, options: CompilerOptions) => Rendering<RText>;
    elementFactory: (node: RElement, renderer: Renderer, options: CompilerOptions, rendererOptions: RendererOptions) => Rendering<RElement>;
    attributeFactory: (attr: RAttr) => (element: RElement, renderer: Renderer) => void;
    componentFactory: (node: RElement, renderer: Renderer, componentDef: ComponentDef, attrs: RAttr[], bindings: any[]) => Rendering<RElement>;
    templateFactory: (node: RElement, renderer: Renderer, attrs: RAttr[], bindings: any[], options: CompilerOptions, rendererOptions: RendererOptions) => Rendering<RElement>;
    bindDirective: (element: RElement, directive: DirectiveDef, attrs: RAttr[], effect: ReactiveEffect, injector: NodeInjector, context: any, delimiter: RegExp) => void;
}
/**
 * 将模板节点编译为 factory function
 * @param nodes 模板节点
 * @param options 编译选项
 * @param compileNodeToFactory 节点编译函数
 * @returns factory function
 */
export declare function compileToFactory<C>(nodes: RNode[], renderer: Renderer, options: CompilerOptions, rendererOptions: RendererOptions): NodeFactory<C>;
/**
 * 编译文本节点为工厂函数
 * @param node 文本节点
 * @returns 文本节点工厂函数
 */
export declare function compileTextToFactory(node: RText): Rendering<RText>;
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
export declare function compileElementToFactory(node: RElement, renderer: Renderer, options: CompilerOptions, rendererOptions: RendererOptions): Rendering<RElement>;
/**
 * 编译属性为应用函数
 * @param attr 属性
 * @returns 属性应用函数
 */
export declare function compileAttributeToFactory(attr: RAttr): (element: RElement, renderer: Renderer) => void;
/**
 * 编译组件为工厂函数
 * @param node 元素节点
 * @param componentDef 组件定义
 * @param attrs 属性列表
 * @param bindings 绑定列表
 * @returns 组件工厂函数
 */
export declare function compileComponentToFactory(node: RElement, renderer: Renderer, componentDef: ComponentDef, attrs: RAttr[], bindings: any[]): (renderer: Renderer, effect: ReactiveEffect, injector: NodeInjector) => RElement | null;
/**
 * 编译模板为工厂函数
 * @param node 模板节点
 * @param attrs 属性列表
 * @param bindings 绑定列表
 * @param options 编译选项
 * @param compileNodeToFactory 节点编译函数
 * @returns 模板工厂函数
 */
export declare function compileTemplateToFactory(node: RElement, renderer: Renderer, attrs: RAttr[], bindings: any[], options: CompilerOptions, rendererOptions: RendererOptions): (renderer: Renderer, effect: ReactiveEffect, injector: NodeInjector, context: any) => RElement | null;
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
export declare function applyDirectiveToElement(element: RElement, directive: DirectiveDef, attrs: RAttr[], effect: ReactiveEffect, injector: NodeInjector, context: any, delimiter: RegExp): void;
/**
 * 遍历节点创建绑定工厂
 * @param nodes 节点列表
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export declare function walkNodesForBindings<C>(nodes: RNode[], renderer: Renderer, delimiter: RegExp): void;
/**
 * 生成节点绑定
 * @param nodes 节点列表
 * @param directives 指令定义列表
 * @param components 组件定义列表
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 * @param walkNodesForBindings 节点遍历函数
 */
export declare function generateNodeBindings<C>(nodes: RNode[], directives: DirectiveDef[], components: ComponentDef[], renderer: Renderer, delimiter: RegExp, nodesForBindings?: ((nodes: RNode[], renderer: Renderer, delimiter: RegExp) => void), customElements?: DirectiveDef[]): void;
/**
 * 添加绑定到节点
 * @param node 节点
 * @param factory 绑定工厂函数
 */
export declare function binding(node: RNode, factory: Bindings): void;
/**
 * 匹配分隔符表达式
 * @param expr 表达式字符串
 * @param delimiter 分隔符正则表达式
 * @returns 匹配结果数组
 */
export declare function matchDelimiter(expr: string, delimiter: RegExp): RegExpExecArray[] | null;
/**
 * 创建文本节点的绑定工厂
 * @param node 文本节点
 * @param expr 表达式
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export declare function bindingText(node: RText, expr: string | null, renderer: Renderer, delimiter: RegExp): void;
/**
 * 创建模板节点的绑定工厂
 * @param element 元素节点
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export declare function bindingTemplate(element: RElement, renderer: Renderer, delimiter: RegExp): void;
/**
 * 创建元素节点的绑定工厂
 * @param element 元素节点
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export declare function bindingElement<C>(element: RElement, renderer: Renderer, delimiter: RegExp): void;
/**
 * 创建属性绑定工厂
 * @param element 元素节点
 * @param attrs 属性列表
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export declare function bindingAtrrbutes(element: RNode, attrs: RAttr[], renderer: Renderer, delimiter: RegExp): void;
/**
 * 创建事件绑定工厂
 * @param element 元素节点
 * @param attrName 属性名
 * @param expr 表达式
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export declare function bindingEvent(element: RNode, attrName: string, expr: string, renderer: Renderer, delimiter: RegExp): void;
/**
 * 创建属性绑定工厂
 * @param element 元素节点
 * @param attrName 属性名
 * @param expr 表达式
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export declare function bindingProperty(element: RNode, attrName: string, expr: string, renderer: Renderer, delimiter: RegExp): void;
/**
 * 创建插值表达式绑定工厂
 * @param element 元素节点
 * @param attrName 属性名
 * @param expr 表达式
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export declare function bindingInterpolationFactory(element: RNode, attrName: string, expr: string, renderer: Renderer, delimiter: RegExp): void;
/**
 * 创建双向绑定工厂
 * @param element 元素节点
 * @param prop 属性名
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export declare function createModelBindingFactory(element: RNode, prop: string, renderer: Renderer, delimiter: RegExp): void;
/**
 * 创建组件绑定工厂
 * @param element 元素节点
 * @param componentDef 组件定义
 * @param attrs 属性列表
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export declare function bindingComponentFactory(element: RElement, componentDef: ComponentDef, attrs: RAttr[], renderer: Renderer, delimiter: RegExp): void;
/**
 * 创建指令绑定工厂
 * @param element 元素节点
 * @param directiveDef 指令定义
 * @param attrs 属性列表
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export declare function bindingDirectiveFactory(element: RElement, directiveDef: DirectiveDef, attrs: RAttr[], renderer: Renderer, delimiter: RegExp): void;
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
export declare function processComponentAttribute(componentRef: any, attrName: string, expr: string, context: any, effect: ReactiveEffect<any>, injector: NodeInjector, delimiter: RegExp): void;
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
export declare function bindingDirective(node: RNode, dirDef: DirectiveDef, selectors: string[], attrs: RAttr[], renderer: Renderer, delimiter: RegExp, templateNodes?: RNode[], parentNode?: RNode | null): void;
/**
 * 处理条件指令组
 * @param el 元素节点
 * @param dirDef 指令定义
 * @param selectors 选择器列表
 * @param attrs 属性列表
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export declare function processConditionalBinding(el: RNode, dirDef: DirectiveDef, selectors: string[], attrs: RAttr[], renderer: Renderer, delimiter: RegExp): void;
/**
 * 处理列表指令
 * @param el 元素节点
 * @param dirDef 指令定义
 * @param selectors 选择器列表
 * @param attrs 属性列表
 * @param renderer 渲染器
 * @param delimiter 分隔符正则表达式
 */
export declare function processIterableBinding(el: RNode, dirDef: DirectiveDef, selectors: string[], attrs: RAttr[], renderer: Renderer, delimiter: RegExp): void;
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
export declare function processDirectiveAttributes(directiveRef: any, directiveDef: DirectiveDef, selectors: string[], attrs: RAttr[], context: any, effect: ReactiveEffect<any>, injector: NodeInjector, delimiter: RegExp): void;
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
export declare function evaluateDelimiterExpression(text: string, context: any, effect: ReactiveEffect<any>, matches: RegExpExecArray[], update: (text: string) => void, injector: NodeInjector, delimiter: RegExp): void;
/**
 * 使用环境上下文评估表达式
 * @param expr 表达式
 * @param context 上下文
 * @param injector 环境上下文
 * @param delimiter 分隔符正则表达式
 * @returns 评估结果
 */
export declare function evaluateExpression(expr: string, context: any, injector: NodeInjector, delimiter: RegExp): any;
/**
 * 使用环境上下文解析事件表达式
 * @param expr 表达式
 * @param context 上下文
 * @param effect 响应式效果
 * @param injector 环境上下文
 * @param delimiter 分隔符正则表达式
 * @returns 事件监听器
 */
export declare function parseEventExpression(expr: string, context: any, effect: ReactiveEffect, injector: NodeInjector, delimiter: RegExp): EventListener;
/**
 * 创建容器元素
 * @param renderer 渲染器
 * @param text 文本内容
 * @returns 容器元素
 */
export declare function createContainer(renderer: Renderer, text?: string): RElement;
/**
 * 转换为匹配名称列表
 * @param attrName 属性名
 * @returns 匹配名称列表
 */
export declare function toMatchNames(attrName: string): string[];
/**
 * 驼峰命名转换为短横线命名
 * @param str 字符串
 * @returns 转换后的字符串
 */
export declare function camelToKebab(str: string): string;
