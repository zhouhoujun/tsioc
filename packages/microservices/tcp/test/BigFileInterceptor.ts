import { Injectable } from '@tsdi/ioc';
import { ContentType, MessageAdapter, RequestInterceptor, RequestHandler, RequestContext, normalize, UrlIncoming } from '@tsdi/common';
import { Observable, from } from 'rxjs';
import * as fs from 'fs';
import { promisify } from 'util';
const statify = promisify(fs.stat);

import { join } from 'path';


@Injectable()
export class BigFileInterceptor implements RequestInterceptor {
    intercept(input: UrlIncoming, next: RequestHandler<any, any>, context: RequestContext): Observable<any> {

        if (normalize(input.url) == 'content/big.json') {

            return from(this.genedata(context))
        }
        return next.handle(input, context);
    }

    async genedata(context: RequestContext) {
        const filename = join(__dirname, './public/big-temp.json');
        if (!fs.existsSync(filename)) {
            await fs.promises.mkdir(join(__dirname, './public'), { recursive: true });
            await new Promise<void>((resolve, reject) => {
                const stream = fs.createWriteStream(filename);
                stream.on('finish', () => resolve());
                stream.on('error', reject);
                stream.write('{\n"features": [');
                let i;
                for (i = 0; i < 512; i++) {
                    stream.write(`\n"this is ${i} lines of json file big-temp, for unit test big file demo by BigFileInterceptor, for unit test big file demo by BigFileInterceptor, for unit test big file demo by BigFileInterceptor, for unit test big file demo by BigFileInterceptor",`);
                }
                stream.end(`"this is ${i} lines of json file big-temp, for unit test big file demo by BigFileInterceptor, for unit test big file demo by BigFileInterceptor, for unit test big file demo by BigFileInterceptor, for unit test big file demo by BigFileInterceptor"\n]\n}`);
            });
        }

        const stats = await statify(filename);
        const adapter = context.get<MessageAdapter>(MessageAdapter);
        adapter.setHeader('content-type', ContentType.APPL_JSON)
            .setHeader('content-length', String(stats.size))
            .setPayload(fs.createReadStream(filename));

        return adapter.response;

    }

}

