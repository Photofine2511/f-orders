import axios from 'axios';
import { toast as showToast } from '@/hooks/use-toast';

// const API_URL = 'https://pf-backend-z825.onrender.com/api';
const API_URL = 'http://localhost:5000/api'; // Use this for local development

// Create an axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create a public API instance that doesn't add auth tokens
// This is used for endpoints that should be publicly accessible
export const publicApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token to requests (only for the authenticated API)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('photofine_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
// Add this function to handle authentication-related toasts
export const showAuthToast = (message: string, isError: boolean = false) => {
  showToast({
    title: isError ? "Authentication Error" : "Authentication",
    description: message,
    variant: isError ? "destructive" : "default",
  });
};

// Modify the interceptor to use this function
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect on 401 errors that aren't from the login endpoint
    if (error.response && 
        error.response.status === 401 && 
        !error.config.url.includes('/login')) {
      console.log('Authentication error. Redirecting to login...');
      localStorage.removeItem('photofine_token');
      localStorage.removeItem('photofine_current_user');
      
      // Show logout toast
      showAuthToast("Your session has expired. Please log in again.");
      
      // Use window.location.replace to avoid adding to history
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

// Add this new function to delete a photographer
export const deletePhotographer = async (id: string) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};

export default api;