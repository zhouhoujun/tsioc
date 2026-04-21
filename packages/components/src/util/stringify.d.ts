export declare function stringify(token: any): string;
/**
 * Concatenates two strings with separator, allocating new strings only when necessary.
 *
 * @param before before string.
 * @param separator separator string.
 * @param after after string.
 * @returns concatenated string.
 */
export declare function concatStringsWithSpace(before: string | null, after: string | null): string;
export declare function renderStringify(value: any): string;
/**
 * Used to stringify a value so that it can be displayed in an error message.
 * Important! This function contains a megamorphic read and should only be
 * used for error messages.
 */
export declare function stringifyForError(value: any): string;
