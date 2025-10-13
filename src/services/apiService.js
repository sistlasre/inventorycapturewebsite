import axios from 'axios';

// Base API URL - update this with your actual API Gateway URL
const API_BASE_URL = 'https://eadlroekyg.execute-api.us-east-1.amazonaws.com/dev';
const STUPID_MSFT_TYPES_TO_EXTENSION = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-excel": "xls",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx"
}

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        // Skip authorization header when on the register page
        const isOnRegisterPage = window.location.pathname === '/register';

        // Only add token if we're not on the register page
        if (!isOnRegisterPage) {
          const token = localStorage.getItem('token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } else {
          // Remove the Authorization header if it already exists
          if (config.headers.Authorization) {
            delete config.headers.Authorization;
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token expiration
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token) {
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  // Authentication endpoints
  async login(username, password) {
    return this.api.post('/user/signin', { username, password });
  }

  async register(username, password, email='', firstName='', lastName='', parent_user_id='', affiliate_id='') {
    return this.api.post('/user', { 
      username, 
      password, 
      email,
      firstName,
      lastName,
      parent_user_id,
      affiliate_id
    });
  }

  async getUsers(parentUserId = '') {
    const params = parentUserId ? { parentUser: parentUserId } : {};
    return this.api.get('/users', { params });
  }

  async updateUser(userId, userData) {
    return this.api.put(`/user/${userId}`, userData);
  }

  async getUserAccess() {
      return this.api.get('/get_user_access');
  }

  // Project endpoints
  async getUserProjects() {
    return this.api.get('/user/projects');
  }

  async getProjectDetails(projectId) {
    return this.api.get(`/project/${projectId}`);
  }

  async getAllPartsForProject(projectId) {
    return this.api.get(`/project/${projectId}/allparts`);
  }

  async createProject(projectData) {
    return this.api.post('/project/create', projectData);
  }

  async updateProject(projectId, projectData) {
    return this.api.put(`/project/${projectId}`, projectData);
  }

  async deleteProject(projectId) {
    return this.api.delete(`/project/${projectId}`);
  }

  // Box endpoints
  async getBoxDetails(boxId, verbose = false) {
    const params = verbose ? { verbose: 'true' } : {};
    return this.api.get(`/box/${boxId}`, { params });
  }

  async createBox(boxData) {
    return this.api.post('/box/create', boxData);
  }

  async updateBox(boxId, boxData) {
    return this.api.put(`/box/${boxId}`, boxData);
  }

  async deleteBox(boxId) {
    return this.api.delete(`/box/${boxId}`);
  }

  // Part endpoints
  async getPartDetails(partId) {
    return this.api.get(`/part/${partId}`);
  }

  async createPart(partData) {
    return this.api.post('/part', partData);
  }

  async updatePart(partId, partData) {
    return this.api.put(`/part/${partId}`, partData);
  }

  async deletePart(partId) {
    return this.api.delete(`/part/${partId}`);
  }

  async verifyUser(token) {
    return this.api.post('/verify_account', { token });
  }

  async requestPasswordReset(username) {
    return this.api.post('/reset_password', { 
      username, 
      requestType: 'request' 
    });
  }

  async resetPassword(token, password) {
    return this.api.post('/reset_password', { 
      token, 
      password, 
      requestType: 'update' 
    });
  }

  async getStripeSubscriptionPortals() {
    return this.api.get('/subscription_portals');
  }

  async getTariffs(params) {
    return this.api.get('/get_tariffs', { params })
  }

  // Datasheet upload endpoints
  async getPresignedUploadUrlForPackingSlip(file, projectId) {
    const correctFileExtension = STUPID_MSFT_TYPES_TO_EXTENSION[file.type] || file.type.split("/")[1];
    return this.api.post('/get-presigned-url', {
      file_extension: correctFileExtension,
      content_type: file.type,
      isPackingSlip: true,
      projectId
    });
  }

  async uploadFile(presignedUrl, file) {
      // Use a clean axios instance with no interceptors
      return axios.put(presignedUrl, file, {
        headers: {
          'Content-Type': file.type
        }
      });
  }

  // Datasheet upload endpoints
  async getPresignedUploadUrlForDatasheetUpload(mpn) {
    return this.api.post('/get-presigned-url', {
      file_extension: 'pdf',
      content_type: 'application/pdf',
      is_datasheet: true,
      mpn
    });
  }

  async requestReport(params) {
    return this.api.post('/expert_eccn', params);
  }

  async getReport(reportId, reportType = 'eccn') {
    const params = new URLSearchParams({ reportId, reportType });
    return this.api.get('/mpn_datasheet_status', { params });
  }

  async getImageUrl(imageId) {
    return this.api.get(`/image/${imageId}`);
  }

  async updateImage(imageId, updateData) {
    return this.api.put(`/image/${imageId}`, updateData);
  }
}

export const apiService = new ApiService();
