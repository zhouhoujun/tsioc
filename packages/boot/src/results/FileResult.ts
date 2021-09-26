import { isString } from '@tsdi/ioc';
import { ApplicationContext, ResultValue } from '@tsdi/core';
import { Stream } from 'stream';
import { existsSync, createReadStream } from 'fs';
import { join, isAbsolute } from 'path';
import { HttpContext } from '../context';

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

    async sendValue(ctx: HttpContext) {
        let file = this.file;
        ctx.type = this.contentType;
        if (this.options && this.options.filename) {
            ctx.attachment(this.options.filename, this.options.disposition);
        }
        const baseURL = ctx.injector.get(ApplicationContext).baseURL;
        if (isString(file)) {
            let filepath = (isAbsolute(file) || !baseURL) ? file : join(baseURL, file);
            if (existsSync(filepath)) {
                ctx.body = createReadStream(filepath);
            }
        } else if (file instanceof Buffer) {
            ctx.body = file;
        } else if (file instanceof Stream) {
            ctx.body = file;
        }

    }
}
