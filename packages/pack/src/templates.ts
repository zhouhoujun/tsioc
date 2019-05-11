import { ActivityType } from '@tsdi/activities';
import {
    CleanActivityOption, ServeConfigure, WatchActivityOption,
    ShellActivityOption, UnitTestActivityOption
} from './tasks';
import { TsBuildOption, DistActivityOption, AssetActivityOption, SourceActivityOption } from './transforms';

export type PackTemplates = ActivityType | AssetActivityOption | CleanActivityOption
    | DistActivityOption | ServeConfigure | ShellActivityOption | SourceActivityOption
    | UnitTestActivityOption | WatchActivityOption
    | TsBuildOption;

