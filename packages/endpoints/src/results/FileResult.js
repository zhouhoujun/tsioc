"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileResult = void 0;
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
const buffer_1 = require("buffer");
/**
 * controller method return result type of file.
 *
 * @export
 * @class FileResult
 */
class FileResult extends core_1.ResultValue {
    constructor(
    /**
     * file content or path.
     */
    file, 
    /**
     * Set content type and Content-Disposition header
     */
    options) {
        super(options?.contentType || 'application/octet-stream');
        this.file = file;
        this.options = options;
    }
    async sendValue(ctx) {
        const file = this.file;
        const contentType = this.contentType;
        if (this.options && this.options.filename) {
            ctx.attachment(this.options.filename, { contentType, ...this.options.disposition });
        }
        else {
            ctx.contentType = contentType;
        }
        const adapter = ctx.streamAdapter;
        const fileAdapter = ctx.fileAdapter;
        const baseURL = ctx.get(core_1.ApplicationContext).baseURL;
        if ((0, ioc_1.isString)(file)) {
            const filepath = (fileAdapter.isAbsolute(file) || !baseURL) ? file : fileAdapter.resolve(baseURL, file);
            if (fileAdapter.existsSync(filepath)) {
                ctx.body = fileAdapter.read(filepath);
            }
        }
        else if (buffer_1.Buffer.isBuffer(file)) {
            ctx.body = file;
        }
        else if (adapter.isStream(file)) {
            ctx.body = file;
        }
    }
}
exports.FileResult = FileResult;
//# sourceMappingURL=FileResult.js.map