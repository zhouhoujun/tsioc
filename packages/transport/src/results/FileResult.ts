import { isString } from '@tsdi/ioc';
import { ApplicationContext, AssetContext, Stream } from '@tsdi/core';
import { Buffer } from 'buffer';
import { ResultValue } from './ResultValue';
import { FileAdapter, StreamAdapter } from '../stream';

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

    async sendValue(ctx: AssetContext) {
        const file = this.file;
        const contentType = this.contentType;
        if (this.options && this.options.filename) {
            ctx.attachment(this.options.filename, { contentType, ...this.options.disposition })
        } else {
            ctx.contentType = contentType
        }
        const adapter = ctx.get(StreamAdapter);
        const fileAdapter = ctx.get(FileAdapter);
        const baseURL = ctx.get(ApplicationContext).baseURL;
        if (isString(file)) {
            const filepath = (fileAdapter.isAbsolute(file) || !baseURL) ? file : fileAdapter.resolve(baseURL, file);
            if (fileAdapter.existsSync(filepath)) {
                ctx.body = fileAdapter.read(filepath)
            }
        } else if (Buffer.isBuffer(file)) {
            ctx.body = file
        } else if (adapter.isStream(file)) {
            ctx.body = file
        }
    }
}
