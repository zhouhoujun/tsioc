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
    protected activeUrl?: string;
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
        this.activeUrl = undefined;
    }

    /** Remove nodes left by previous outlet render passes. */
    protected clearAnchor(): void {
        const host = this.viewContainer?.element?.nativeElement as any;
        if (!host || typeof host.removeChild !== 'function') {
            return;
        }
        while (host.firstChild) {
            host.removeChild(host.firstChild);
        }
    }

    protected activate(): void {
        const leaf = this.router.activeLeaf;
        const component = leaf?.route?.component;
        const url = leaf?.url;
        const host = this.viewContainer?.element?.nativeElement as any;
        if (component && host?.getAttribute?.('data-route-url') === url) {
            return;
        }
        if (component && host?.setAttribute) {
            host.setAttribute('data-route-url', String(url || ''));
        } else if (host?.removeAttribute) {
            host.removeAttribute('data-route-url');
        }
        if (component && this.componentRef && this.activeComponent === component && this.activeUrl === url) {
            return;
        }
        this.activeUrl = url;
        this.componentRef?.destroy();
        this.componentRef = undefined;
        if (!component) {
            this.activeComponent = undefined;
            this.clearAnchor();
            this.viewContainer.clear();
            return;
        }
        this.clearAnchor();
        this.viewContainer.clear();
        this.activeComponent = component;
        this.componentRef = this.viewContainer.createComponent(component, {
            injector: this.viewContainer.injector
        });
    }
}
