import { Type, ProviderTypes, isArray, ProviderParser } from '@tsdi/ioc';
import { ModuleLoader } from '@tsdi/core';
import { AnnoationAction } from './AnnoationAction';
import { AnnoationContext } from '../AnnoationContext';
import { CTX_MODULE_EXPORTS } from '../context-tokens';


export class RegModuleProvidersAction extends AnnoationAction {
    execute(ctx: AnnoationContext, next: () => void): void {
        let tRef = ctx.reflects;
        let annoation = ctx.annoation;

        let injector = ctx.injector;
        let map = injector.getInstance(ProviderParser)
            .parse(...annoation.providers || []);
        // inject module providers
        if (annoation.components) {
            ctx.getContainer().use(map, ...annoation.components);
        }
        if (annoation.services) {
            ctx.getContainer().use(map, ...annoation.services);
        }

        if (map.size) {
            ctx.injector.copy(map);
        }

        let exptypes: Type[] = injector.getInstance(ModuleLoader).getTypes(annoation.exports || []);

        exptypes.forEach(ty => {
            let reflect = tRef.get(ty);
            map.set(ty, (...pds: ProviderTypes[]) => injector.get(ty, ...pds));
            if (reflect && isArray(reflect.provides) && reflect.provides.length) {
                reflect.provides.forEach(p => {
                    if (!map.has(p)) {
                        map.set(p, (...pds: ProviderTypes[]) => injector.get(p, ...pds));
                    }
                });
            }
        });
        map.size && ctx.set(CTX_MODULE_EXPORTS, map);
        next();
    }
}
