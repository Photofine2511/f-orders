import api from '../api';
import { Order } from '../types';
import axios from 'axios';

// Create a new order with file upload
export const createOrder = async (orderData: FormData, onUploadProgress?: (progressEvent: any) => void) => {
  // Use axios directly to have access to upload progress
  const token = localStorage.getItem('photofine_token');
  
  // Log what we're sending
  console.log('Creating order with data:', {
    hasDriveFileId: orderData.has('driveFileId'),
    hasFile: orderData.has('file'),
    albumName: orderData.get('albumName')
  });
  
  // If we have a driveFileId, we should NOT be uploading the file again
  if (orderData.has('driveFileId') && orderData.has('file')) {
    console.warn('Both driveFileId and file are present, removing file to avoid double upload');
    orderData.delete('file');
  }
  
  const response = await axios.post(`${api.defaults.baseURL}/orders`, orderData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': token ? `Bearer ${token}` : '',
    },
    // Add upload progress tracking
    onUploadProgress: onUploadProgress ? (progressEvent) => {
      if (progressEvent.total) {
        // Calculate the upload percentage
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgress({
          loaded: progressEvent.loaded,
          total: progressEvent.total,
          percentage: percentCompleted
        });
      }
    } : undefined,
  });
  
  return response.data;
};

// Get all orders for logged in user
export const getMyOrders = async () => {
  const response = await api.get('/orders');
  return response.data;
};

// Get order by ID
export const getOrderById = async (id: string) => {
  const response = await api.get(`/orders/${id}`);
  return response.data;
};

// Get all orders (admin only)
export const getAllOrders = async () => {
  const response = await api.get('/orders/all');
  return response.data;
};

// Update order status (admin only)
export const updateOrderStatus = async (orderId: string, status: string) => {
  try {
    const response = await api.put(`/orders/${orderId}/status`, { status });
    // Remove toast notification for status changes
    return response.data;
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
};

// Add notes to order (admin only)
export const addOrderNotes = async (id: string, notes: string) => {
  const response = await api.put(`/orders/${id}/notes`, { notes });
  return response.data;
};

// Download order file (admin only)
export const getOrderDownloadUrl = (id: string) => {
  const token = localStorage.getItem('photofine_token');
  // The server handles redirecting to the appropriate storage provider (Google Drive or Cloudinary)
  return `${api.defaults.baseURL}/orders/${id}/download?token=${token}`;
};

// Delete order (admin only)
export const deleteOrder = async (id: string) => {
  const response = await api.delete(`/orders/${id}`);
  return response.data;
};

// Debug order file (admin only)
export const debugOrderFile = async (id: string) => {
  const response = await api.get(`/orders/${id}/debug`);
  return response.data;
};