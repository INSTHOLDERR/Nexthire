import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import {
  setCredentials, setAuthMethod, setUserStatus, setPendingEmail, logout,
} from '../store/authSlice';
import { AuthUser, AuthMethod } from '../types';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { token, user, pendingEmail, authMethod } = useSelector((s: RootState) => s.auth);

  return {
    token,
    user,
    pendingEmail,
    authMethod,
    setCredentials:  (d: { token: string; user: AuthUser }) => dispatch(setCredentials(d)),
    setAuthMethod:   (m: AuthMethod)      => dispatch(setAuthMethod(m)),
    setUserStatus:   (s: string)          => dispatch(setUserStatus(s)),
    setPendingEmail: (e: string | null)   => dispatch(setPendingEmail(e)),
    logout:          ()                   => dispatch(logout()),
  };
};
