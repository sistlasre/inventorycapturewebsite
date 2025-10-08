import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to decode base64 token (like the mobile app)
const decodeTokenPayload = (token) => {
  try {
    // Our token format is a simple base64 encoded JSON object
    return JSON.parse(atob(token));
  } catch (error) {
    console.warn('Error decoding token:', error);
    return null;
  }
};

// Check if token is expired
const isTokenExpired = (token) => {
  try {
    const payload = decodeTokenPayload(token);
    const now = Math.floor(Date.now() / 1000);

    // Check both 'exp' (JWT standard) and 'expires_at' (our format)
    const expiration = payload.exp || payload.expires_at;
    if (typeof expiration === 'string') {
      // If it's a string, convert to timestamp
      return new Date(expiration).getTime() / 1000 < now;
    }

    return expiration < now;
  } catch (error) {
    console.warn('Error checking token expiration:', error);
    return true;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (storedToken && storedUser) {
          if (!isTokenExpired(storedToken)) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setToken(storedToken);
            apiService.setAuthToken(storedToken);
          } else {
            // Token expired, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
        // Clear potentially corrupted data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    loadAuthState();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await apiService.login(username, password);
      const { user: userData, token: authToken } = response.data;
      
      // Store both user and token
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Update state
      setUser(userData);
      setToken(authToken);
      apiService.setAuthToken(authToken);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.response?.data?.message || error.message || 'Login failed'
      };
    }
  };

  const register = async (username, password, email, firstName='', lastName='', affiliateId='') => {
    try {
      const response = await apiService.register(username, password, email, firstName, lastName, '', affiliateId);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    apiService.setAuthToken(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
