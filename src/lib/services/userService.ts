import api from '../api';
import { User } from '../types';

// Register a new user
export const registerUser = async (userData: Omit<User, 'id' | 'role'>) => {
  const response = await api.post('/users', userData);
  return response.data;
};

// Login user
export const loginUser = async (email: string, password: string) => {
  const response = await api.post('/users/login', { email, password });
  
  // Save user and token to localStorage
  localStorage.setItem('photofine_current_user', JSON.stringify(response.data));
  localStorage.setItem('photofine_token', response.data.token);
  
  return response.data;
};

// Logout user
export const logoutUser = () => {
  localStorage.removeItem('photofine_current_user');
  localStorage.removeItem('photofine_token');
};

// Get current user
export const getCurrentUser = (): User | null => {
  const user = localStorage.getItem('photofine_current_user');
  return user ? JSON.parse(user) : null;
};

// Get user profile
export const getUserProfile = async () => {
  const response = await api.get('/users/profile');
  return response.data;
};

// Get photographers (admin only)
export const getPhotographers = async () => {
  const response = await api.get('/users/photographers');
  return response.data;
}; 