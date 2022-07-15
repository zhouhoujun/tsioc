import { MapHeaders, ReqHeaderType } from '@tsdi/core';
import { isArray, isNil } from '@tsdi/ioc';

export class HttpHeaders extends MapHeaders {

  set(name: string, val: ReqHeaderType): this {
    return this.setHeader(name, val);
  }

  get(name: string): string | null {
    const values = this.getHeader(name);
    if (isNil(values)) return null;
    return isArray(values) && values.length ? values[0] : String(values);
  }

  delete(name: string) {
    return this.removeHeader(name);
  }

  has(name: string): boolean {
    return this.hasHeader(name);
  }

  forEach(fn: (name: string, values: ReqHeaderType) => void): void {
    this.eachHeader(fn);
  }
}
