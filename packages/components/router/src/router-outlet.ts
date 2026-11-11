import { ComponentRef, Directive, OnDestroy, OnInit, ViewContainerRef } from '@tsdi/components';
import { createInjector, Inject, Injectable, Optional, Type } from '@tsdi/ioc';
import { ACTIVATED_ROUTE, ActivatedRouteSnapshot, ROUTE_OUTLET_DEPTH, Router } from './router';

/**
 * Renders the route component owned by this outlet level.
 *
 * The root outlet renders the root route component (skipping component-less
 * routes). A nested outlet inside that component renders the child route, so
 * layouts and feature shells can expose their own `<router-outlet>` just like
 * Angular.
 */
@Directive({
    selector: 'router-outlet, [routerOutlet]'
})
@Injectable()
export class RouterOutlet implements OnInit, OnDestroy {
    protected componentRef?: ComponentRef<any>;
    protected activeComponent?: Type<any>;
    protected activeUrl?: string;
    protected subscription?: { unsubscribe(): void };

    constructor(
        protected viewContainer: ViewContainerRef,
        protected router: Router,
        @Optional() @Inject(ACTIVATED_ROUTE) protected parentRoute?: ActivatedRouteSnapshot | null,
        @Optional() @Inject(ROUTE_OUTLET_DEPTH) protected depth?: number
    ) {}

    onInit(): void {
        this.subscription = this.router.events.subscribe(event => {
            if (event?.type === 'NavigationEnd') {
                this.activate();
            }
        });
        // The router constructor pre-matches the initial URL without running
        // guards. Do not activate a guarded route from that unguarded snapshot;
        // wait for a NavigationEnd emitted after the guards pass.
        const target = this.resolveTarget();
        const owner = this.depth ? target : this.router.activeRoute;
        if (this.router.navigated || !this.hasGuards(owner)) {
            this.activate();
        }
    }

    /** True when the snapshot (or an ancestor) declares `canActivate` guards. */
    protected hasGuards(snapshot: ActivatedRouteSnapshot | null): boolean {
        if (!snapshot) {
            return false;
        }
        if (snapshot.route?.canActivate?.length) {
            return true;
        }
        return Array.isArray(snapshot.children)
            && snapshot.children.some(child => this.hasGuards(child));
    }

    /**
     * Resolve the snapshot this outlet level must render from the *current*
     * active route tree. Component-less routes are skipped; each component
     * route consumes one nesting depth. Depth-based lookup keeps nested outlets
     * live across navigation (the parent route snapshot is immutable).
     */
    protected resolveTarget(): ActivatedRouteSnapshot | null {
        const depth = this.depth ?? 0;
        let index = 0;
        let target: ActivatedRouteSnapshot | null = null;
        const visit = (node: ActivatedRouteSnapshot): boolean => {
            if (node.route?.component) {
                if (index === depth) {
                    target = node;
                    return true;
                }
                index++;
            }
            for (const child of node.children || []) {
                if (visit(child)) {
                    return true;
                }
            }
            return false;
        };
        if (this.router.activeRoute) {
            visit(this.router.activeRoute);
        }
        return target;
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
        const host = this.viewContainer?.element?.nativeElement as Element | undefined;
        if (!host || typeof host.removeChild !== 'function') {
            return;
        }
        while (host.firstChild) {
            host.removeChild(host.firstChild);
        }
    }

    protected activate(): void {
        const target = this.resolveTarget();
        const component = target?.route?.component;
        const url = target?.url;
        const host = this.viewContainer?.element?.nativeElement as Element | undefined;
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
            // Nested outlets read the snapshot they own from this injector.
            injector: createInjector(this.viewContainer.injector, [
                { provide: ACTIVATED_ROUTE, useValue: target },
                { provide: ROUTE_OUTLET_DEPTH, useValue: (this.depth ?? 0) + 1 }
            ])
        });
    }
}
