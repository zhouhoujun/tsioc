import { Pipe } from '../decorators/Pipe';
import { IPipeTransform } from '../bindings/IPipeTransform';
import { lang } from '@tsdi/ioc';


@Pipe('lowercase')
export class LowerCasePipe implements IPipeTransform {
  /**
   * @param value The string to transform to lower case.
   */
  transform(value: string): string {
    if (!value) return value;
    if (typeof value !== 'string') {
        throw  Error(`InvalidPipeArgument: '${value}' for pipe '${lang.getClassName(this)}'`)
    }
    return value.toLowerCase();
  }
}


@Pipe('uppercase')
export class UpperCasePipe implements IPipeTransform {
  /**
   * @param value The string to transform to lower case.
   */
  transform(value: string): string {
    if (!value) return value;
    if (typeof value !== 'string') {
        throw  Error(`InvalidPipeArgument: '${value}' for pipe '${lang.getClassName(this)}'`)
    }
    return value.toLowerCase();
  }
}