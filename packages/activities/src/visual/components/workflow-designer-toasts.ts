import { ToastEntry, ToastService, ToastTone } from '@tsdi/components/common/toast';

type Translate = (key: string, fallback: string, params?: Record<string, any>) => string;

/**
 * Thin host-side adapter between the workflow designer and the shared toast
 * queue. Keeps the designer free of queue plumbing and centralizes the
 * translated copy for each completed action.
 */
export class WorkflowDesignerToasts {
    constructor(
        private readonly service?: ToastService,
        private readonly t?: Translate
    ) { }

    get enabled(): boolean {
        return !!this.service;
    }

    get items(): readonly ToastEntry[] {
        return this.service?.current ?? [];
    }

    dismiss(id: string): void {
        this.service?.dismiss(id);
    }

    clear(): void {
        this.service?.clear();
    }

    published(version: number): void {
        this.show(this.t?.('toastPublished', 'Published v{version}', { version }), 'success');
    }

    /** `wasRunning` is the state before the toggle. */
    deployment(name: string, wasRunning: boolean): void {
        this.show(
            wasRunning
                ? this.t?.('toastWorkflowStopped', 'Stopped {name}', { name })
                : this.t?.('toastWorkflowStarted', 'Started {name}', { name }),
            'success'
        );
    }

    allDeployments(started: boolean): void {
        this.show(
            started
                ? this.t?.('toastDeploymentsStarted', 'All deployments started')
                : this.t?.('toastDeploymentsStopped', 'All deployments stopped'),
            started ? 'success' : 'info'
        );
    }

    plugin(name: string, installed: boolean): void {
        this.show(
            installed
                ? this.t?.('toastPluginInstalled', 'Installed {name}', { name })
                : this.t?.('toastPluginUninstalled', 'Uninstalled {name}', { name }),
            installed ? 'success' : 'info'
        );
    }

    private show(message: string | undefined, tone: ToastTone): void {
        if (message) {
            this.service?.show(message, { tone });
        }
    }
}
