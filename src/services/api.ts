/**
 * API Service for STREAMIA application
 * Handles all HTTP requests to the backend using Fetch API
 */
/**
 * API Service for STREAMIA application
 * Handles all HTTP requests to the backend using Fetch API
 */
 
/**
 * API utilities and typed wrapper for HTTP requests used by the STREAMIA client.
 *
 * This module exports helper functions that handle token management, a
 * makeRequest wrapper around fetch, and domain-specific API functions
 * (auth, movies, etc.). Responses are normalized to ApiResponse<T>.
 */
import { config } from '../config/environment';

// Base URL from configuration
const API_BASE_URL = config.API_BASE_URL;

/**
 * HTTP request configuration interface
 */
interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
}

/**
 * API Response interface
 */
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  status?: number;
}

/**
 * User interface for authentication
 */
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  email: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Login credentials interface
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Register data interface
 */
export interface RegisterData {
  firstName: string;
  lastName: string;
  age: number;
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Change password interface
 */
export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

/**
 * Login response interface
 */
export interface LoginResponse {
  user: User;
  token: string;
}



/**
 * Generic HTTP request function.
 *
 * Wraps fetch and automatically attaches JSON headers and Authorization
 * when a token is available via `apiUtils.getToken()`. Normalizes responses
 * into ApiResponse<T> objects and maps some common HTTP status codes to
 * friendly error messages.
 *
 * @param endpoint - Path appended to the API base URL (e.g. '/users/login')
 * @param config - Request configuration: method, headers and optional body
 * @returns ApiResponse<T> - Normalized response with success/data or error
 */
async function makeRequest<T>(
  endpoint: string, 
  config: RequestConfig
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Include Authorization header automatically when token is present
    const token = apiUtils.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    } as Record<string, string>;

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...config,
      headers,
    });

    if (response.status === 204) {
      return {
        success: true,
        data: {} as T
      };
    }

    const data = await response.json();

    if (!response.ok) {
      // Map some common HTTP status codes to friendly messages
      let errorMsg = data?.message || `HTTP Error: ${response.status}`;
      if (response.status === 409) {
        // Conflict - usually used when resource (like email) already exists
        errorMsg = 'El correo ya está registrado';
      } else if (response.status === 401) {
        // Unauthorized - token invalid or credentials wrong
        // Remove token locally to force re-authentication
        apiUtils.removeToken();
        errorMsg = 'Sesión expirada. Inicia sesión de nuevo';
      } else if (response.status === 400) {
        // Bad Request - validation or malformed data
        errorMsg = data?.message || 'Solicitud inválida';
      }

      return {
        success: false,
        status: response.status,
        error: errorMsg,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred',
    };
  }
}

  /**
   * Authentication API functions
   */
export const authAPI = {


  /**
   * Login user with email and password.
   *
   * @param credentials - Object containing email and password
   * @returns ApiResponse<LoginResponse>
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    return makeRequest<LoginResponse>('/api/users/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  /**
   * Register new user and return authentication payload.
   *
   * @param userData - Registration payload
   * @returns ApiResponse<LoginResponse>
   */
  async register(userData: RegisterData): Promise<ApiResponse<LoginResponse>> {
    return makeRequest<LoginResponse>('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  /**
   * Logout user on the server side.
   *
   * @param token - Current authentication token
   * @returns ApiResponse
   */
  async logout(token: string): Promise<ApiResponse> {
    return makeRequest('/api/users/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  /**
   * Request password recovery email for the given address.
   *
   * @param email - User email to send recovery instructions to
   * @returns ApiResponse
   */
  async recoverPassword(email: string): Promise<ApiResponse> {
    return makeRequest('/api/users/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Reset password with token.
   *
   * @param token - Reset token from email
   * @param newPassword - New password to set
   * @returns ApiResponse
   */
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
    return makeRequest('/api/users/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },

  /**
   * Get the current user's profile using the provided token.
   *
   * @param token - Authentication token
   * @returns ApiResponse<User>
   */
  async getProfile(token: string): Promise<ApiResponse<User>> {
    return makeRequest<User>('/api/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  /**
   * Update the user's profile.
   *
   * @param token - Authentication token
   * @param userData - Partial profile fields to update
   * @returns ApiResponse<User>
   */
  async updateProfile(
    token: string, 
    userData: Partial<RegisterData>
  ): Promise<ApiResponse<User>> {
    return makeRequest<User>('/api/users/me', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });
  },

  /**
   * Delete the authenticated user's account.
   *
   * @param token - Authentication token
   * @returns ApiResponse
   */
  async deleteAccount(token: string, password: string): Promise<ApiResponse> {
    return makeRequest('/api/users/me', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });
  },
};

/**
 * Movies API functions (for future implementation).
 */
export const moviesAPI = {
  /**
   * Get all movies from the API.
   *
   * @param token - Authentication token
   * @returns ApiResponse<any[]>
   */
  async getMovies(token: string): Promise<ApiResponse<any[]>> {
    return makeRequest<any[]>('/movies', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  /**
   * Get a single movie by its id.
   *
   * @param token - Authentication token
   * @param movieId - ID of the movie
   * @returns ApiResponse<any>
   */
  async getMovieById(token: string, movieId: string): Promise<ApiResponse<any>> {
    return makeRequest<any>(`/movies/${movieId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};

/**
 * Utility functions for token management and simple auth helpers.
 */
export const apiUtils = {
  /**
   * Get the saved authentication token from localStorage.
   * @returns token string or null when not present
   */
  getToken(): string | null {
    return localStorage.getItem('streamia_token');
  },

  /**
   * Save an authentication token to localStorage.
   * @param token - Token string to save
   */
  saveToken(token: string): void {
    localStorage.setItem('streamia_token', token);
  },

  /**
   * Remove the authentication token from localStorage.
   */
  removeToken(): void {
    localStorage.removeItem('streamia_token');
  },

  /**
   * Return whether a token exists in storage (proxy for authenticated state).
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};

