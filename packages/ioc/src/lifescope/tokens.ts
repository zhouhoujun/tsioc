import { ContextToken } from '../handler';
import { Injector } from '../injector';
import { DecoratorFn } from '../metadata/class';
import { Parameter } from '../resolver';
import { InjectFlags, Token } from '../tokens';

export const CURR_DECOR = new ContextToken<DecoratorFn>(()=> null!);
export const REGISTER_INJECTOR = new ContextToken<Injector>(() => null!);
export const RAISE_INJECTOR = new ContextToken<Injector>(() => null!);
export const PROVIDE = new ContextToken<Token|null>(() => null);
export const CTOR_ARGS = new ContextToken<any[]|null>(() => null);
export const CTOR_PARAMS = new ContextToken<Array<Token | [Token, ...InjectFlags[]] | Parameter>|null>(() => null);