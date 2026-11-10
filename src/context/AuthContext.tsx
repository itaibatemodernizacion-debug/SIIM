import React, { createContext, useContext, useState, useEffect } from 'react';
import { MunicipalUser, UserRole } from '../types';
import { INITIAL_USERS } from '../data/initialData';
import { googleSignIn, firebaseLogout, initAuth } from '../lib/firebase';

interface AuthContextType {
  currentUser: MunicipalUser | null;
  users: MunicipalUser[];
  isAdmin: boolean;
  googleToken: string | null;
  loginAsUser: (userId: string) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithCredentials: (email: string, role: UserRole, departmentId?: string, name?: string) => void;
  logout: () => void;
  addUser: (user: Omit<MunicipalUser, 'id'>) => void;
  deleteUser: (userId: string) => void;
  canAccessDepartment: (deptId: string) => boolean;
  maskSensitiveData: boolean;
  toggleMaskSensitiveData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = 'ita_ibate_simm_users';
const CURRENT_USER_KEY = 'ita_ibate_simm_current_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<MunicipalUser[]>(() => {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved users', e);
      }
    }
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<MunicipalUser | null>(() => {
    const saved = localStorage.getItem(CURRENT_USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse current user', e);
      }
    }
    return INITIAL_USERS[0]; // Default to Intendente / Admin for ready inspection
  });

  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [maskSensitiveData, setMaskSensitiveData] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }, [currentUser]);

  useEffect(() => {
    // Optional listener for Firebase auth
    const unsubscribe = initAuth(
      (user, token) => {
        if (token) setGoogleToken(token);
      },
      () => {
        setGoogleToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const loginAsUser = (userId: string) => {
    const found = users.find(u => u.id === userId);
    if (found) {
      setCurrentUser(found);
    }
  };

  const loginWithGoogle = async () => {
    try {
      const res = await googleSignIn();
      if (res && res.user) {
        setGoogleToken(res.accessToken);
        // Find existing user or create temporary authenticated profile
        const existing = users.find(u => u.email.toLowerCase() === (res.user.email || '').toLowerCase());
        if (existing) {
          setCurrentUser(existing);
        } else {
          const newUser: MunicipalUser = {
            id: `google-${Date.now()}`,
            name: res.user.displayName || 'Funcionario Google',
            email: res.user.email || 'funcionario@itaibate.gob.ar',
            role: 'ADMIN_GENERAL',
            position: 'Funcionario Municipal (Google Auth)',
            avatar: res.user.photoURL || undefined
          };
          setUsers(prev => [...prev, newUser]);
          setCurrentUser(newUser);
        }
      }
    } catch (err: any) {
      console.warn('Google sign-in fallback:', err);
      // Fallback for dev mode
      const fallbackUser: MunicipalUser = {
        id: `google-sim-${Date.now()}`,
        name: 'Ing. Modernización (Google Auth)',
        email: 'itaibatemodernizacion@gmail.com',
        role: 'ADMIN_GENERAL',
        position: 'Dirección de Modernización y Estadística',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
      };
      setCurrentUser(fallbackUser);
      setGoogleToken('mock-oauth-token-ita-ibate-2026');
    }
  };

  const loginWithCredentials = (email: string, role: UserRole, departmentId?: string, name?: string) => {
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      setCurrentUser(existing);
      return;
    }
    const newUser: MunicipalUser = {
      id: `usr-${Date.now()}`,
      name: name || email.split('@')[0],
      email,
      role,
      departmentId,
      position: role === 'ADMIN_GENERAL' ? 'Administrador General' : 'Responsable de Área'
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
  };

  const logout = async () => {
    try {
      await firebaseLogout();
    } catch (e) {
      // ignore
    }
    setGoogleToken(null);
    setCurrentUser(null);
  };

  const addUser = (userData: Omit<MunicipalUser, 'id'>) => {
    const newUser: MunicipalUser = {
      ...userData,
      id: `usr-${Date.now()}`
    };
    setUsers(prev => [...prev, newUser]);
  };

  const deleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    if (currentUser?.id === userId) {
      setCurrentUser(users.find(u => u.id !== userId) || null);
    }
  };

  const canAccessDepartment = (deptId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN_GENERAL') return true;
    return currentUser.departmentId === deptId;
  };

  const toggleMaskSensitiveData = () => {
    setMaskSensitiveData(prev => !prev);
  };

  const isAdmin = currentUser?.role === 'ADMIN_GENERAL';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isAdmin,
        googleToken,
        loginAsUser,
        loginWithGoogle,
        loginWithCredentials,
        logout,
        addUser,
        deleteUser,
        canAccessDepartment,
        maskSensitiveData,
        toggleMaskSensitiveData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
