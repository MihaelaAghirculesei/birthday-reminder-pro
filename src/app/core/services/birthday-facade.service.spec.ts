import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { BirthdayFacadeService } from './birthday-facade.service';
import * as BirthdayActions from '../store/birthday/birthday.actions';
import * as BirthdaySelectors from '../store/birthday/birthday.selectors';

describe('BirthdayFacadeService', () => {
  let service: BirthdayFacadeService;
  let store: jasmine.SpyObj<Store>;

  beforeEach(() => {
    const storeSpy = jasmine.createSpyObj('Store', ['dispatch', 'select']);
    storeSpy.select.and.callFake((selector: unknown) => {
      if (selector === BirthdaySelectors.selectBirthdayLoading) return of(false);
      if (selector === BirthdaySelectors.selectBirthdayError) return of(undefined);
      if (selector === BirthdaySelectors.selectSearchTerm) return of('');
      if (selector === BirthdaySelectors.selectSelectedMonth) return of(undefined);
      if (selector === BirthdaySelectors.selectSelectedCategory) return of(undefined);
      if (selector === BirthdaySelectors.selectSortOrder) return of('nextBirthday');
      if (selector === BirthdaySelectors.selectAverageAge) return of(0);
      if (selector === BirthdaySelectors.selectSelectedBirthday) return of(undefined);
      if (selector === BirthdaySelectors.selectBirthdaysThisMonth) return of(undefined);
      return of([]);
    });

    TestBed.configureTestingModule({
      providers: [
        BirthdayFacadeService,
        { provide: Store, useValue: storeSpy }
      ]
    });

    service = TestBed.inject(BirthdayFacadeService);
    store = TestBed.inject(Store) as jasmine.SpyObj<Store>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should dispatch loadBirthdays on init', () => {
    expect(store.dispatch).toHaveBeenCalledWith(BirthdayActions.loadBirthdays());
  });

  it('should dispatch addBirthday action', () => {
    const birthday = { name: 'Test', birthDate: new Date(), zodiacSign: 'Aries', reminderDays: 7, category: 'family' };
    service.addBirthday(birthday);
    expect(store.dispatch).toHaveBeenCalledWith(BirthdayActions.addBirthday({ birthday }));
  });

  it('should dispatch updateBirthday action', () => {
    const birthday = { id: '1', name: 'Test', birthDate: new Date(), zodiacSign: 'Aries', reminderDays: 7, category: 'family' };
    service.updateBirthday(birthday);
    expect(store.dispatch).toHaveBeenCalledWith(BirthdayActions.updateBirthday({ birthday }));
  });

  it('should dispatch deleteBirthday action', () => {
    service.deleteBirthday('test-id');
    expect(store.dispatch).toHaveBeenCalledWith(BirthdayActions.deleteBirthday({ id: 'test-id' }));
  });

  it('should dispatch clearAllBirthdays action', () => {
    service.clearAllBirthdays();
    expect(store.dispatch).toHaveBeenCalledWith(BirthdayActions.clearAllBirthdays());
  });

  it('should dispatch setSearchTerm action', () => {
    service.setSearchTerm('test');
    expect(store.dispatch).toHaveBeenCalledWith(BirthdayActions.setSearchTerm({ searchTerm: 'test' }));
  });

  it('should dispatch setSelectedMonth action', () => {
    service.setSelectedMonth(5);
    expect(store.dispatch).toHaveBeenCalledWith(BirthdayActions.setSelectedMonth({ month: 5 }));
  });

  it('should dispatch clearFilters action', () => {
    service.clearFilters();
    expect(store.dispatch).toHaveBeenCalledWith(BirthdayActions.clearFilters());
  });

  it('should expose birthdays signal', () => {
    expect(service.birthdays()).toEqual([]);
  });

  it('should dispatch loadTestData action', () => {
    service.loadTestData();
    expect(store.dispatch).toHaveBeenCalledWith(BirthdayActions.loadTestData());
  });

  it('should dispatch selectBirthday action', () => {
    service.selectBirthday('test-id');
    expect(store.dispatch).toHaveBeenCalledWith(BirthdayActions.selectBirthday({ id: 'test-id' }));
  });

  it('should dispatch selectBirthday action with null', () => {
    service.selectBirthday(null);
    expect(store.dispatch).toHaveBeenCalledWith(BirthdayActions.selectBirthday({ id: null }));
  });

  it('should dispatch setSelectedCategory action', () => {
    service.setSelectedCategory('family');
    expect(store.dispatch).toHaveBeenCalledWith(BirthdayActions.setSelectedCategory({ category: 'family' }));
  });

  it('should dispatch setSelectedCategory action with null', () => {
    service.setSelectedCategory(null);
    expect(store.dispatch).toHaveBeenCalledWith(BirthdayActions.setSelectedCategory({ category: null }));
  });

  it('should dispatch setSortOrder action', () => {
    service.setSortOrder('name');
    expect(store.dispatch).toHaveBeenCalledWith(BirthdayActions.setSortOrder({ sortOrder: 'name' }));
  });

  it('should dispatch setSortOrder action with age', () => {
    service.setSortOrder('age');
    expect(store.dispatch).toHaveBeenCalledWith(BirthdayActions.setSortOrder({ sortOrder: 'age' }));
  });

  it('should dispatch setSortOrder action with nextBirthday', () => {
    service.setSortOrder('nextBirthday');
    expect(store.dispatch).toHaveBeenCalledWith(BirthdayActions.setSortOrder({ sortOrder: 'nextBirthday' }));
  });

  it('should dispatch addMessageToBirthday action', () => {
    const message = {
      id: 'm1',
      title: 'Test',
      message: 'Test message',
      scheduledTime: '10:00',
      active: true,
      messageType: 'text' as const,
      priority: 'normal' as const,
      createdDate: new Date()
    };
    service.addMessageToBirthday('b1', message);
    expect(store.dispatch).toHaveBeenCalledWith(
      BirthdayActions.addMessageToBirthday({ birthdayId: 'b1', message })
    );
  });

  it('should dispatch updateMessageInBirthday action', () => {
    const updates = { title: 'Updated Title', active: false };
    service.updateMessageInBirthday('b1', 'm1', updates);
    expect(store.dispatch).toHaveBeenCalledWith(
      BirthdayActions.updateMessageInBirthday({
        birthdayId: 'b1',
        messageId: 'm1',
        updates
      })
    );
  });

  it('should dispatch deleteMessageFromBirthday action', () => {
    service.deleteMessageFromBirthday('b1', 'm1');
    expect(store.dispatch).toHaveBeenCalledWith(
      BirthdayActions.deleteMessageFromBirthday({ birthdayId: 'b1', messageId: 'm1' })
    );
  });

  it('should return observable from getMessagesByBirthday', () => {
    const messages = [
      { id: 'm1', title: 'Test', message: 'Test', scheduledTime: '10:00', active: true, messageType: 'text' as const, priority: 'normal' as const, createdDate: new Date() }
    ];
    store.select.and.returnValue(of(messages));

    service.getMessagesByBirthday('b1').subscribe(result => {
      expect(result).toEqual(messages);
    });
  });

  it('should return observable from getBirthdayById', () => {
    const birthday = { id: '1', name: 'Test', birthDate: new Date() };
    store.select.and.returnValue(of(birthday));

    service.getBirthdayById('1').subscribe(result => {
      expect(result).toEqual(birthday);
    });
  });

  it('should return observable from getUpcomingBirthdays with default 30 days', () => {
    const birthdays = [{ id: '1', name: 'Test', birthDate: new Date() }];
    store.select.and.returnValue(of(birthdays));

    service.getUpcomingBirthdays().subscribe(result => {
      expect(result).toEqual(birthdays);
    });
  });

  it('should return observable from getUpcomingBirthdays with custom days', () => {
    const birthdays = [{ id: '1', name: 'Test', birthDate: new Date() }];
    store.select.and.returnValue(of(birthdays));

    service.getUpcomingBirthdays(60).subscribe(result => {
      expect(result).toEqual(birthdays);
    });
  });

  it('should return observable from getBirthdaysNext30Days', () => {
    const birthdays = [{ id: '1', name: 'Test', birthDate: new Date() }];
    store.select.and.returnValue(of(birthdays));

    service.getBirthdaysNext30Days().subscribe(result => {
      expect(result).toEqual(birthdays);
    });
  });

  describe('Signals', () => {
    it('should expose filteredBirthdays signal', () => {
      expect(service.filteredBirthdays()).toEqual([]);
    });

    it('should expose selectedBirthday signal', () => {
      expect(service.selectedBirthday()).toBeUndefined();
    });

    it('should expose loading signal', () => {
      expect(service.loading()).toBe(false);
    });

    it('should expose error signal', () => {
      expect(service.error()).toBeUndefined();
    });

    it('should expose searchTerm signal', () => {
      expect(service.searchTerm()).toBe('');
    });

    it('should expose selectedMonth signal', () => {
      expect(service.selectedMonth()).toBeUndefined();
    });

    it('should expose selectedCategory signal', () => {
      expect(service.selectedCategory()).toBeUndefined();
    });

    it('should expose sortOrder signal', () => {
      expect(service.sortOrder()).toBe('nextBirthday');
    });

    it('should expose averageAge signal', () => {
      expect(service.averageAge()).toBe(0);
    });

    it('should expose birthdaysByMonth signal', () => {
      expect(service.birthdaysByMonth()).toEqual([]);
    });

    it('should expose birthdaysThisMonth signal', () => {
      expect(service.birthdaysThisMonth()).toBeUndefined();
    });

    it('should expose next5Birthdays signal', () => {
      expect(service.next5Birthdays()).toEqual([]);
    });
  });
});
