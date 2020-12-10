import { Injectable, lang, Type } from '@tsdi/ioc';
import { BootContext, BuildContext } from '@tsdi/boot';
import { IComponentBootContext, InternalViewRef, ViewRef } from './refs/view';
import { ComponentRef } from './refs/component';

@Injectable()
export class ComponentBuildContext extends BuildContext {

    get template() {
        return this.getOptions().template;
    }
}


@Injectable()
export class ComponentBootContext extends BootContext implements IComponentBootContext {

    private _runningTick: boolean = false;

    private _views: InternalViewRef[] = [];

    public readonly components: ComponentRef[] = [];

    public readonly componentTypes: Type[] = [];


    /**
     * Detaches a view from dirty checking again.
     */
    detachView(viewRef: ViewRef): void {
        const view = (viewRef as InternalViewRef);
        lang.remove(this._views, view);
        view.detachContext();
    }

    /**
     * Attaches a view so that it will be dirty checked.
     * The view will be automatically detached when it is destroyed.
     * This will throw if the view is already attached to a ViewContainer.
     */
    attachView(viewRef: ViewRef): void {
        const view = (viewRef as InternalViewRef);
        this._views.push(view);
        view.attachContext(this);
    }


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
    tick(): void {
        if (this._runningTick) {
            throw new Error('ApplicationRef.tick is called recursively');
        }

        try {
            this._runningTick = true;
            for (let view of this._views) {
                view.detectChanges();
            }
        } catch (e) {
            // Attention: Don't rethrow as it could cancel subscriptions to Observables!
            // this._zone.runOutsideAngular(() => this._exceptionHandler.handleError(e));
        } finally {
            this._runningTick = false;
        }
    }
}

