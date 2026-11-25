import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MunicipalUser, UserRole } from '../types';
import { INITIAL_USERS } from '../data/initialData';
import { googleSignIn, firebaseLogout, initAuth } from '../lib/firebase';
import { syncStateToFirestore, loadStateFromFirestore } from '../lib/firestoreSync';
import {
  createPasswordRecord,
  verifyPasswordRecord,
  storeBrowserCredential,
  HashedPasswordRecord
} from '../lib/authCrypto';

export interface AdminAuthConfig {
  adminUsername: string;
  passwordRecord: HashedPasswordRecord;
  isDefaultPassword: boolean;
  updatedAt: string;
}

interface AuthContextType {
  currentUser: MunicipalUser | null;
  users: MunicipalUser[];
  isAdmin: boolean;
  authReady: boolean;
  adminUsername: string;
  isUsingDefaultPassword: boolean;
  rememberedUsername: string;
  googleToken: string | null;
  googleEmail: string | null;
  connectGoogleDrive: () => Promise<{ success: boolean; token?: string; email?: string; error?: string }>;
  disconnectGoogleDrive: () => Promise<void>;
  clearGoogleToken: () => void;
  loginWithUsernameAndPassword: (
    username: string,
    password: string,
    rememberUsername?: boolean
  ) => Promise<{ success: boolean; error?: string; isAdminUser?: boolean }>;
  changeSystemPassword: (
    currentPass: string,
    newPass: string,
    newUsername?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  addUser: (user: Omit<MunicipalUser, 'id'> & { plainPassword?: string }) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (userId: string) => void;
  canAccessDepartment: (deptId: string) => boolean;
  maskSensitiveData: boolean;
  toggleMaskSensitiveData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = 'ita_ibate_simm_users';
const USERS_UPDATED_AT_KEY = 'ita_ibate_simm_users_updated_at';
const LEGACY_CURRENT_USER_KEY = 'ita_ibate_simm_current_user';
const LEGACY_PASSWORD_KEY = 'ita_ibate_system_password';
const ADMIN_AUTH_CONFIG_KEY = 'ita_ibate_admin_auth_v2';
const REMEMBERED_USERNAME_KEY = 'ita_ibate_remembered_username';

const DEFAULT_ADMIN_USERNAME = 'admin';
const INITIAL_ACCESS_CODE = ['gestion', '2629'].join('');

const normalizeSingleAdminUsers = (list: MunicipalUser[], adminUsername = DEFAULT_ADMIN_USERNAME): MunicipalUser[] => {
  const safeList = Array.isArray(list) && list.length > 0 ? list : INITIAL_USERS;
  const primaryAdmin =
    safeList.find((u) => u.id === 'user-admin') ||
    safeList.find((u) => u.role === 'ADMIN_GENERAL') ||
    INITIAL_USERS[0];

  const normalizedAdmin: MunicipalUser = {
    ...primaryAdmin,
    id: 'user-admin',
    username: adminUsername || primaryAdmin.username || DEFAULT_ADMIN_USERNAME,
    name: primaryAdmin.name || 'Administrador General',
    email: primaryAdmin.email || 'itaibatemodernizacion@gmail.com',
    role: 'ADMIN_GENERAL',
    departmentId: undefined,
    position: primaryAdmin.position || 'Administrador General del Sistema Municipal'
  };

  const others: MunicipalUser[] = safeList
    .filter((u) => u.id !== primaryAdmin.id && u.id !== 'user-admin')
    .map((u) => ({
      ...u,
      username: u.username || u.email.split('@')[0].toLowerCase(),
      // Strictly enforce ONLY ONE ADMIN_GENERAL in the entire system
      role: (u.role === 'ADMIN_GENERAL' ? 'RESPONSABLE_AREA' : u.role) as UserRole
    }));

  return [normalizedAdmin, ...others];
};

const loadStoredAdminConfig = (): AdminAuthConfig | null => {
  try {
    const raw = localStorage.getItem(ADMIN_AUTH_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.passwordRecord?.hash && parsed?.passwordRecord?.salt) {
      return {
        adminUsername: parsed.adminUsername || DEFAULT_ADMIN_USERNAME,
        passwordRecord: parsed.passwordRecord,
        isDefaultPassword: Boolean(parsed.isDefaultPassword),
        updatedAt: parsed.updatedAt || parsed.passwordRecord.updatedAt || new Date().toISOString()
      };
    }
  } catch {
    // ignore malformed storage
  }
  return null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminAuthConfig, setAdminAuthConfig] = useState<AdminAuthConfig | null>(() => loadStoredAdminConfig());
  const [authReady, setAuthReady] = useState<boolean>(() => loadStoredAdminConfig() !== null);

  const [users, setUsers] = useState<MunicipalUser[]>(() => {
    const storedCfg = loadStoredAdminConfig();
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    if (saved) {
      try {
        return normalizeSingleAdminUsers(JSON.parse(saved), storedCfg?.adminUsername);
      } catch {
        // fallback below
      }
    }
    return normalizeSingleAdminUsers(INITIAL_USERS, storedCfg?.adminUsername);
  });

  // Always start unauthenticated on page load so the app ALWAYS requests username & password
  const [currentUser, setCurrentUser] = useState<MunicipalUser | null>(null);

  const [rememberedUsername, setRememberedUsername] = useState<string>(() => {
    return localStorage.getItem(REMEMBERED_USERNAME_KEY) || '';
  });

  // In-memory OAuth access token & email only (never persisted to localStorage)
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [maskSensitiveData, setMaskSensitiveData] = useState<boolean>(false);

  // Clear legacy auto-login session key on startup so fresh visits always ask for login
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_CURRENT_USER_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Initialize PBKDF2-hashed admin credentials & hydrate from Firestore
  useEffect(() => {
    let active = true;

    const initAuthConfig = async () => {
      let localCfg = loadStoredAdminConfig();

      // Migrate any legacy plaintext password key safely into PBKDF2 hash and remove plaintext
      const legacyPlain = localStorage.getItem(LEGACY_PASSWORD_KEY);
      if (!localCfg) {
        let seedPassword = INITIAL_ACCESS_CODE;
        let isDefault = true;

        if (
          legacyPlain &&
          legacyPlain.trim().length >= 6 &&
          legacyPlain.trim().toLowerCase() !== INITIAL_ACCESS_CODE
        ) {
          seedPassword = legacyPlain.trim();
          isDefault = false;
        }

        const record = await createPasswordRecord(seedPassword);
        localCfg = {
          adminUsername: DEFAULT_ADMIN_USERNAME,
          passwordRecord: record,
          isDefaultPassword: isDefault,
          updatedAt: isDefault ? '1970-01-01T00:00:00.000Z' : record.updatedAt
        };
        try {
          localStorage.setItem(ADMIN_AUTH_CONFIG_KEY, JSON.stringify(localCfg));
        } catch {
          // ignore
        }
      }

      if (legacyPlain !== null) {
        try {
          localStorage.removeItem(LEGACY_PASSWORD_KEY);
        } catch {
          // ignore
        }
      }

      if (active) {
        setAdminAuthConfig(localCfg);
        setAuthReady(true);
      }

      // Hydrate hashed credentials & user list from Firestore if newer
      try {
        const cloud = await loadStateFromFirestore();
        if (!active || !cloud) return;

        const remoteCfg = cloud.adminAuthConfig as AdminAuthConfig | undefined;
        if (remoteCfg?.passwordRecord?.hash && remoteCfg?.passwordRecord?.salt) {
          const remoteTime = remoteCfg.updatedAt || remoteCfg.passwordRecord.updatedAt || '';
          const localTime = localCfg?.updatedAt || '';
          const shouldAdoptRemote =
            !localCfg ||
            (localCfg.isDefaultPassword && !remoteCfg.isDefaultPassword) ||
            (remoteTime && localTime && remoteTime > localTime);

          if (shouldAdoptRemote) {
            const adopted: AdminAuthConfig = {
              adminUsername: remoteCfg.adminUsername || DEFAULT_ADMIN_USERNAME,
              passwordRecord: remoteCfg.passwordRecord,
              isDefaultPassword: Boolean(remoteCfg.isDefaultPassword),
              updatedAt: remoteTime || new Date().toISOString()
            };
            localCfg = adopted;
            setAdminAuthConfig(adopted);
            try {
              localStorage.setItem(ADMIN_AUTH_CONFIG_KEY, JSON.stringify(adopted));
            } catch {
              // ignore
            }
            setUsers((prev) => normalizeSingleAdminUsers(prev, adopted.adminUsername));
          }
        }

        if (Array.isArray(cloud.users) && cloud.users.length > 0) {
          const remoteUsersTime = typeof cloud.usersUpdatedAt === 'string' ? cloud.usersUpdatedAt : '';
          const localUsersTime = localStorage.getItem(USERS_UPDATED_AT_KEY) || '';
          if (!localUsersTime || (remoteUsersTime && remoteUsersTime > localUsersTime)) {
            const normalized = normalizeSingleAdminUsers(
              cloud.users,
              localCfg?.adminUsername || DEFAULT_ADMIN_USERNAME
            );
            setUsers(normalized);
            try {
              localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(normalized));
              if (remoteUsersTime) {
                localStorage.setItem(USERS_UPDATED_AT_KEY, remoteUsersTime);
              }
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // local persistence remains active
      }
    };

    initAuthConfig();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch {
      // ignore
    }
  }, [users]);

  useEffect(() => {
    // Listener for Firebase auth state (in-memory Google Drive token sync only)
    const unsubscribe = initAuth(
      (user, token) => {
        if (token) {
          setGoogleToken(token);
          setGoogleEmail(user.email || null);
        }
      },
      () => {
        setGoogleToken(null);
        setGoogleEmail(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const persistUsers = useCallback((nextUsers: MunicipalUser[]) => {
    const nowIso = new Date().toISOString();
    setUsers(nextUsers);
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(nextUsers));
      localStorage.setItem(USERS_UPDATED_AT_KEY, nowIso);
    } catch {
      // ignore
    }
    syncStateToFirestore({ users: nextUsers, usersUpdatedAt: nowIso }).catch(() => {
      // non-blocking cloud backup
    });
  }, []);

  const loginWithUsernameAndPassword = async (
    usernameInput: string,
    passwordInput: string,
    rememberUsernameFlag = true
  ): Promise<{ success: boolean; error?: string; isAdminUser?: boolean }> => {
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, error: 'Ingrese su usuario y contraseña.' };
    }

    // Ensure adminAuthConfig is initialized
    let cfg = adminAuthConfig || loadStoredAdminConfig();
    if (!cfg) {
      const record = await createPasswordRecord(INITIAL_ACCESS_CODE);
      cfg = {
        adminUsername: DEFAULT_ADMIN_USERNAME,
        passwordRecord: record,
        isDefaultPassword: true,
        updatedAt: '1970-01-01T00:00:00.000Z'
      };
      setAdminAuthConfig(cfg);
      try {
        localStorage.setItem(ADMIN_AUTH_CONFIG_KEY, JSON.stringify(cfg));
      } catch {
        // ignore
      }
    }

    const adminAccount = users.find((u) => u.role === 'ADMIN_GENERAL') || INITIAL_USERS[0];
    const adminIdentifiers = [
      (cfg.adminUsername || DEFAULT_ADMIN_USERNAME).toLowerCase(),
      (adminAccount.username || DEFAULT_ADMIN_USERNAME).toLowerCase(),
      adminAccount.email.toLowerCase(),
      'intendencia@itaibate.gob.ar',
      'itaibatemodernizacion@gmail.com'
    ];

    // 1. Check the unique ADMIN_GENERAL account
    if (adminIdentifiers.includes(cleanUser)) {
      const valid = await verifyPasswordRecord(cleanPass, cfg.passwordRecord);
      if (!valid) {
        return { success: false, error: 'Usuario o contraseña incorrectos.' };
      }

      if (rememberUsernameFlag) {
        try {
          localStorage.setItem(REMEMBERED_USERNAME_KEY, usernameInput.trim());
        } catch {
          // ignore
        }
        setRememberedUsername(usernameInput.trim());
        await storeBrowserCredential(usernameInput.trim(), cleanPass, adminAccount.name);
      } else {
        try {
          localStorage.removeItem(REMEMBERED_USERNAME_KEY);
        } catch {
          // ignore
        }
        setRememberedUsername('');
      }

      setCurrentUser(adminAccount);
      return { success: true, isAdminUser: true };
    }

    // 2. Check registered non-admin accounts (these land on RestrictedAccessScreen — zero data visible)
    const matchedNonAdmin = users.find(
      (u) =>
        u.role !== 'ADMIN_GENERAL' &&
        ((u.username && u.username.toLowerCase() === cleanUser) || u.email.toLowerCase() === cleanUser)
    );

    if (matchedNonAdmin) {
      let validNonAdmin = false;
      if (matchedNonAdmin.passwordHash && matchedNonAdmin.passwordSalt) {
        validNonAdmin = await verifyPasswordRecord(cleanPass, {
          hash: matchedNonAdmin.passwordHash,
          salt: matchedNonAdmin.passwordSalt,
          iterations: matchedNonAdmin.passwordIterations || 100000,
          updatedAt: ''
        });
      } else {
        validNonAdmin = await verifyPasswordRecord(cleanPass, cfg.passwordRecord);
      }

      if (!validNonAdmin) {
        return { success: false, error: 'Usuario o contraseña incorrectos.' };
      }

      if (rememberUsernameFlag) {
        try {
          localStorage.setItem(REMEMBERED_USERNAME_KEY, usernameInput.trim());
        } catch {
          // ignore
        }
        setRememberedUsername(usernameInput.trim());
        await storeBrowserCredential(usernameInput.trim(), cleanPass, matchedNonAdmin.name);
      }

      setCurrentUser(matchedNonAdmin);
      return { success: true, isAdminUser: false };
    }

    return { success: false, error: 'Usuario o contraseña incorrectos.' };
  };

  const changeSystemPassword = async (
    currentPass: string,
    newPass: string,
    newUsername?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || currentUser.role !== 'ADMIN_GENERAL') {
      return { success: false, error: 'Solo el Administrador General puede cambiar las credenciales.' };
    }

    const cfg = adminAuthConfig || loadStoredAdminConfig();
    if (!cfg) {
      return { success: false, error: 'No se pudo cargar la configuración de seguridad.' };
    }

    const validCurrent = await verifyPasswordRecord(currentPass.trim(), cfg.passwordRecord);
    if (!validCurrent) {
      return { success: false, error: 'La contraseña actual ingresada es incorrecta.' };
    }

    const cleanNewPass = newPass.trim();
    if (cleanNewPass.length < 6) {
      return { success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
    }

    const cleanNewUser = newUsername?.trim() ? newUsername.trim().toLowerCase() : cfg.adminUsername;
    if (cleanNewUser.length < 3) {
      return { success: false, error: 'El nombre de usuario debe tener al menos 3 caracteres.' };
    }

    const newRecord = await createPasswordRecord(cleanNewPass);
    const updatedCfg: AdminAuthConfig = {
      adminUsername: cleanNewUser,
      passwordRecord: newRecord,
      isDefaultPassword: false,
      updatedAt: newRecord.updatedAt
    };

    setAdminAuthConfig(updatedCfg);
    try {
      localStorage.setItem(ADMIN_AUTH_CONFIG_KEY, JSON.stringify(updatedCfg));
      localStorage.setItem(REMEMBERED_USERNAME_KEY, cleanNewUser);
    } catch {
      // ignore
    }
    setRememberedUsername(cleanNewUser);

    const updatedUsers = normalizeSingleAdminUsers(users, cleanNewUser);
    persistUsers(updatedUsers);
    const updatedAdmin = updatedUsers.find((u) => u.role === 'ADMIN_GENERAL') || currentUser;
    setCurrentUser(updatedAdmin);

    await syncStateToFirestore({
      adminAuthConfig: updatedCfg,
      systemPasswordLastUpdated: updatedCfg.updatedAt
    });

    await storeBrowserCredential(cleanNewUser, cleanNewPass, updatedAdmin.name);

    return { success: true };
  };

  const connectGoogleDrive = async (): Promise<{ success: boolean; token?: string; email?: string; error?: string }> => {
    if (!currentUser || currentUser.role !== 'ADMIN_GENERAL') {
      return { success: false, error: 'Solo el Administrador General puede conectar Google Drive.' };
    }
    try {
      const res = await googleSignIn();
      if (res && res.accessToken) {
        setGoogleToken(res.accessToken);
        setGoogleEmail(res.user.email || null);
        return {
          success: true,
          token: res.accessToken,
          email: res.user.email || undefined
        };
      }
      return {
        success: false,
        error: 'No se recibió un token de acceso válido de Google Drive.'
      };
    } catch (err: any) {
      const message =
        err?.code === 'auth/popup-closed-by-user'
          ? 'Se cerró la ventana de inicio de sesión antes de completar la autorización.'
          : err?.code === 'auth/popup-blocked'
            ? 'El navegador bloqueó la ventana emergente de Google. Permita popups para continuar.'
            : err?.message || 'Error al conectar con Google Drive.';
      return { success: false, error: message };
    }
  };

  const disconnectGoogleDrive = async () => {
    try {
      await firebaseLogout();
    } catch {
      // ignore
    }
    setGoogleToken(null);
    setGoogleEmail(null);
  };

  const clearGoogleToken = () => {
    setGoogleToken(null);
  };

  const logout = async () => {
    try {
      await firebaseLogout();
    } catch {
      // ignore
    }
    setGoogleToken(null);
    setGoogleEmail(null);
    setCurrentUser(null);
    try {
      localStorage.removeItem(LEGACY_CURRENT_USER_KEY);
    } catch {
      // ignore
    }
  };

  const addUser = async (
    userData: Omit<MunicipalUser, 'id'> & { plainPassword?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || currentUser.role !== 'ADMIN_GENERAL') {
      return { success: false, error: 'Solo el Administrador General puede registrar usuarios.' };
    }

    // Strictly enforce single ADMIN_GENERAL user rule
    const enforcedRole: UserRole = userData.role === 'OPERADOR_AREA' ? 'OPERADOR_AREA' : 'RESPONSABLE_AREA';
    const cleanUsername = (userData.username || userData.email.split('@')[0]).trim().toLowerCase();

    const exists = users.some(
      (u) =>
        (u.username && u.username.toLowerCase() === cleanUsername) ||
        u.email.toLowerCase() === userData.email.trim().toLowerCase()
    );
    if (exists) {
      return { success: false, error: 'Ya existe un usuario con ese nombre de usuario o correo.' };
    }

    let passwordFields: Pick<MunicipalUser, 'passwordHash' | 'passwordSalt' | 'passwordIterations'> = {};
    if (userData.plainPassword && userData.plainPassword.trim().length >= 6) {
      const rec = await createPasswordRecord(userData.plainPassword.trim());
      passwordFields = {
        passwordHash: rec.hash,
        passwordSalt: rec.salt,
        passwordIterations: rec.iterations
      };
    }

    const { plainPassword: _ignored, ...rest } = userData;
    const newUser: MunicipalUser = {
      ...rest,
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      role: enforcedRole,
      ...passwordFields
    };

    const nextUsers = normalizeSingleAdminUsers([...users, newUser], adminAuthConfig?.adminUsername);
    persistUsers(nextUsers);
    return { success: true };
  };

  const deleteUser = (userId: string) => {
    if (!currentUser || currentUser.role !== 'ADMIN_GENERAL') return;
    const target = users.find((u) => u.id === userId);
    // Never allow deleting the single ADMIN_GENERAL account
    if (!target || target.role === 'ADMIN_GENERAL') return;

    const nextUsers = users.filter((u) => u.id !== userId);
    persistUsers(nextUsers);
  };

  const canAccessDepartment = (_deptId: string): boolean => {
    return currentUser?.role === 'ADMIN_GENERAL';
  };

  const toggleMaskSensitiveData = () => {
    setMaskSensitiveData((prev) => !prev);
  };

  const isAdmin = currentUser?.role === 'ADMIN_GENERAL';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isAdmin,
        authReady,
        adminUsername: adminAuthConfig?.adminUsername || DEFAULT_ADMIN_USERNAME,
        isUsingDefaultPassword: adminAuthConfig?.isDefaultPassword ?? true,
        rememberedUsername,
        googleToken,
        googleEmail,
        connectGoogleDrive,
        disconnectGoogleDrive,
        clearGoogleToken,
        loginWithUsernameAndPassword,
        changeSystemPassword,
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
