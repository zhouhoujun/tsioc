import { Component, Input } from '@tsdi/components';
import { Type } from '@tsdi/ioc';

/**
 * throw control activity.
 *
 * @export
 * @class ThrowActivity
 * @extends {ControlActivity}
 */
@Component('throw')
export class ThrowActivity {

    @Input() execption!: Type;
    @Input() args!: any[];

}
