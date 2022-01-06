import { Pipe } from '../metadata/decor';
import { PipeTransform } from './pipe';

@Pipe('json-format')
export class ParseJsonPipe implements PipeTransform {
  /**
   * @param value A value of any type to convert into a JSON-format string.
   */
  transform(value: any): string {
    return JSON.stringify(value, null, 2);
  }

}
