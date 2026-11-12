import { Module } from '@tsdi/ioc';
import { AlertDialogComponent } from './alert-dialog';

/**
 * Complex component entry point (`@tsdi/components/common/alert`): the shared
 * dialog chrome with a semantic tone and acknowledgement action.
 */
@Module({
    declarations: [AlertDialogComponent],
    exports: [AlertDialogComponent]
})
export class AlertModule {}
