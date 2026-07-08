import axios from 'axios';

// Fallback to local SAM api gateway URL if env is not defined
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
});

// Add auth and mock headers to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Inject X-Mock-User-Id header for local Cognito bypass in sam local start-api
  const user = localStorage.getItem('authUser');
  if (user) {
    try {
      const parsedUser = JSON.parse(user);
      if (parsedUser && parsedUser.email) {
        config.headers['X-Mock-User-Id'] = parsedUser.email;
      }
    } catch (e) {
      console.error('Failed to parse authUser for mock header:', e);
    }
  }
  
  return config;
});

export const getPresignedUrl = async (filename) => {
  const response = await api.post('/presigned-url', { filename });
  return response.data;
};

export const uploadEssay = async (file, presignedUrl) => {
  try {
    await axios.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type || 'text/plain',
      },
    });
    return true;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};

export const createEssay = async (filename, fileKey) => {
  const response = await api.post('/essays', { filename, fileKey });
  return response.data;
};

export const getEssays = async () => {
  const response = await api.get('/essays');
  return response.data;
};

export const getEssay = async (essayId) => {
  const response = await api.get(`/essays/${essayId}`);
  return response.data;
};

export default api;
