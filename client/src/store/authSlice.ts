import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, AuthUser, AuthMethod } from '../types';

const token        = localStorage.getItem('nh_token');
const user         = JSON.parse(localStorage.getItem('nh_user')        || 'null') as AuthUser | null;
const pendingEmail = localStorage.getItem('nh_pending_email')          || null;
const authMethod   = (localStorage.getItem('nh_auth_method')           || null) as AuthMethod;

const authSlice = createSlice({
  name: 'auth',
  initialState: { token, user, pendingEmail, authMethod } as AuthState,
  reducers: {
    setCredentials(state, { payload }: PayloadAction<{ token: string; user: AuthUser }>) {
      state.token = payload.token;
      state.user  = payload.user;
      localStorage.setItem('nh_token', payload.token);
      localStorage.setItem('nh_user',  JSON.stringify(payload.user));
      state.pendingEmail = null;
      localStorage.removeItem('nh_pending_email');
    },

    setAuthMethod(state, { payload }: PayloadAction<AuthMethod>) {
      state.authMethod = payload;
      if (payload) localStorage.setItem('nh_auth_method', payload);
      else         localStorage.removeItem('nh_auth_method');
    },

    setUserStatus(state, { payload }: PayloadAction<string>) {
      if (state.user) {
        state.user = { ...state.user, status: payload as AuthUser['status'] };
        localStorage.setItem('nh_user', JSON.stringify(state.user));
      }
    },

    setPendingEmail(state, { payload }: PayloadAction<string | null>) {
      state.pendingEmail = payload;
      if (payload) localStorage.setItem('nh_pending_email', payload);
      else         localStorage.removeItem('nh_pending_email');
    },

    logout(state) {
      state.token        = null;
      state.user         = null;
      state.pendingEmail = null;
      state.authMethod   = null;
      localStorage.removeItem('nh_token');
      localStorage.removeItem('nh_user');
      localStorage.removeItem('nh_pending_email');
      localStorage.removeItem('nh_auth_method');
    },
  },
});

export const { setCredentials, setAuthMethod, setUserStatus, setPendingEmail, logout } = authSlice.actions;
export default authSlice.reducer;
