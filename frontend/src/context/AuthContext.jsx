import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMyProfile, loginUser, logoutUser, registerUser, verifyLoginOtp } from '../services/api.service';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await getMyProfile();
      setUser(data.data);
    } catch {
      setUser(null);
      localStorage.removeItem('accessToken');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) fetchProfile();
    else setLoading(false);
  }, [fetchProfile]);

  const login = async (credentials) => {
    const { data } = await loginUser(credentials);
    // NEW — Phase 5: 2FA branch — backend returns requiresOtp instead of
    // user/accessToken when the account has 2FA enabled. Don't log in yet.
    if (data.data.requiresOtp) return data;
    localStorage.setItem('accessToken', data.data.accessToken);
    setUser(data.data.user);
    return data;
  };

  // NEW — Phase 5: completes a 2FA login after OTP verification
  const completeLoginWithOtp = async (otpData) => {
    const { data } = await verifyLoginOtp(otpData);
    localStorage.setItem('accessToken', data.data.accessToken);
    setUser(data.data.user);
    return data;
  };

  const logout = async () => {
    try { await logoutUser(); } catch { /* ignore */ }
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  const updateUser = (updated) => setUser((prev) => ({ ...prev, ...updated }));

  return (
    <AuthContext.Provider value={{ user, loading, login, completeLoginWithOtp, logout, updateUser, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
