import { Injectable } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';

@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  constructor(private liveAnnouncer: LiveAnnouncer) {}

  announceBirthdayAdded(name: string): void {
    this.liveAnnouncer.announce(`Birthday for ${name} has been added successfully`, 'polite');
  }

  announceBirthdayUpdated(name: string): void {
    this.liveAnnouncer.announce(`Birthday for ${name} has been updated`, 'polite');
  }

  announceBirthdayDeleted(name: string): void {
    this.liveAnnouncer.announce(`Birthday for ${name} has been deleted`, 'polite');
  }

  announceSearchResults(count: number): void {
    if (count === 0) {
      this.liveAnnouncer.announce('No birthdays found', 'polite');
    } else if (count === 1) {
      this.liveAnnouncer.announce('1 birthday found', 'polite');
    } else {
      this.liveAnnouncer.announce(`${count} birthdays found`, 'polite');
    }
  }

  announceFilterChange(categoryName: string, count: number): void {
    this.liveAnnouncer.announce(
      `Filtering by ${categoryName}. ${count} ${count === 1 ? 'birthday' : 'birthdays'} found`,
      'polite'
    );
  }

  announceMessageScheduled(name: string): void {
    this.liveAnnouncer.announce(`Message scheduled for ${name}`, 'polite');
  }

  announceMessageDeleted(name: string): void {
    this.liveAnnouncer.announce(`Message for ${name} has been deleted`, 'polite');
  }

  announceDataImported(count: number): void {
    this.liveAnnouncer.announce(
      `${count} ${count === 1 ? 'birthday' : 'birthdays'} imported successfully`,
      'polite'
    );
  }

  announceDataExported(): void {
    this.liveAnnouncer.announce('Birthdays exported successfully', 'polite');
  }

  announceError(message: string): void {
    this.liveAnnouncer.announce(`Error: ${message}`, 'assertive');
  }

  announceLoading(message: string): void {
    this.liveAnnouncer.announce(`Loading ${message}`, 'polite');
  }

  announceLoadingComplete(message: string): void {
    this.liveAnnouncer.announce(`${message} loaded`, 'polite');
  }
}
