import { Action } from '@ngrx/store';
import { uiReducer } from './ui.reducer';
import { initialUIState } from './ui.state';
import * as UIActions from './ui.actions';

describe('UI Reducer', () => {
  it('should return initial state', () => {
    const action: Action = { type: 'NOOP' };
    const state = uiReducer(undefined, action);
    expect(state).toEqual(initialUIState);
  });

  describe('toggleDarkMode', () => {
    it('should toggle dark mode from false to true', () => {
      const action = UIActions.toggleDarkMode();
      const state = uiReducer(initialUIState, action);
      expect(state.darkMode).toBeTrue();
    });

    it('should toggle dark mode from true to false', () => {
      const darkState = { ...initialUIState, darkMode: true };
      const action = UIActions.toggleDarkMode();
      const state = uiReducer(darkState, action);
      expect(state.darkMode).toBeFalse();
    });
  });

  describe('setDarkMode', () => {
    it('should set dark mode to true', () => {
      const action = UIActions.setDarkMode({ enabled: true });
      const state = uiReducer(initialUIState, action);
      expect(state.darkMode).toBeTrue();
    });

    it('should set dark mode to false', () => {
      const darkState = { ...initialUIState, darkMode: true };
      const action = UIActions.setDarkMode({ enabled: false });
      const state = uiReducer(darkState, action);
      expect(state.darkMode).toBeFalse();
    });

    it('should not mutate other state properties', () => {
      const action = UIActions.setDarkMode({ enabled: true });
      const state = uiReducer(initialUIState, action);
      expect(Object.keys(state)).toEqual(['darkMode']);
    });
  });
});
