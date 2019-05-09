import { ActivityType } from '@tsdi/activities';
import {
    AssetActivityOption, CleanActivityOption, DistActivityOption, ServeConfigure,
    ShellActivityOption, SourceActivityOption, UnitTestActivityOption, WatchActivityOption
} from './tasks';
import { TsBuildOption } from './builds';

export type PackTemplates = ActivityType | AssetActivityOption | CleanActivityOption
    | DistActivityOption | ServeConfigure | ShellActivityOption | SourceActivityOption
    | UnitTestActivityOption | WatchActivityOption
    | TsBuildOption;

