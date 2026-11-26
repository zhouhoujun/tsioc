import { DataTableViewColumn } from './data-table.types';

/** Component surface required by the pointer column-resize controller. */
export interface DataTableResizeHost {
    enabled(): boolean;
    getWidth(key: string): number | undefined;
    setWidth(key: string, width: number): void;
    /** Called once when the pointer gesture ends (host persistence hook). */
    end?(): void;
}

/**
 * Pointer column resizing for `resizableColumns`. Browser-only; terminal hosts
 * never receive mousedown/mousemove, so the controller is inert there.
 */
export class DataTableResizeController {
    private cleanup?: () => void;

    constructor(private readonly host: DataTableResizeHost) { }

    stopClick(event?: Event): void {
        event?.preventDefault?.();
        event?.stopPropagation?.();
    }

    start(column: DataTableViewColumn, event?: any): void {
        if (!this.host.enabled()) {
            return;
        }
        event?.preventDefault?.();
        event?.stopPropagation?.();
        const doc = event?.currentTarget?.ownerDocument;
        if (!doc?.addEventListener) {
            return;
        }
        this.destroy();
        const startX = Number(event?.clientX ?? event?.pageX ?? 0);
        const header = event?.currentTarget?.parentElement;
        const measured = Number(header?.getBoundingClientRect?.().width);
        const startWidth = measured > 0 ? measured : this.widthPixels(column);
        const move = (moveEvent: any) => {
            const x = Number(moveEvent?.clientX ?? moveEvent?.pageX ?? 0);
            const next = Math.max(24, Math.round(startWidth + (x - startX)));
            this.host.setWidth(column.key, next);
        };
        const up = () => {
            this.host.end?.();
            this.destroy();
        };
        doc.addEventListener('mousemove', move);
        doc.addEventListener('mouseup', up);
        this.cleanup = () => {
            doc.removeEventListener?.('mousemove', move);
            doc.removeEventListener?.('mouseup', up);
            this.cleanup = undefined;
        };
    }

    widthPixels(column: DataTableViewColumn): number {
        const width = this.host.getWidth(column.key);
        if (Number.isFinite(width)) {
            return Number(width);
        }
        const text = String(column.style?.width ?? '');
        const px = /^(\d+(\.\d+)?)px$/.exec(text);
        return px ? Number(px[1]) : 96;
    }

    destroy(): void {
        this.cleanup?.();
    }
}
