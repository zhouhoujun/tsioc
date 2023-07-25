const _tyundef = 'undefined';

/**
 * Safely assert whether the given value is an ArrayBuffer.
 *
 * In some execution environments ArrayBuffer is not defined.
 */
export function isArrayBuffer(value: any): value is ArrayBuffer {
    return typeof ArrayBuffer !== _tyundef && value instanceof ArrayBuffer
}

/**
 * Safely assert whether the given value is a Blob.
 *
 * In some execution environments Blob is not defined.
 */
export function isBlob(value: any): value is Blob {
    return typeof Blob !== _tyundef && value instanceof Blob
}

/**
 * Safely assert whether the given value is a FormData instance.
 *
 * In some execution environments FormData is not defined.
 */
export function isFormData(value: any): value is FormData {
    return typeof FormData !== _tyundef && value instanceof FormData
}

/**
 * Safely assert whether the given value is a URLSearchParams instance.
 *
 * In some execution environments URLSearchParams is not defined.
 */
export function isUrlSearchParams(value: any): value is URLSearchParams {
    return typeof URLSearchParams !== _tyundef && value instanceof URLSearchParams
}



const sta$ = /^\s*\//;
const trim$ = /(?:^\s*\/)|(?:\/\s+$)/;
/**
 * join path.
 * @param paths 
 * @returns 
 */
export function joinPath(...paths: (string | undefined)[]) {
    const joined = paths
        .filter(p => p)
        .map((p, idx) => {
            if (!p) return undefined;
            p = p.replace(trim$, '');
            if (idx > 0) {
                while (p.startsWith('../')) {
                    let preIdx = idx - 1;
                    let pre = paths[preIdx];
                    if (!pre && preIdx - 1 > 0) {
                        preIdx = preIdx - 1;
                        pre = paths[preIdx];
                    }
                    if (pre) {
                        const lasspt = pre.lastIndexOf('/');
                        paths[preIdx] = lasspt > 0 ? pre.slice(0, pre.lastIndexOf('/')) : undefined;
                        p = p.slice(3)
                    }
                }
                if (p.startsWith('./')) {
                    p = p.slice(2);
                }
            }
            return p;
        })
        .filter(p => p)
        .join('/');

    return joined
}

/**
 * normalize route path.
 * @param route 
 * @returns 
 */
export function normalize(route: string, prefix?: string): string {
    if (!route) return '';

    let path = route.replace(trim$, '');

    if (prefix) {
        prefix = prefix.replace(sta$, '');
        if (path.startsWith(prefix)) {
            path = path.substring(prefix.length).replace(sta$, '')
        }

    }
    return path;
}
