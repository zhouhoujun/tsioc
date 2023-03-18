import { Pipe } from '../../metadata';
import { PipeTransform } from '../pipe';

/**
 * json stringify.
 */
@Pipe('json-format')
export class JsonFormatPipe implements PipeTransform {
  /**
   * @param value A value of any type to convert into a JSON-format string.
   */
  transform(value: any): string {
    return JSON.stringify(value, null, 2)
  }

}