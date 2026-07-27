import { useCallback, useEffect, useState } from 'react';
import { api, authHeaders } from '../api/client';

const readCache = () => {
  const role = localStorage.getItem('userRole');
  if (!role || role === 'GUEST') return { user: null, organization: null };
  return {
    user: {
      role,
      email: localStorage.getItem('userEmail') ?? '',
      name: localStorage.getItem('userName') ?? '',
      orgId: localStorage.getItem('userOrgId') || null
    },
    organization: localStorage.getItem('userOrgName')
      ? { name: localStorage.getItem('userOrgName'), status: localStorage.getItem('userOrgStatus') }
      : null
  };
};

export const persistSession = ({ token, user, organization }) => {
  localStorage.setItem('accessToken', token);
  localStorage.setItem('userRole', user.role);
  localStorage.setItem('userEmail', user.email);
  localStorage.setItem('userName', user.name);
  localStorage.setItem('userOrgId', user.orgId ?? '');
  if (organization) {
    localStorage.setItem('userOrgName', organization.name);
    localStorage.setItem('userOrgStatus', organization.status);
  } else {
    localStorage.removeItem('userOrgName');
    localStorage.removeItem('userOrgStatus');
  }
};

export const clearSession = () => {
  ['accessToken', 'userRole', 'userEmail', 'userName', 'userOrgId', 'userOrgName', 'userOrgStatus'].forEach((key) => localStorage.removeItem(key));
};

// 로그인 사용자와 소속 조직 정보를 항상 최신 상태로 가져오는 공용 훅.
// ADMIN이 조직을 승인/배정해도 관리자가 재로그인하지 않고 반영 결과를 볼 수 있도록 /api/auth/me를 다시 조회한다.
export function useCurrentUser() {
  const [state, setState] = useState(readCache);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setState({ user: null, organization: null });
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me', { headers: authHeaders() });
      setState({ user: data.user, organization: data.organization });
      localStorage.setItem('userRole', data.user.role);
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('userName', data.user.name);
      localStorage.setItem('userOrgId', data.user.orgId ?? '');
      if (data.organization) {
        localStorage.setItem('userOrgName', data.organization.name);
        localStorage.setItem('userOrgStatus', data.organization.status);
      } else {
        localStorage.removeItem('userOrgName');
        localStorage.removeItem('userOrgStatus');
      }
    } catch (error) {
      clearSession();
      setState({ user: null, organization: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, loading, refresh };
}
