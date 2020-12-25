import { IBootContext } from "@tsdi/boot";
import { Type } from "@tsdi/ioc";
import { ComponentRef } from "./component";
import { ElementRef } from "./element";
import { TemplateRef } from "./template";
import { ViewRef } from "./view";

/**
 * component boot context.
 */
export interface IComponentBootContext extends IBootContext {

    readonly components: ComponentRef[];

    readonly componentTypes: Type[];
    /**
     * Detaches a view from dirty checking again.
     */
    detachView(viewRef: ViewRef): void;
    /**
     * attach view.
     * @param viewRef 
     */
    attachView(viewRef: ViewRef): void;
    /**
     * Invoke this method to explicitly process change detection and its side-effects.
     *
     * In development mode, `tick()` also performs a second change detection cycle to ensure that no
     * further changes are detected. If additional changes are picked up during this second cycle,
     * bindings in the app have side-effects that cannot be resolved in a single change detection
     * pass.
     * In this case, Angular throws an error, since an Angular application can only have one change
     * detection pass during which all change detection must complete.
     */
    tick(): void;

    /**
     * serialize curr state.
     */
    serialize(element?: ComponentRef | TemplateRef | ElementRef): string;

}

/**
 * internal view ref.
 */
export interface InternalViewRef extends ViewRef {
    /**
     * detach form app boot context.
     */
    detachContext(): void;
    /**
     * attach to app boot context.
     * @param ctx
     */
    attachContext(ctx: IComponentBootContext): void;
}
