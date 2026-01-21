import { TestBed } from '@angular/core/testing';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { AccessibilityService } from './accessibility.service';

describe('AccessibilityService', () => {
  let service: AccessibilityService;
  let liveAnnouncerSpy: jasmine.SpyObj<LiveAnnouncer>;

  beforeEach(() => {
    liveAnnouncerSpy = jasmine.createSpyObj('LiveAnnouncer', ['announce']);

    TestBed.configureTestingModule({
      providers: [
        AccessibilityService,
        { provide: LiveAnnouncer, useValue: liveAnnouncerSpy }
      ]
    });

    service = TestBed.inject(AccessibilityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('announceBirthdayAdded', () => {
    it('should announce birthday added', () => {
      service.announceBirthdayAdded('John');
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        'Birthday for John has been added successfully',
        'polite'
      );
    });
  });

  describe('announceBirthdayUpdated', () => {
    it('should announce birthday updated', () => {
      service.announceBirthdayUpdated('Jane');
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        'Birthday for Jane has been updated',
        'polite'
      );
    });
  });

  describe('announceBirthdayDeleted', () => {
    it('should announce birthday deleted', () => {
      service.announceBirthdayDeleted('Bob');
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        'Birthday for Bob has been deleted',
        'polite'
      );
    });
  });

  describe('announceSearchResults', () => {
    it('should announce no results when count is 0', () => {
      service.announceSearchResults(0);
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        'No birthdays found',
        'polite'
      );
    });

    it('should announce singular result when count is 1', () => {
      service.announceSearchResults(1);
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        '1 birthday found',
        'polite'
      );
    });

    it('should announce plural results when count is greater than 1', () => {
      service.announceSearchResults(5);
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        '5 birthdays found',
        'polite'
      );
    });
  });

  describe('announceFilterChange', () => {
    it('should announce filter change with singular count', () => {
      service.announceFilterChange('Family', 1);
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        'Filtering by Family. 1 birthday found',
        'polite'
      );
    });

    it('should announce filter change with plural count', () => {
      service.announceFilterChange('Friends', 3);
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        'Filtering by Friends. 3 birthdays found',
        'polite'
      );
    });
  });

  describe('announceMessageScheduled', () => {
    it('should announce message scheduled', () => {
      service.announceMessageScheduled('Alice');
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        'Message scheduled for Alice',
        'polite'
      );
    });
  });

  describe('announceMessageDeleted', () => {
    it('should announce message deleted', () => {
      service.announceMessageDeleted('Charlie');
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        'Message for Charlie has been deleted',
        'polite'
      );
    });
  });

  describe('announceDataImported', () => {
    it('should announce singular import', () => {
      service.announceDataImported(1);
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        '1 birthday imported successfully',
        'polite'
      );
    });

    it('should announce plural import', () => {
      service.announceDataImported(10);
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        '10 birthdays imported successfully',
        'polite'
      );
    });
  });

  describe('announceDataExported', () => {
    it('should announce data exported', () => {
      service.announceDataExported();
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        'Birthdays exported successfully',
        'polite'
      );
    });
  });

  describe('announceError', () => {
    it('should announce error with assertive politeness', () => {
      service.announceError('Something went wrong');
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        'Error: Something went wrong',
        'assertive'
      );
    });
  });

  describe('announceLoading', () => {
    it('should announce loading state', () => {
      service.announceLoading('birthdays');
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        'Loading birthdays',
        'polite'
      );
    });
  });

  describe('announceLoadingComplete', () => {
    it('should announce loading complete', () => {
      service.announceLoadingComplete('Birthdays');
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        'Birthdays loaded',
        'polite'
      );
    });
  });
});
