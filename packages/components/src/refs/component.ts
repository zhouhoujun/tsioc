import { Abstract, InvokeArguments, ReflectiveRef, Injector } from '@tsdi/ioc';
import { TemplateCompiler, TemplateCompilerOptions } from '../template/compiler';
import { ViewRef } from './view';

/**
 * ComponentRef.
 */
@Abstract()
export abstract class ComponentRef<T> {

    /**
     * injector of context.
     * 
     * 当前类注入的容器上下文的容器
     */
    abstract get injector(): Injector;
    /**
     * render component.
     *
     * @abstract
     * @memberof ComponentRef
     */
    abstract get compiler(): TemplateCompiler;

    /**
     * The host view defined by the template
     * for this component instance.
     */
    abstract get hostView(): ViewRef;

    /**
     * This component instance.
     */
    abstract get instance(): T;

    /**
     * render component.
     *
     * @abstract
     * @memberof ComponentRef
     */
    abstract render(): Promise<void>;

    /**
    * destroy this.
    */
    abstract destroy(): void;

    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    abstract onDestroy(callback: () => void): void;
}

/**
 * Component options.
 */
export interface ComponentOptions extends TemplateCompilerOptions, InvokeArguments {

}



/**
 * ComponentRef factory.
 */
@Abstract()
export abstract class ComponenFactory {
    /**
     * create ReflectiveRef of target type
     * @param type target type or target type def.
     * @param option target type invoke option {@link InvokeArguments}
     * @returns instance of {@link ReflectiveRef}
     */
    abstract create<T>(typeRef: ReflectiveRef<T>, option?: ComponentOptions): ComponentRef<T>;

}


