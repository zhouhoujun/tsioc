import { Module } from '@tsdi/ioc';
import { DialogComponent } from './dialog';

/**
 * Complex component entry point (`@tsdi/components/common/dialog`): the shared
 * modal shell. Basic components stay in the root index.
 */
@Module({
    declarations: [DialogComponent],
    exports: [DialogComponent]
})
export class DialogModule {}
