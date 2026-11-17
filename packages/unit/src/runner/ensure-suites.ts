import { AbstractType, isArray, isString } from '@tsdi/ioc';

/**
 * Guard against "zero suites" runs.
 *
 * `found` is the total number of registered suites: exported suite classes
 * plus the BDD (`describe`) suites collected while loading the files.
 *
 * `runTest` accepts glob patterns; when a pattern matches nothing (wrong
 * `baseURL`, file moved, glob typo) the loader yields no suites and the run
 * used to finish successfully, which is indistinguishable from a green run.
 * Report it as an error unless the caller explicitly allowed an empty set.
 */
export function ensureSuitesFound(src: string | AbstractType | (string | AbstractType)[] | undefined, found: number, options?: { baseURL?: string; allowEmpty?: boolean }): void {
    if (options?.allowEmpty) {
        return;
    }
    if ((found ?? 0) > 0) {
        return;
    }
    const patterns = isString(src) ? [src] : (isArray(src) ? src.filter(item => isString(item)) as string[] : []);
    if (!patterns.length) {
        // Type-based suites are resolved directly; an empty set there is a
        // caller bug in the test file rather than a glob problem.
        return;
    }
    const baseURL = options?.baseURL ? ` (baseURL: ${options.baseURL})` : '';
    throw new Error(
        `No test files matched ${patterns.map(pattern => `"${pattern}"`).join(', ')}${baseURL}. ` +
        'Check the glob and baseURL, or pass { allowEmpty: true } if an empty run is intentional.'
    );
}
