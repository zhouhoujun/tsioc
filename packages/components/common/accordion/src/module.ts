import { Module } from '@tsdi/ioc';
import { IconModule } from '../../icon';
import { AccordionComponent } from './accordion';

/**
 * Generic collapsible section (`@tsdi/components/common/accordion`). Hosts opt
 * in so applications that never render an accordion do not carry its skin.
 */
@Module({
    imports: [IconModule],
    declarations: [AccordionComponent],
    exports: [AccordionComponent]
})
export class AccordionModule {}
