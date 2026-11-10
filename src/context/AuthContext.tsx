import React, { createContext, useContext, useState, useEffect } from 'react';
import { MunicipalUser, UserRole } from '../types';
import { INITIAL_USERS } from '../data/initialData';
import { googleSignIn, firebaseLogout, initAuth } from '../lib/firebase';
import { syncStateToFirestore } from '../lib/firestoreSync';

interface AuthContextType {
  currentUser: MunicipalUser | null;
  users: MunicipalUser[];
  isAdmin: boolean;
  googleToken: string | null;
  loginAsUser: (userId: string) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithCredentials: (email: string, role: UserRole, departmentId?: string, name?: string) => void;
  loginWithSystemPassword: (password: string, userId?: string, email?: string) => { success: boolean; error?: string };
  changeSystemPassword: (currentPass: string, newPass: string) => { success: boolean; error?: string };
  verifySystemPassword: (password: string) => boolean;
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
const SYSTEM_PASSWORD_KEY = 'ita_ibate_system_password';
const DEFAULT_PASSWORD = 'Gestion2629';

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

  const [systemPassword, setSystemPassword] = useState<string>(() => {
    return localStorage.getItem(SYSTEM_PASSWORD_KEY) || DEFAULT_PASSWORD;
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
    return null; // Requires entering system password initially
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
    localStorage.setItem(SYSTEM_PASSWORD_KEY, systemPassword);
    // Sync password metadata to cloud database
    syncStateToFirestore({ systemPasswordLastUpdated: new Date().toISOString() });
  }, [systemPassword]);

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

  const verifySystemPassword = (pass: string): boolean => {
    return pass.trim() === systemPassword.trim();
  };

  const loginWithSystemPassword = (
    pass: string, 
    userId?: string, 
    email?: string
  ): { success: boolean; error?: string } => {
    if (!verifySystemPassword(pass)) {
      return { 
        success: false, 
        error: 'Contraseña de acceso incorrecta. Recuerde que la clave inicial es "Gestion2629".' 
      };
    }

    let userToLogin: MunicipalUser | undefined;
    if (userId) {
      userToLogin = users.find(u => u.id === userId);
    } else if (email) {
      userToLogin = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    // Default to Intendente / Administrador if not specified
    if (!userToLogin) {
      userToLogin = users[0] || {
        id: 'usr-admin-default',
        name: 'Intendencia / Administrador',
        email: 'intendencia@itaibate.gob.ar',
        role: 'ADMIN_GENERAL',
        position: 'Intendente Municipal'
      };
    }

    setCurrentUser(userToLogin);
    return { success: true };
  };

  const changeSystemPassword = (
    currentPass: string, 
    newPass: string
  ): { success: boolean; error?: string } => {
    if (!verifySystemPassword(currentPass)) {
      return { 
        success: false, 
        error: 'La contraseña actual ingresada es incorrecta.' 
      };
    }
    if (!newPass || newPass.trim().length < 6) {
      return { 
        success: false, 
        error: 'La nueva contraseña debe tener al menos 6 caracteres.' 
      };
    }

    const cleanNewPass = newPass.trim();
    setSystemPassword(cleanNewPass);
    localStorage.setItem(SYSTEM_PASSWORD_KEY, cleanNewPass);
    syncStateToFirestore({ systemPassword: cleanNewPass });

    return { success: true };
  };

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
    localStorage.removeItem(CURRENT_USER_KEY);
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
        loginWithSystemPassword,
        changeSystemPassword,
        verifySystemPassword,
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
