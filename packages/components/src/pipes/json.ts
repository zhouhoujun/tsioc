import { Pipe } from '../decorators/Pipe';
import { IPipeTransform } from '../bindings/IPipeTransform';

@Pipe('json')
export class JsonPipe implements IPipeTransform {
  /**
   * @param value A value of any type to convert into a JSON-format string.
   */
  transform(value: any): string { return JSON.stringify(value, null, 2); }
}
