import { createReducer, on } from '@ngrx/store';

import * as UIActions from './ui.actions';
import { initialUIState } from './ui.state';

export const uiReducer = createReducer(
  initialUIState,

  on(UIActions.toggleDarkMode, (state) => ({
    ...state,
    darkMode: !state.darkMode
  })),

  on(UIActions.setDarkMode, (state, { enabled }) => ({
    ...state,
    darkMode: enabled
  }))
);
