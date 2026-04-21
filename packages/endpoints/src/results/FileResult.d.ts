import { ResultValue } from '@tsdi/core';
import { IStream } from '@tsdi/common';
import { Buffer } from 'buffer';
import { RestfulRequestContext } from '../RestfulRequestContext';
/**
 * controller method return result type of file.
 *
 * @export
 * @class FileResult
 */
export declare class FileResult extends ResultValue {
    /**
     * file content or path.
     */
    private file;
    /**
     * Set content type and Content-Disposition header
     */
    private options?;
    constructor(
    /**
     * file content or path.
     */
    file: string | Buffer | IStream, 
    /**
     * Set content type and Content-Disposition header
     */
    options?: {
        /**
         * content type
         */
        contentType?: string;
        /**
         * file name for download.
         */
        filename?: string;
        /**
         * content disposition.
         */
        disposition?: {
            /**
            * Specifies the disposition type.
            * This can also be "inline", or any other value (all values except `inline` are treated like attachment,
            * but can convey additional information if both parties agree to it).
            * The `type` is normalized to lower-case.
            * @default 'attachment'
            */
            type?: "attachment" | "inline" | string | undefined;
            /**
             * If the filename option is outside ISO-8859-1,
             * then the file name is actually stored in a supplemental field for clients
             * that support Unicode file names and a ISO-8859-1 version of the file name is automatically generated
             * @default true
             */
            fallback?: string | boolean | undefined;
        };
    } | undefined);
    sendValue(ctx: RestfulRequestContext): Promise<void>;
}
