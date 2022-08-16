import { Component } from '@tsdi/components';

/**
 * base activity element.
 * 
 * 
 * ```ts
 * 
 * \@Component({
 *    select: 'myActivity',
 *    template: `<activity *if="work && right"></activity>`
 * })
 * export class MyActivity {
 *    work = true;
 *    right = true;
 * }
 * ```
 */
@Component('activity')
export class Activity {


}

