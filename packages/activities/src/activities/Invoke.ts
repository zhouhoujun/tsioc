import { Token, ProviderType } from '@tsdi/ioc';
import { Component, Input } from '@tsdi/components';

/**
 * while control activity.
 *
 * @export
 * @class InvokeActivity
 * @extends {ControlActivity}
 */
@Component('invoke,[invoke]')
export class InvokeActivity {
    @Input() target?: Token;
    @Input() method?: string;
    @Input() args?: ProviderType[];
}
