import { _tyundef } from '@tsdi/ioc'

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
