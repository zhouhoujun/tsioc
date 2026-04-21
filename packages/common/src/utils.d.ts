/**
 * Safely assert whether the given value is an ArrayBuffer.
 *
 * In some execution environments ArrayBuffer is not defined.
 */
export declare function isArrayBuffer(value: any): value is ArrayBuffer;
/**
 * Safely assert whether the given value is a Blob.
 *
 * In some execution environments Blob is not defined.
 */
export declare function isBlob(value: any): value is Blob;
/**
 * Safely assert whether the given value is a FormData instance.
 *
 * In some execution environments FormData is not defined.
 */
export declare function isFormData(value: any): value is FormData;
/**
 * Safely assert whether the given value is a URLSearchParams instance.
 *
 * In some execution environments URLSearchParams is not defined.
 */
export declare function isUrlSearchParams(value: any): value is URLSearchParams;
export declare const LOCALHOST = "localhost";
/**
 * join path.
 * @param paths
 * @returns
 */
export declare function joinPath(...paths: (string | undefined)[]): string;
/**
 * normalize route path.
 * @param route
 * @returns
 */
export declare function normalize(route: string, prefix?: string, noSearch?: boolean): string;
/**
 * xml reg exp check.
 */
export declare const xmlRegExp: RegExp;
/**
 * html RegExp
 */
export declare const htmlRegExp: RegExp;
/**
 * Escape special characters in the given string of html.
 *
 * @param  {string} content The string to escape for inserting into HTML
 * @return {string}
 * @public
 */
export declare function escapeHtml(content: string): string;
export declare function encodeUrl(url: string): string;
/**
 * json xss.
 */
export declare const XSSI_PREFIX: RegExp;
/**
 * Parse a HTTP token list.
 *
 * @param {string} str
 * @private
 */
export declare function parseTokenList(str: string): string[];
/**
* Append a field to a vary header.
*
* @param {String} header
* @param {String|Array} field
* @return {String}
* @public
*/
export declare function append(header: string, field: string): string;
export declare function isIPv4(ip: string): boolean;
export declare function isIPv6(ip: string): boolean;
