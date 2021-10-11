import { isString } from '@tsdi/ioc';
import { Pipe } from '../metadata/decor';
import { invalidPipeArgumentError } from './err';
import { PipeTransform } from './pipe';

/**
 * lowercase pipe
 */
@Pipe('lowercase')
export class LowerCasePipe implements PipeTransform {
  /**
   * @param value The string to transform to lower case.
   */
  transform(value: string): string {
    if (!value) return value;
    if (!isString(value)) {
      throw invalidPipeArgumentError(this, value);
    }
    return value.toLowerCase();
  }
}

/**
 * uppercase pipe.
 */
@Pipe('uppercase')
export class UpperCasePipe implements PipeTransform {
  /**
   * @param value The string to transform to lower case.
   */
  transform(value: string): string {
    if (!value) return value;
    if (!isString(value)) {
      throw invalidPipeArgumentError(this, value);
    }
    return value.toLowerCase();
  }
}