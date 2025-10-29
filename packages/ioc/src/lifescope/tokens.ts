import { ContextToken } from '../handler';
import { Injector } from '../injector';
import { DecoratorFn } from '../metadata/class';

export const CURR_DECOR = new ContextToken<DecoratorFn>(()=> null!);
export const PROVIDERIN_INJECTOR = new ContextToken<Injector | null>(() => null);
export const REGISTER_INJECTOR = new ContextToken<Injector>(() => null!);
export const RAISE_INJECTOR = new ContextToken<Injector>(() => null!);
export const CTOR_ARGS = new ContextToken<any[]|null>(() => null!);