import { tokenId } from '@tsdi/ioc';

export const CONTENT_DISPOSITION = tokenId<ContentDisposition>('CONTENT_DISPOSITION');

/**
 * Create an attachment `Content-Disposition` header value using the given file name, if supplied.
 * The `filename` is optional and if no file name is desired, but you want to specify options, set `filename` to undefined.
 */
export type ContentDisposition = (filename?: string, options?: {
    /**
     * Specifies the disposition type.
     * This can also be "inline", or any other value (all values except `inline` are treated like attachment,
     * but can convey additional information if both parties agree to it).
     * The `type` is normalized to lower-case.
     * @default 'attachment'
     */
    type?: 'attachment' | 'inline' | string | undefined;
    /**
     * If the filename option is outside ISO-8859-1,
     * then the file name is actually stored in a supplemental field for clients
     * that support Unicode file names and a ISO-8859-1 version of the file name is automatically generated
     * @default true
     */
    fallback?: string | boolean | undefined;
}) => string;
