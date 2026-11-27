import { Attribute, Component, ElementRef, OnDestroy } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { ToastEntry, ToastOptions, ToastService } from './toast';
import { ToastStackComponent } from './toast-stack';
import { installToastProviderStyles } from './toast-provider.styles';

/**
 * Root-level toast provider: owns/uses a ToastService and renders the shared
 * strip. Hosts can place it once at the layout root; TUI uses the same template
 * and service clock.
 */
@Component({
    selector: 'ui-toast-provider',
    imports: [ToastStackComponent],
    template: `
    <div class="ui-toast-provider is-{{position}}">
        <toast-stack :items="visibleEntries" :closeAction="dismiss" :actionAction="invoke"
            :pauseOnHover="pauseOnHover" :pauseAllOnHover="pauseAllOnHover"
            :pauseAction="pause" :resumeAction="resume"
            :pauseAllAction="pauseAll" :resumeAllAction="resumeAll"
            :messageWidth="messageWidth"></toast-stack>
        <span class="ui-toast-provider-more" role="status" v-if="hiddenCount">+{{hiddenCount}}</span>
    </div>`
})
export class ToastProviderComponent implements OnDestroy {
    constructor(@Optional() protected injectedService?: ToastService, @Optional() protected elementRef?: ElementRef) {
        this.service = injectedService || new ToastService();
    }

    protected readonly service: ToastService;
    protected unsubscribe?: () => void;
    entries: readonly ToastEntry[] = [];

    @Attribute() position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right';
    @Attribute() messageWidth = 0;
    @Attribute() maxVisible: number | string = 0;
    @Attribute() pauseOnHover = false;
    @Attribute() pauseAllOnHover = false;

    onInit(): void {
        installToastProviderStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
        this.entries = this.service.current;
        this.unsubscribe = this.service.subscribe(entries => { this.entries = entries; });
    }

    get maxVisibleCount(): number { return Math.max(0, Math.floor(Number(this.maxVisible) || 0)); }

    get visibleEntries(): readonly ToastEntry[] {
        return this.maxVisibleCount ? this.entries.slice(0, this.maxVisibleCount) : this.entries;
    }

    get hiddenCount(): number {
        return Math.max(0, this.entries.length - this.visibleEntries.length);
    }

    show(message: string, options?: ToastOptions): string { return this.service.show(message, options); }
    dismiss(id: string): void { this.service.dismiss(id); }
    clear(): void { this.service.clear(); }
    invoke(id: string): Promise<void> { return this.service.invoke(id); }
    pause(id: string): void { this.service.pause(id); }
    resume(id: string): void { this.service.resume(id); }
    pauseAll(): void { this.service.pauseAll(); }
    resumeAll(): void { this.service.resumeAll(); }

    onDestroy(): void {
        this.unsubscribe?.();
        if (!this.injectedService) {
            this.service.onDestroy();
        }
    }
}
