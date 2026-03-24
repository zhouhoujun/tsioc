import { Abstract, ClassRef, AbstractType, InvocationFactory, InvocationOptions, AbstractInvocation, TypeDef, ModuleType, Provider } from '@tsdi/ioc';
import { AttributeMetadata } from '../decorators/atteribute';
import { SchemaMetadata } from '../template/schema';
import { ElementRef } from './element';
import { NodeInjector } from './injector';
import { ComputedMetadata } from '../decorators/computed';
import { noReact } from '../effect';
import { TemplateRef } from './template';

export const factoryKey = 'ƿfac';

/**
 * 指令类型枚举
 */
export enum DirectiveType {
    /** 普通指令 */
    Normal = 0,
    /** 条件指令 */
    Conditional = 2,
    /** 列表指令 */
    Iterable = 4,

    Component = 8,
}

export interface DirectiveDef<T = any> extends TypeDef<T>, Factoriable<T> {
    imports?: ModuleType[],
    selector: string;
    styles?: string[];
    styleUrls?: string[];
    // states?: StateMetadata[];
    attributes?: AttributeMetadata[];
    computeds?: ComputedMetadata[];
    schemas?: SchemaMetadata[];

    /**
     * 指令优先级，数字越大优先级越高
     * 默认：0
     */
    priority?: number;

    /**
     * 指令类型
     * 默认：Normal
     */
    dirType?: DirectiveType;

    /**
     * 指令依赖的其他指令选择器
     */
    requires?: string[];
}

export interface Factoriable<T = any> {
    ƿfac?: (ctx: NodeInjector, options: DirectiveOptions) => T;
}

/**
 * DirectiveRef.
 */
@Abstract()
export abstract class DirectiveRef<T> extends AbstractInvocation<T, DirectiveOptions, NodeInjector> {

    [noReact] = true;

    /**
     * The host view defined by the template
     * for this component instance.
     */
    abstract get elementRef(): ElementRef;

    /**
     * render component.
     *
     * @abstract
     * @memberof ComponentRef
     */
    render?(): Promise<void>;

    /**
     * 指令初始化完成后调用
     */
    onInit?(): void;
}

/**
 * Component options.
 */
export interface DirectiveOptions extends InvocationOptions {

    elementRef?: ElementRef;

    templateRef?: TemplateRef<any>;
    /**
     * 指令所在节点的所有属性
     */
    attributes?: any[];
    /**
     * 指令所在节点的上下文
     */
    context?: any;
    scheduler?: (fn: Function) => void;
    /**
     * 视图引用
     */
    viewRef?: any;
}

/**
 * ComponentRef factory.
 */
@Abstract()
export abstract class DirectiveFactory<TOpts extends DirectiveOptions = DirectiveOptions> implements InvocationFactory<TOpts> {
    /**
     * create ReflectiveRef of target type
     * @param type target type or target type def.
     * @param option target type invoke option {@link DirectiveOptions}
     * @returns instance of {@link DirectiveRef}
     */
    abstract create<T>(type: AbstractType<T> | ClassRef<T> | DirectiveDef<T>, option?: TOpts): DirectiveRef<T>;
}