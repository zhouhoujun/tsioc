import { ContentType, Incoming, RequestHandler, RequestInterceptor } from '@tsdi/common';
import { Injectable, lang } from '@tsdi/ioc';
import { Observable, from } from 'rxjs';
import { join } from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { RequestContext } from '@tsdi/common';

const statify = promisify(fs.stat);


@Injectable()
export class BigFileInterceptor implements RequestInterceptor {
    intercept(req: Incoming, next: RequestHandler<any, any>, context: RequestContext): Observable<any> {

        if (req.pattern == '/content/big.json') {
            return from(this.genedata(context))
        }
        return next.handle(req, context);
    }

    async genedata(input: RequestContext) {
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
        input.length = stats.size;
        input.type = ContentType.APPL_JSON;
        input.body = fs.createReadStream(filename);

    }

}

