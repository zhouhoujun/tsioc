import { isString } from '@tsdi/ioc';
import { ApplicationContext, ResultValue } from '@tsdi/core';
import { Stream } from 'stream';
import { existsSync, createReadStream } from 'fs';
import { join, isAbsolute } from 'path';
import { WritableHttpResponse } from '../response';

/**
 * controller method return result type of file.
 *
 * @export
 * @class FileResult
 */
export class FileResult extends ResultValue {
    constructor(
        /**
         * file content or path.
         */
        private file: string | Buffer | Stream,
        /**
         * Set content type and Content-Disposition header
         */
        private options?: {
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
                type?: 'attachment' | 'inline' | string | undefined;
                /**
                 * If the filename option is outside ISO-8859-1,
                 * then the file name is actually stored in a supplemental field for clients
                 * that support Unicode file names and a ISO-8859-1 version of the file name is automatically generated
                 * @default true
                 */
                fallback?: string | boolean | undefined;
            }
        }) {
        super(options?.contentType || 'application/octet-stream');
    }

    async sendValue(resp: WritableHttpResponse) {
        let file = this.file;
        const contentType = this.contentType;
        if (this.options && this.options.filename) {
            resp.attachment(this.options.filename, { contentType, ...this.options.disposition });
        } else {
            resp.contentType = contentType;
        }
        const baseURL = resp.context.get(ApplicationContext).baseURL;
        if (isString(file)) {
            let filepath = (isAbsolute(file) || !baseURL) ? file : join(baseURL, file);
            if (existsSync(filepath)) {
                resp.body = createReadStream(filepath);
            }
        } else if (file instanceof Buffer) {
            resp.body = file;
        } else if (file instanceof Stream) {
            resp.body = file;
        }
    }
}
