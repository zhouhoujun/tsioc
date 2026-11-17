import { Module } from '@tsdi/ioc';
import { AlertDialogComponent } from './alert-dialog';

/**
 * Shared alert-dialog entry point (`@tsdi/components/common/alert`).
 *
 * The canonical module name matches the component; `AlertModule` stays as a
 * compatibility alias for hosts that imported the older name.
 */
@Module({
    declarations: [AlertDialogComponent],
    exports: [AlertDialogComponent]
})
export class AlertDialogModule {}

/** @deprecated Use {@link AlertDialogModule}. */
export const AlertModule = AlertDialogModule;
