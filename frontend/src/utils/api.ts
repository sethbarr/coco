import axios from 'axios';

// In production the frontend is served by the API server, so /api is same-origin
const baseURL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api');

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Allow cookies to be sent and received
});

// Add token to every request if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const csrfToken = localStorage.getItem('csrfToken');
    
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    
    if (csrfToken) {
      config.headers['x-csrf-token'] = csrfToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If token is invalid/expired and we're not already trying to refresh
    if (
      error.response &&
      error.response.status === 401 &&
      error.config &&
      !error.config.__isRetryRequest
    ) {
      try {
        // Try to refresh the token
        const refreshResponse = await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: {
              'x-auth-token': localStorage.getItem('token'),
              'x-csrf-token': localStorage.getItem('csrfToken')
            },
          }
        );

        const { token, csrfToken } = refreshResponse.data;
        
        // Update token in localStorage
        localStorage.setItem('token', token);
        if (csrfToken) {
          localStorage.setItem('csrfToken', csrfToken);
        }
        
        // Update the authorization header
        error.config.headers['x-auth-token'] = token;
        
        // Retry the original request
        error.config.__isRetryRequest = true;
        return api(error.config);
      } catch (refreshError) {
        // If refresh fails, logout
        localStorage.removeItem('token');
        localStorage.removeItem('csrfToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;