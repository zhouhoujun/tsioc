import { Attribute, Directive, ElementRef } from '@tsdi/components';
import type { OnDestroy } from '@tsdi/ioc';
import { NavigationExtras, Router } from './router';

/** Declarative navigation link (`[routerLink]="['/users', id]"`). */
@Directive({ selector: '[routerLink]' })
export class RouterLinkDirective implements OnDestroy {
    protected commands: string | any[] = '/';
    protected extras?: NavigationExtras;
    protected activeClass = '';
    protected subscription?: { unsubscribe(): void };
    protected readonly handleClick = (event: MouseEvent): void => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }
        event.preventDefault?.();
        void this.router.navigate(this.commands, this.extras);
    };

    constructor(protected elementRef: ElementRef, protected router: Router) {
        this.elementRef?.nativeElement?.addEventListener?.('click', this.handleClick);
        this.subscription = router.events.subscribe(() => this.syncActive());
    }

    @Attribute()
    set routerLink(value: string | any[]) {
        this.commands = value ?? '/';
        this.syncHref();
        this.syncActive();
    }
    get routerLink(): string | any[] { return this.commands; }

    @Attribute()
    set routerLinkActive(value: string) { this.activeClass = String(value || '').trim(); this.syncActive(); }
    get routerLinkActive(): string { return this.activeClass; }

    @Attribute()
    set queryParams(value: Record<string, any> | undefined) { this.extras = { ...(this.extras || {}), queryParams: value }; }
    @Attribute()
    set fragment(value: string | undefined) { this.extras = { ...(this.extras || {}), fragment: value }; }

    onDestroy(): void {
        this.subscription?.unsubscribe();
        this.elementRef?.nativeElement?.removeEventListener?.('click', this.handleClick);
    }

    protected syncHref(): void {
        const element = this.elementRef?.nativeElement as any;
        const value = Array.isArray(this.commands) ? this.commands.join('/') : this.commands;
        const href = String(value || '/').startsWith('/') ? String(value || '/') : `/${value}`;
        element?.setAttribute?.('href', href);
    }

    protected syncActive(): void {
        if (!this.activeClass) return;
        const element = this.elementRef?.nativeElement as any;
        const value = Array.isArray(this.commands) ? this.commands.join('/') : this.commands;
        const active = this.router.isActive(value);
        if (active) element?.classList?.add?.(this.activeClass);
        else element?.classList?.remove?.(this.activeClass);
    }
}
