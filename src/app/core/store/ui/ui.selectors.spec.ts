import * as fromSelectors from './ui.selectors';
import { initialUIState, UIState } from './ui.state';

interface AppState {
  ui: UIState;
}

describe('UI Selectors', () => {
  const createState = (overrides: Partial<UIState> = {}): AppState => ({
    ui: { ...initialUIState, ...overrides }
  });

  describe('selectUIState', () => {
    it('should select the UI state', () => {
      const state = createState();
      const result = fromSelectors.selectUIState.projector(state.ui);
      expect(result).toEqual(initialUIState);
    });
  });

  describe('selectDarkMode', () => {
    it('should return false by default', () => {
      const result = fromSelectors.selectDarkMode.projector(initialUIState);
      expect(result).toBeFalse();
    });

    it('should return true when dark mode is enabled', () => {
      const state: UIState = { ...initialUIState, darkMode: true };
      const result = fromSelectors.selectDarkMode.projector(state);
      expect(result).toBeTrue();
    });
  });
});
