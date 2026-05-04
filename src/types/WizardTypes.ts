import { Club, DiscoLocation } from "./Disco";

export type WizardStep = 'where' | 'when' | 'what' | 'done';

export type WizardState = {
  step: WizardStep;

  city?: DiscoLocation;

  dateType?: 'day' | 'week';
  date: Date;
  endDate?: Date;

  genre?: string;
  club?: Club;
  expanded: boolean;
};
