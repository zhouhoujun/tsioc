import { ComponentRef, Directive, OnDestroy, OnInit, ViewContainerRef } from '@tsdi/components';
import { Injectable, Type } from '@tsdi/ioc';
import { Router } from './router';

/** Renders the active route component into the nearest outlet. */
@Directive({
    selector: 'router-outlet, [routerOutlet]'
})
@Injectable()
export class RouterOutlet implements OnInit, OnDestroy {
    protected componentRef?: ComponentRef<any>;
    protected activeComponent?: Type<any>;
    protected subscription?: { unsubscribe(): void };

    constructor(protected viewContainer: ViewContainerRef, protected router: Router) {}

    onInit(): void {
        this.subscription = this.router.events.subscribe(event => {
            if (event?.type === 'NavigationEnd') {
                this.activate();
            }
        });
        this.activate();
    }

    onDestroy(): void {
        this.subscription?.unsubscribe();
        this.componentRef?.destroy();
        this.componentRef = undefined;
        this.activeComponent = undefined;
    }

    protected activate(): void {
        const component = this.router.activeRoute?.route?.component;
        this.componentRef?.destroy();
        this.componentRef = undefined;
        if (!component) {
            this.activeComponent = undefined;
            this.viewContainer.clear();
            return;
        }
        this.viewContainer.clear();
        this.activeComponent = component;
        this.componentRef = this.viewContainer.createComponent(component, {
            injector: this.viewContainer.injector
        });
    }
}
