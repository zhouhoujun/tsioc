import { isString } from '@tsdi/ioc';

/**
 * binding types.
 *
 * static: static binding.
 * dynamic：dynamic binding.
 *
 */
export type BindingTypes = 'static' | 'dynamic';

/**
 * element template.
 *
 * @export
 * @interface ElementTemplate
 */
export interface ElementTemplate {

}

/**
 * binding
 */
export type Binding<T, Temp extends ElementTemplate = ElementTemplate> = string | T | Temp;

/**
 * binding direction.
 *
 * input: input binding.
 * output: output binding.
 */
export type BindingDirection = 'input' | 'output' | 'twoway';

export function isBindingDriection(target: any): target is BindingDirection {
    return isString(target) && (target === 'input' || target === 'output' || target === 'twoway');
}
