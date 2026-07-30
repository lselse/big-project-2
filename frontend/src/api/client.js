import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export const api = axios.create({
  baseURL: apiBaseUrl ? `${apiBaseUrl}/api` : '/api',
});

export const authHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const candidateAuthHeaders = () => {
  const token = localStorage.getItem('candidateAccessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const apiErrorMessage = (error, fallback) => (
  error.response?.data?.message ?? fallback
);
