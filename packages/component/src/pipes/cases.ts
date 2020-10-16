
import { lang, isString } from '@tsdi/ioc';
import { Pipe } from '../decorators';
import { PipeTransform } from './pipe';

@Pipe('lowercase')
export class LowerCasePipe implements PipeTransform {
  /**
   * @param value The string to transform to lower case.
   */
  transform(value: string): string {
    if (!value) return value;
    if (!isString(value)) {
        throw  Error(`InvalidPipeArgument: '${value}' for pipe '${lang.getClassName(this)}'`)
    }
    return value.toLowerCase();
  }
}


@Pipe('uppercase')
export class UpperCasePipe implements PipeTransform {
  /**
   * @param value The string to transform to lower case.
   */
  transform(value: string): string {
    if (!value) return value;
    if (!isString(value)) {
        throw  Error(`InvalidPipeArgument: '${value}' for pipe '${lang.getClassName(this)}'`)
    }
    return value.toLowerCase();
  }
}
