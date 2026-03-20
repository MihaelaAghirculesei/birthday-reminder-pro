import { Pipe, PipeTransform } from '@angular/core';
import { parseLocalDate } from '../utils/date.utils';

/** Converts a YYYY-MM-DD string to a local Date (no UTC shift). */
@Pipe({ name: 'localDate', standalone: true })
export class LocalDatePipe implements PipeTransform {
  transform(value: string): Date {
    return parseLocalDate(value);
  }
}
