import { Attribute, Component, OnDestroy } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { ToastEntry, ToastOptions, ToastService } from './toast';
import { ToastStackComponent } from './toast-stack';

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
        <toast-stack :items="entries" :closeAction="dismiss" :actionAction="invoke"
            :pauseOnHover="pauseOnHover" :pauseAllOnHover="pauseAllOnHover"
            :pauseAction="pause" :resumeAction="resume"
            :pauseAllAction="pauseAll" :resumeAllAction="resumeAll"
            :messageWidth="messageWidth"></toast-stack>
    </div>`
})
export class ToastProviderComponent implements OnDestroy {
    constructor(@Optional() protected injectedService?: ToastService) {
        this.service = injectedService || new ToastService();
    }

    protected readonly service: ToastService;
    protected unsubscribe?: () => void;
    entries: readonly ToastEntry[] = [];

    @Attribute() position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right';
    @Attribute() messageWidth = 0;
    @Attribute() pauseOnHover = false;
    @Attribute() pauseAllOnHover = false;

    onInit(): void {
        this.entries = this.service.current;
        this.unsubscribe = this.service.subscribe(entries => { this.entries = entries; });
    }

    show(message: string, options?: ToastOptions): string { return this.service.show(message, options); }
    dismiss(id: string): void { this.service.dismiss(id); }
    clear(): void { this.service.clear(); }
    invoke(id: string): void { this.service.invoke(id); }
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
