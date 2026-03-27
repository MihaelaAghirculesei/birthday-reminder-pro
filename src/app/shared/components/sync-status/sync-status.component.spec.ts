import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SyncStatusComponent } from './sync-status.component';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import * as SyncSelectors from '../../../core/store/sync/sync.selectors';
import { ONE_MINUTE_MS, ONE_HOUR_MS, ONE_DAY_MS } from '../../../core/constants/time.constants';

describe('SyncStatusComponent', () => {
  let component: SyncStatusComponent;
  let fixture: ComponentFixture<SyncStatusComponent>;
  let store: MockStore;

  const initialState = {
    auth: { user: null, loading: false, error: null, initialized: true },
    sync: { state: 'idle', lastSyncAt: null, pendingChanges: 0, error: null, isOnline: true }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SyncStatusComponent, NoopAnimationsModule],
      providers: [provideMockStore({ initialState }), provideTranslateTesting()]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(SyncStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show Synced when idle with no pending', () => {
    store.overrideSelector(SyncSelectors.selectSyncSummary, {
      state: 'idle',
      isOnline: true,
      pendingCount: 0,
      lastSync: new Date(),
      hasError: false
    });
    store.refreshState();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Synced');
  });

  it('should show Syncing... when syncing', () => {
    store.overrideSelector(SyncSelectors.selectSyncSummary, {
      state: 'syncing',
      isOnline: true,
      pendingCount: 0,
      lastSync: null,
      hasError: false
    });
    store.refreshState();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Syncing...');
  });

  it('should show Sync error when in error state', () => {
    store.overrideSelector(SyncSelectors.selectSyncSummary, {
      state: 'error',
      isOnline: true,
      pendingCount: 0,
      lastSync: null,
      hasError: true
    });
    store.refreshState();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Sync error');
  });

  it('should show Offline when offline', () => {
    store.overrideSelector(SyncSelectors.selectSyncSummary, {
      state: 'offline',
      isOnline: false,
      pendingCount: 0,
      lastSync: null,
      hasError: false
    });
    store.refreshState();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Offline');
  });

  it('should show pending count when there are pending changes', () => {
    store.overrideSelector(SyncSelectors.selectSyncSummary, {
      state: 'idle',
      isOnline: true,
      pendingCount: 3,
      lastSync: null,
      hasError: false
    });
    store.refreshState();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('3 pending');
  });

  describe('tooltip', () => {
    it('should return All data synced when everything is fine', () => {
      store.overrideSelector(SyncSelectors.selectSyncSummary, {
        state: 'idle',
        isOnline: true,
        pendingCount: 0,
        lastSync: null,
        hasError: false
      });
      store.refreshState();
      fixture.detectChanges();

      expect(component.tooltip()).toBe('All data synced');
    });

    it('should include last sync time', () => {
      const recentDate = new Date(Date.now() - 30000); // 30 seconds ago
      store.overrideSelector(SyncSelectors.selectSyncSummary, {
        state: 'idle',
        isOnline: true,
        pendingCount: 0,
        lastSync: recentDate,
        hasError: false
      });
      store.refreshState();
      fixture.detectChanges();

      expect(component.tooltip()).toContain('Last sync: just now');
    });

    it('should include pending count in tooltip', () => {
      store.overrideSelector(SyncSelectors.selectSyncSummary, {
        state: 'idle',
        isOnline: true,
        pendingCount: 5,
        lastSync: null,
        hasError: false
      });
      store.refreshState();
      fixture.detectChanges();

      expect(component.tooltip()).toContain('5 changes pending upload');
    });

    it('should include offline message', () => {
      store.overrideSelector(SyncSelectors.selectSyncSummary, {
        state: 'offline',
        isOnline: false,
        pendingCount: 0,
        lastSync: null,
        hasError: false
      });
      store.refreshState();
      fixture.detectChanges();

      expect(component.tooltip()).toContain('Working offline');
    });

    it('should include error message', () => {
      store.overrideSelector(SyncSelectors.selectSyncSummary, {
        state: 'error',
        isOnline: true,
        pendingCount: 0,
        lastSync: null,
        hasError: true
      });
      store.refreshState();
      fixture.detectChanges();

      expect(component.tooltip()).toContain('Sync encountered an error');
    });

    it('should return empty string when no summary', () => {
      store.overrideSelector(SyncSelectors.selectSyncSummary, null as unknown as ReturnType<typeof SyncSelectors.selectSyncSummary.projector>);
      store.refreshState();
      fixture.detectChanges();

      expect(component.tooltip()).toBe('');
    });

    describe('formatTime branches', () => {
      const syncSummaryWith = (lastSync: Date) => ({
        state: 'idle' as const,
        isOnline: true,
        pendingCount: 0,
        lastSync,
        hasError: false
      });

      it('should format 1 minute ago (singular)', () => {
        store.overrideSelector(SyncSelectors.selectSyncSummary, syncSummaryWith(new Date(Date.now() - ONE_MINUTE_MS)));
        store.refreshState();
        fixture.detectChanges();
        expect(component.tooltip()).toContain('Last sync: 1 minute ago');
      });

      it('should format 5 minutes ago (plural)', () => {
        store.overrideSelector(SyncSelectors.selectSyncSummary, syncSummaryWith(new Date(Date.now() - 5 * ONE_MINUTE_MS)));
        store.refreshState();
        fixture.detectChanges();
        expect(component.tooltip()).toContain('Last sync: 5 minutes ago');
      });

      it('should format 1 hour ago (singular)', () => {
        store.overrideSelector(SyncSelectors.selectSyncSummary, syncSummaryWith(new Date(Date.now() - ONE_HOUR_MS)));
        store.refreshState();
        fixture.detectChanges();
        expect(component.tooltip()).toContain('Last sync: 1 hour ago');
      });

      it('should format 3 hours ago (plural)', () => {
        store.overrideSelector(SyncSelectors.selectSyncSummary, syncSummaryWith(new Date(Date.now() - 3 * ONE_HOUR_MS)));
        store.refreshState();
        fixture.detectChanges();
        expect(component.tooltip()).toContain('Last sync: 3 hours ago');
      });

      it('should fall back to toLocaleDateString for dates >= 1 day ago', () => {
        const oldDate = new Date(Date.now() - ONE_DAY_MS);
        store.overrideSelector(SyncSelectors.selectSyncSummary, syncSummaryWith(oldDate));
        store.refreshState();
        fixture.detectChanges();
        expect(component.tooltip()).toContain(`Last sync: ${oldDate.toLocaleDateString()}`);
      });
    });
  });
});
