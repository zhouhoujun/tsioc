import { ParameterCodec, TransportParams } from '@tsdi/common';


/**
 * Provides encoding and decoding of URL parameter and query-string values.
 *
 * Serializes and parses URL parameter keys and values to encode and decode them.
 * If you pass URL query parameters without encoding,
 * the query parameters can be misinterpreted at the receiving end.
 *
 *
 * @publicApi
 */
export class HttpUrlEncodingCodec {
  /**
   * Encodes a key name for a URL parameter or query-string.
   * @param key The key name.
   * @returns The encoded key name.
   */
  encodeKey(key: string): string {
    return standardEncoding(key)
  }

  /**
   * Encodes the value of a URL parameter or query-string.
   * @param value The value.
   * @returns The encoded value.
   */
  encodeValue(value: string): string {
    return standardEncoding(value)
  }

  /**
   * Decodes an encoded URL parameter or query-string key.
   * @param key The encoded key name.
   * @returns The decoded key name.
   */
  decodeKey(key: string): string {
    return decodeURIComponent(key)
  }

  /**
   * Decodes an encoded URL parameter or query-string value.
   * @param value The encoded value.
   * @returns The decoded value.
   */
  decodeValue(value: string) {
    return decodeURIComponent(value)
  }
}

/**
 * Encode input string with standard encodeURIComponent and then un-encode specific characters.
 */
const STANDARD_ENCODING_REGEX = /%(\d[a-f0-9])/gi;
const STANDARD_ENCODING_REPLACEMENTS: { [x: string]: string } = {
  '40': '@',
  '3A': ':',
  '24': '$',
  '2C': ',',
  '3B': ';',
  '2B': '+',
  '3D': '=',
  '3F': '?',
  '2F': '/',
};

function standardEncoding(v: string): string {
  return encodeURIComponent(v).replace(
    STANDARD_ENCODING_REGEX, (s, t) => STANDARD_ENCODING_REPLACEMENTS[t] ?? s);
}

export class HttpParams extends TransportParams {

  constructor(options: {
    params?: string
    | ReadonlyArray<[string, string | number | boolean]>
    | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;
    encoder?: ParameterCodec;
  } = {}) {
    options.encoder = options.encoder ?? new HttpUrlEncodingCodec();
    super(options)
  }
}
