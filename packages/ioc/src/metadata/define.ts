import { HandlerFn } from '../handlers/handler';
import { Resolve } from '../injector';
import { InvocationFactory } from '../invocation';
import { IocContext, RuntimeContext } from '../lifescope/context';
import { ClassRef } from './class';

/**
 * decorator context.
 */
export interface DecorContext<T = any> {
    readonly define: DecorDefine<T>,
    readonly target: any;
    readonly classRef: ClassRef;
    readonly options: DecoratorOption<any>
}


/**
 * decorator def hanldes.
 */
export interface DecorDefHandles<T = any> {
    /**
     * class decorator def handle.
     */
    class?: HandlerFn<DecorContext<T>, void, IocContext> | HandlerFn<DecorContext<T>, void, IocContext>[];
    /**
     * method decorator def handle.
     */
    method?: HandlerFn<DecorContext<T>, void, IocContext> | HandlerFn<DecorContext<T>, void, IocContext>[];
    /**
     * property decorator def handle.
     */
    property?: HandlerFn<DecorContext<T>, void, IocContext> | HandlerFn<DecorContext<T>, void, IocContext>[];
    /**
     * parameter decorator def handle.
     */
    parameter?: HandlerFn<DecorContext<T>, void, IocContext> | HandlerFn<DecorContext<T>, void, IocContext>[];
}

/**
 * design action scope hanldes.
 * raise handles order by beforeAnnoation -> class -> property -> method -> afterAnnoation
 */
export interface DesignScopeHandles<T> {
    /**
     * decorator BeforeAnnoation action handles.
     * raise handles order by beforeAnnoation -> property -> method -> afterAnnoation
     */
    beforeAnnoation?: HandlerFn<T, void, IocContext> | HandlerFn<T, void, IocContext>[];

    /**
     * decorator Property action handles.
     * raise handles order by beforeAnnoation -> property -> method -> afterAnnoation
     */
    property?: HandlerFn<T, void, IocContext> | HandlerFn<T, void, IocContext>[];

    /**
     * decorator Method action handles.
     * raise handles order by beforeAnnoation -> class -> property -> method -> afterAnnoation
     */
    method?: HandlerFn<T, void, IocContext> | HandlerFn<T, void, IocContext>[];

    /**
     * decorator AfterAnnoation action handles.
     * raise handles order by beforeAnnoation -> property -> method -> afterAnnoation
     */
    afterAnnoation?: HandlerFn<T, void, IocContext> | HandlerFn<T, void, IocContext>[];
}

/**
 * runtime action scope hanldes.
 * raise handles order by property -> method -> class
 */
export interface RuntimeScopeHandles<T> {
    /**
     * decorator Property action handles.
     * raise handles order by property -> method -> class
     */
    property?: HandlerFn<T, void, RuntimeContext> | HandlerFn<T, void, RuntimeContext>[];

    /**
     * decorator Method action handles.
     * raise handles order by property -> method -> class
     */
    method?: HandlerFn<T, void, RuntimeContext> | HandlerFn<T, void, RuntimeContext>[];

    /**
     * decorator Class action handles.
     * raise handles order by  property -> method -> class
     */
    class?: HandlerFn<T, void, RuntimeContext> | HandlerFn<T, void, RuntimeContext>[];

}


/**
 * decorator register options.
 */
export interface DecorRegisterOption<T = any> {
    /**
     * decorator basic action type.
     */
    actionType?: ActionType;
    /**
     * set def handles.
     * raise when init decorator metadate of Type.
     */
    def?: DecorDefHandles<T>;
    /**
     * set design action scope handles.
     * raise when Type inject.
     * raise design handles order by beforeAnnoation -> class -> property -> method -> afterAnnoation
     */
    design?: DesignScopeHandles<ClassRef>
    /**
     * set runtime action scope handles.
     * raise when resolve instance of Type.
     * raise runtime handles order by beforeConstructor -> afterConstructor -> property -> method -> class
     */
    runtime?: RuntimeScopeHandles<ClassRef>;
}

/**
 * metadata factory. parse args to metadata.
 */
export interface MetadataFactory<T = any> {
    /**
     * is metadata or not.
     */
    isMatadata?(arg: any): boolean;
    /**
     * parse args as metadata props.
     * @param args
     */
    props?(...args: any[]): Partial<T>;
    /**
     * append metadata.
     * @param metadata
     */
    appendProps?(metadata: T): void;
    /**
     * init decor context.
     */
    init?: (ctx: DecorContext<T>) => void;
    /**
     * after init decor context.
     */
    afterInit?: (ctx: DecorContext<T>) => void;
    /**
     * set invocation factory.
     */
    factory?: Resolve<InvocationFactory>;
}

/**
 * decorator option.
 */
export interface DecoratorOption<T> extends MetadataFactory<T>, DecorRegisterOption<T> { }


/**
 * create decorator define.
 * @param name 
 * @param decor 
 * @param metadata 
 * @param decorType 
 * @param options 
 * @param propertyKey 
 * @param parameterIndex 
 * @returns decorator define
 */
export function toDefine<T>(decor: DecoratorFn, metadata: T, decorType: DecoratorType, options: DecoratorOption<any>, propertyKey?: string, parameterIndex?: number): DecorDefine<T> {

    return {
        decor,
        propertyKey: propertyKey!,
        parameterIndex,
        decorType,
        metadata,
        actionType: options.actionType
    }
}


/**
 * decorator funcation.
 */
export interface DecoratorFn extends Function {
    /**
     * decorator name.
     */
    decorator?: string;
    /**
     * decorator name
     */
    toString(): string;
    /**
     * get decorator handlers.
     * @param type decorator type.
     */
    getHandler?(type: DecoratorType): HandlerFn<DecorContext> | undefined;
    /**
     * get decorator runtime handlers.
     * @param type decorator type.
     */
    getRuntimeHandler?(type: DecoratorScope): HandlerFn<ClassRef> | undefined;
    /**
     * get decorator design handlers.
     * @param type decorator type.
     */
    getDesignHandler?(type: DecoratorScope): HandlerFn<ClassRef> | undefined;
}


/**
 * auto run define.
 */
export interface RunableDefine {
    /**
     * the method as runnable.
     */
    propertyKey: string;
    /**
     * run order.
     */
    order?: number;
    // /**
    //  * runnable invoke args.
    //  */
    // args?: InvokeArguments<any>;
    /**
     * is auto run when created instance.
     */
    auto?: boolean;
    /**
     * decorator type.
     */
    decorType?: DecoratorType;
}

export type DecorMemberType = 'property' | 'method' | 'parameter';
export type DecoratorType = 'class' | DecorMemberType;


/**
 * decorator scopes.
 *
 * Annoation: annoation actions for design time.
 * AfterAnnoation: after annoation actions for design time.
 */
export type DecoratorScope = DecoratorType
    | 'beforeAnnoation' | 'afterAnnoation';

export const ctorName = 'constructor';
export namespace Decors {
    export const CLASS = 'class';
    export const property = 'property';
    export const method = 'method';
    export const parameter = 'parameter';
    export const beforeAnnoation = 'beforeAnnoation';
    export const afterAnnoation = 'afterAnnoation';
}


export enum ActionType {
    inject = 0b0001,
    annoation = 0b0010,
    declaration = 0b0100,
    runnable = 0b1000,
    providers = 0b10000,
    module = 0b100000,
    component = 0b1000000,
    directive = 0b10000000,

}

/**
 * decorator define.
 */
export interface DecorDefine<T = any> {
    /**
     * decorator Fn
     */
    readonly decor: DecoratorFn;
    /**
     * current decorator type.
     */
    readonly decorType: DecoratorType;
    /**
     * action type.
     */
    actionType?: ActionType;
    /**
     * property key.
     */
    propertyKey: string;
    /**
     * paramter index.
     */
    readonly parameterIndex?: number;
    /**
     * decorator metadata.
     */
    readonly metadata: T;
}
