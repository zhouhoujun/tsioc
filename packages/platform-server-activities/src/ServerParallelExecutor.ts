import { Injectable } from '@tsdi/ioc';
import { ParallelExecutor } from '@tsdi/activities';
import { syncRequire } from '@tsdi/platform-server';

@Injectable()
export class ServerParallelExecutor extends ParallelExecutor {
    constructor(private workers = 4) {
        super();
    }

    override run<T>(func: (item: T) => any, items: T[], ...args: any[]) {
        let napa;
        try {
            napa = syncRequire('napajs');
        } catch { }

        if (napa) {
            let zone1 = napa.napa.zone.create('zone1', { workers: this.workers });
            return Promise.all(items.map(itm => zone1.execute(func, [itm])));
        } else {
            return Promise.all(items.map(itm => {
                return Promise.resolve(func(itm))
                    .catch(err => {
                        process.exit(1);
                    })
            }));
        }
    }
}
