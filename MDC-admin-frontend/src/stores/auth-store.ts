import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Organization, Project } from '@/types';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  currentProject: Project | null;
  projects: Project[];
  isAuthenticated: boolean;
  permissions: string[];
  accessToken: string | null;
  _hasHydrated: boolean;

  setUser: (user: User | null) => void;
  setOrganization: (org: Organization | null) => void;
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  setPermissions: (permissions: string[]) => void;
  setAccessToken: (token: string | null) => void;
  login: (user: User, org: Organization, accessToken?: string) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
  hasPermission: (permission: string) => boolean;
}

const defaultProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Production',
    organizationId: 'org-1',
    description: 'Production environment',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'proj-2',
    name: 'Staging',
    organizationId: 'org-1',
    description: 'Staging environment',
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'proj-3',
    name: 'Development',
    organizationId: 'org-1',
    description: 'Development sandbox',
    createdAt: '2024-02-01T00:00:00Z',
  },
];

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      organization: null,
      currentProject: null,
      projects: [],
      isAuthenticated: false,
      permissions: [],
      accessToken: null,
      _hasHydrated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setOrganization: (organization) => set({ organization }),
      setCurrentProject: (currentProject) => set({ currentProject }),
      setProjects: (projects) => set({ projects }),
      setPermissions: (permissions) => set({ permissions }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      login: (user, organization, accessToken) => {
        // Admin app: always set role to admin
        const adminUser = { ...user, role: 'admin' as const };
        return set({
          user: adminUser,
          organization,
          currentProject: defaultProjects[0],
          projects: defaultProjects,
          isAuthenticated: true,
          accessToken: accessToken || null,
        });
      },

      logout: () => set({
        user: null,
        organization: null,
        currentProject: null,
        projects: [],
        isAuthenticated: false,
        permissions: [],
        accessToken: null,
      }),

      hasPermission: () => {
        // Admin app: all permissions granted
        return true;
      },
    }),
    {
      name: 'admin-auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
