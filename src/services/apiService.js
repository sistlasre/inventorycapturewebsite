import axios from 'axios';

// Base API URL - update this with your actual API Gateway URL
const API_BASE_URL = 'https://eadlroekyg.execute-api.us-east-1.amazonaws.com/dev';

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
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
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

  async register(username, password, email='', parent_user_id='') {
    return this.api.post('/user', { 
      username, 
      password, 
      email,
      parent_user_id
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

  async getStripeSubscriptionPortals() {
    return this.api.get('/subscription_portals');
  }

  async getTariffs(params) {
    return this.api.get('/get_tariffs', { params })
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

  async uploadPdf(presignedUrl, file) {
    return this.api.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type
      }
    });
  }

  async requestReport(mpn, eccn) {
    return this.api.post('/expert_eccn', {
      mpn: mpn || '',
      eccn: eccn || ''
    });
  }

  async getReport(report_id) {
    const params = new URLSearchParams({ reportId: report_id });
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
