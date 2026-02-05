import { Injectable, lang } from '@tsdi/ioc';
import { RequestInterceptor, RequestHandler, RequestContext, ContentType, normalize, Incoming } from '@tsdi/common';
import { Observable, from } from 'rxjs';
import * as fs from 'fs';
import { promisify } from 'util';
const statify = promisify(fs.stat);

import { join } from 'path';


@Injectable()
export class BigFileInterceptor implements RequestInterceptor {
    intercept(input: Incoming, next: RequestHandler<any, any>, context: RequestContext): Observable<any> {

        if (normalize(input.path) == 'content/big.json') {

            return from(this.genedata(context))
        }
        return next.handle(input, context);
    }

    async genedata(context: RequestContext) {
        const filename = join(__dirname, './public/big-temp.json');
        if (!fs.existsSync(filename)) {
            const defer = lang.defer();
            setTimeout(() => {
                const stream = fs.createWriteStream(filename);
                stream.write('{\n"features": [');
                let i;
                for (i = 0; i < 100000; i++) {
                    stream.write(`\n"this is ${i} lines of json file big-temp, for unit test big file demo by BigFileInterceptor, for unit test big file demo by BigFileInterceptor, for unit test big file demo by BigFileInterceptor, for unit test big file demo by BigFileInterceptor",`);
                }
                stream.end(`"this is ${i} lines of json file big-temp, for unit test big file demo by BigFileInterceptor, for unit test big file demo by BigFileInterceptor, for unit test big file demo by BigFileInterceptor, for unit test big file demo by BigFileInterceptor"\n]\n}`);
                stream.close(defer.resolve)
            }, 0);

            await defer.promise;
        }


        const stats = await statify(filename);
        context.setContentLength(stats.size);
        context.setContentType(ContentType.APPL_JSON);

        return fs.createReadStream(filename);

    }

}

