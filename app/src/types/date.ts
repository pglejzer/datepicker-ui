export interface PlainDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export interface YearMonth {
  readonly year: number;
  readonly month: number;
}

export type DateInput = Date | string;

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
