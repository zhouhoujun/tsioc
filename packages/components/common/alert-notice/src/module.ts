import { Module } from '@tsdi/ioc';
import { IconModule } from '../../icon';
import { AlertNoticeComponent } from './alert-notice';

@Module({
    imports: [IconModule],
    declarations: [AlertNoticeComponent],
    exports: [AlertNoticeComponent]
})
export class AlertNoticeModule {}
