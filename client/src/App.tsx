import { useEffect } from 'react';
import { Provider }  from 'react-redux';
import { Toaster }   from 'react-hot-toast';
import { store }     from './store/store';
import AppRouter     from './router/AppRouter';
import { useAuth }   from './hooks/useAuth';
import { getSocket } from './hooks/useSocket';
import { AccountStatusChangedEvent } from './types';

function GlobalSocketListener() {
  const { user, token, setUserStatus } = useAuth();

  useEffect(() => {
    if (window.location.pathname.startsWith('/admin')) return;
    if (!token || !user?.id) return;

    const socket = getSocket();
    socket.emit('join', String(user.id));

    const handleStatusChange = ({ code, data }: AccountStatusChangedEvent) => {
      if (code === 'BANNED') {
        setUserStatus('banned');
        sessionStorage.setItem('nh_banned_state', JSON.stringify(data || {}));
        window.location.replace('/banned');
      } else if (code === 'SUSPENDED') {
        setUserStatus('suspended');
        sessionStorage.setItem('nh_suspended_state', JSON.stringify(data || {}));
        window.location.replace('/suspended');
      } else if (code === 'ACTIVE') {
        setUserStatus('active');
        window.location.replace('/login');
      }
    };

    socket.on('account_status_changed', handleStatusChange);
    return () => { socket.off('account_status_changed', handleStatusChange); };
  }, [token, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function App() {
  return (
    <Provider store={store}>
      <GlobalSocketListener />
      <AppRouter />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#1e293b',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            fontSize: '14px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
        }}
      />
    </Provider>
  );
}
