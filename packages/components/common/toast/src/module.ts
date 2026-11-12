import { Module } from '@tsdi/ioc';
import { ToastStackComponent } from './toast-stack';

/**
 * Complex component entry point (`@tsdi/components/common/toast`). The host
 * still provides the queue (`ToastService`); this module only declares the
 * shared toast strip.
 */
@Module({
    declarations: [ToastStackComponent],
    exports: [ToastStackComponent]
})
export class ToastModule {}
