import { auth } from './firebase';
import { getIdToken } from 'firebase/auth';

// Use relative path to use Vite's proxy in dev, and Nginx's proxy in prod.
// This solves CORS issues by keeping requests on the same origin.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const GUEST_ID_KEY = 'guestId';

/** Get or create a persistent guest ID (for unauthenticated users). */
export function getOrCreateGuestId() {
  let guestId = localStorage.getItem(GUEST_ID_KEY);
  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }
  return guestId;
}

/** Get current guest ID if any (does not create). */
export function getGuestId() {
  return localStorage.getItem(GUEST_ID_KEY);
}

async function getAuthToken(forceRefresh = false) {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const token = await getIdToken(user, forceRefresh);
    return token || null;
  } catch (error) {
    console.error('Error getting Firebase auth token:', error);
    return null;
  }
}

/** Returns headers for API: Bearer token if authenticated, else X-Guest-ID. */
async function getAuthHeaders() {
  const token = await getAuthToken(false);
  if (token) {
    return { authorization: `Bearer ${token.trim()}` };
  }
  return { 'X-Guest-ID': getOrCreateGuestId() };
}

async function apiRequest(endpoint, options = {}) {
  const authHeaders = await getAuthHeaders();
  const hasToken = 'authorization' in authHeaders;

  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...options.headers,
  };

  if (hasToken) {
    console.log(`Making ${options.method || 'GET'} request to ${endpoint}`, { auth: 'Firebase token' });
  } else if (endpoint !== '/') {
    console.log(`Making ${options.method || 'GET'} request to ${endpoint}`, { auth: 'guest' });
  }

  let response;
  try {
    // Add timeout to fetch requests (30 seconds default, longer for uploads)
    const timeout = options.timeout || 30000; // 30 seconds default
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Check if it was a timeout
      if (fetchError.name === 'AbortError' && controller.signal.aborted) {
        throw new Error(`Request timeout after ${timeout / 1000} seconds. The server may be slow or unresponsive.`);
      }
      throw fetchError;
    }
  } catch (fetchError) {
    // Handle network errors (CORS, connection refused, etc.)
    console.error('Network/Fetch error:', fetchError);
    
    const errorMessage = fetchError.message || String(fetchError);
    
    // Check for connection refused errors
    if (errorMessage.includes('ERR_CONNECTION_REFUSED') || 
        errorMessage.includes('connection refused') ||
        (errorMessage.includes('Failed to fetch') && errorMessage.includes('network'))) {
      throw new Error('Backend server is not available. Please check if the server is running.');
    }
    
    // If it's a CORS error, the backend might be returning an error without CORS headers
    if (errorMessage.includes('CORS') || errorMessage.includes('Failed to fetch')) {
      console.error('CORS or network error detected. This could mean:');
      console.error('1. Backend is not running');
      console.error('2. Backend error response missing CORS headers');
      console.error('3. Network connectivity issue');
      throw new Error('Network/CORS error: Check if backend is running and error responses include CORS headers.');
    }
    throw new Error(`Network error: ${errorMessage}`);
  }

  // If we get a 401 and we used a token, try refreshing
  if (response.status === 401 && hasToken) {
    console.log('Got 401, attempting to refresh Firebase token...');
    const user = auth.currentUser;
    if (user) {
      try {
        const newToken = await getIdToken(user, true);
        if (newToken) {
          headers['authorization'] = `Bearer ${newToken.trim()}`;
          console.log('Retrying with refreshed Firebase token...');
          response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
          });
          console.log('Response after token refresh:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Failed to refresh Firebase token:', error);
      }
    }
    if (response.status === 401) {
      try {
        const errorText = await response.clone().json();
        console.error('Final 401 error:', errorText);
      } catch (e) {
        console.error('Could not parse final error response');
      }
    }
  }

  if (!response.ok) {
    const responseText = await response.text();
    let errorData;
    try {
      errorData = responseText ? JSON.parse(responseText) : {};
    } catch {
      errorData = { detail: responseText || `HTTP ${response.status} ${response.statusText}` };
    }
    const errorMessage = errorData.detail?.[0]?.msg || errorData.detail || errorData.message || `API request failed with status ${response.status}`;

    console.error('API Error:', {
      endpoint,
      status: response.status,
      statusText: response.statusText,
      error: errorMessage,
      errorData
    });

    const isGuestLimit = response.status === 403 && typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('guest limit');
    if (isGuestLimit) {
      const err = new Error(errorMessage || 'Guest limit reached. Please log in to continue.');
      err.guestLimitReached = true;
      throw err;
    }
    if (response.status === 500) {
      throw new Error(`Server error (500): ${errorMessage}. The backend may have encountered an internal error.`);
    } else if (response.status === 401) {
      throw new Error(`Authentication failed: ${errorMessage}`);
    } else if (response.status === 403) {
      throw new Error(`Forbidden: ${errorMessage}`);
    } else if (response.status === 404) {
      throw new Error(`Not found: ${errorMessage}`);
    } else {
      throw new Error(errorMessage);
    }
  }

  // Handle 204 No Content responses (like DELETE operations)
  if (response.status === 204) {
    return null;
  }

  // Check if response has content before parsing JSON
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  return null;
}

export const api = {
  testConnection: () =>
    apiRequest('/', {
      method: 'GET',
    }),

  /** Merge guest data into the current authenticated account. Call after sign-in when guestId existed. */
  mergeGuestAccount: async (guestId) => {
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Must be authenticated to merge guest account');
    }
    return apiRequest('/auth/merge-guest', {
      method: 'POST',
      body: JSON.stringify({ guest_id: guestId }),
    });
  },

  askQuestion: (query) => 
    apiRequest('/ask', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),

  // Conversation endpoints
  createConversation: (title = "New Conversation") => 
    apiRequest('/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  listConversations: (skip = 0, limit = 100) => 
    apiRequest(`/conversations?skip=${skip}&limit=${limit}`, {
      method: 'GET',
    }),

  getConversation: (conversation_id) => 
    apiRequest(`/conversations/${conversation_id}`, {
      method: 'GET',
    }),

  updateConversation: (conversation_id, title) => 
    apiRequest(`/conversations/${conversation_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),

  deleteConversation: (conversation_id) => 
    apiRequest(`/conversations/${conversation_id}`, {
      method: 'DELETE',
    }),

  addMessageToConversation: (conversation_id, role, content) => 
    apiRequest(`/conversations/${conversation_id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role, content }),
    }),

  getConversationMessages: (conversation_id, skip = 0, limit = 100) => 
    apiRequest(`/conversations/${conversation_id}/messages?skip=${skip}&limit=${limit}`, {
      method: 'GET',
    }),

  // Calendar endpoints
  getCalendarData: (start_date, end_date) => 
    apiRequest('/calendar/date-range', {
      method: 'POST',
      body: JSON.stringify({ start_date, end_date }),
    }),

  getCalendarDateDetails: (target_date) => 
    apiRequest(`/calendar/date/${target_date}`, {
      method: 'GET',
    }),

  // Memory endpoints
  uploadMemory: async (file, metadata, onProgress) => {
    const authHeaders = await getAuthHeaders();

    // File size validation (400MB limit - adjust if server allows different)
    const MAX_FILE_SIZE = 400 * 1024 * 1024; // 400MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      throw new Error(`File size (${fileSizeMB} MB) exceeds the maximum allowed size of 400 MB. Please choose a smaller file.`);
    }

    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    // Log request details for debugging
    console.log('Upload request details:', {
      fileName: file.name,
      fileSize: file.size,
      fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
      fileType: file.type,
      hasMetadata: !!metadata,
      metadataSize: metadata ? JSON.stringify(metadata).length : 0
    });

    // Use XMLHttpRequest for upload progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Set timeout (20 minutes for large video files)
      // Nginx timeout is 600s (10 min), but we set longer to account for slow connections
      xhr.timeout = 20 * 60 * 1000; // 20 minutes
      
      // Progress tracking
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.min((e.loaded / e.total) * 100, 100);
            onProgress(percentComplete);
          }
        });
      }
      
      // Handle successful response
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            // If response is not JSON, return as text
            resolve(xhr.responseText);
          }
        } else {
          let errorData;
          try {
            errorData = JSON.parse(xhr.responseText);
          } catch (e) {
            errorData = { detail: `HTTP ${xhr.status} ${xhr.statusText}` };
          }
          
          // Provide helpful error messages for common status codes
          let errorMessage;
          if (xhr.status === 413) {
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            errorMessage = `File too large (${fileSizeMB} MB). The server has a size limit. Please choose a smaller file.`;
          } else {
            errorMessage = errorData.detail?.[0]?.msg || errorData.detail || errorData.message || `Upload failed with status ${xhr.status}`;
          }
          reject(new Error(errorMessage));
        }
      });
      
      // Handle network errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload. Please check your connection and try again.'));
      });
      
      // Handle timeout
      xhr.addEventListener('timeout', () => {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        reject(new Error(`Upload timeout - The file (${fileSizeMB} MB) is too large or your connection is too slow. Please try a smaller file or check your internet connection.`));
      });
      
      // Handle abort
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });
      
      // Open and send request
      xhr.open('POST', `${API_BASE_URL}/memories/upload`);
      if (authHeaders.authorization) {
        xhr.setRequestHeader('Authorization', authHeaders.authorization);
      } else if (authHeaders['X-Guest-ID']) {
        xhr.setRequestHeader('X-Guest-ID', authHeaders['X-Guest-ID']);
      }
      // Don't set Content-Type - let browser set it with boundary for FormData
      xhr.send(formData);
    });
  },

  createMemory: (memoryData) =>
    apiRequest('/memories', {
      method: 'POST',
      body: JSON.stringify(memoryData),
    }),

  createTextMemory: async (textContent, metadata) => {
    const authHeaders = await getAuthHeaders();

    const formData = new URLSearchParams();
    formData.append('text_content', textContent);
    if (metadata && Object.keys(metadata).length > 0) {
      const metadataString = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
      formData.append('metadata', metadataString);
    }

    console.log('Sending text memory request:', {
      text_content_length: textContent.length,
      has_metadata: metadata && Object.keys(metadata).length > 0,
      metadata: metadata && Object.keys(metadata).length > 0 ? metadata : null
    });

    const response = await fetch(`${API_BASE_URL}/memories/text`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      let errorData;
      let errorText;
      try {
        errorText = await response.text();
        console.error('Error response text:', errorText);
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          // If not JSON, use the text as the error message
          errorData = { detail: errorText || `HTTP ${response.status} ${response.statusText}` };
        }
      } catch (e) {
        errorData = { detail: `HTTP ${response.status} ${response.statusText}` };
      }
      
      const errorMessage = errorData.detail?.[0]?.msg || 
                          (Array.isArray(errorData.detail) ? errorData.detail.join(', ') : errorData.detail) || 
                          errorData.message || 
                          errorText ||
                          `Failed to create text memory with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return response.json();
  },

  listMemories: (filters = {}) => {
    const {
      page = 1,
      page_size = 20,
      media_type = null,
      topic = null,
      mood = null,
      status_filter = null,
      search = null,
      tag_ids = null, // Can be array or comma-separated string
    } = filters;

    const params = new URLSearchParams({ 
      page: page.toString(), 
      page_size: page_size.toString() 
    });
    
    if (media_type) params.append('media_type', media_type);
    if (topic) params.append('topic', topic);
    if (mood) params.append('mood', mood.toString());
    if (status_filter) params.append('status_filter', status_filter);
    if (search) params.append('search', search);
    
    // Handle tag_ids as array or string
    if (tag_ids) {
      const tagIdsString = Array.isArray(tag_ids) ? tag_ids.join(',') : tag_ids;
      if (tagIdsString) params.append('tag_ids', tagIdsString);
    }
    
    // Use trailing slash only if the backend requires it; otherwise omit
    return apiRequest(`/memories?${params.toString()}`, {
      method: 'GET',
    });
  },

  getMemory: (memory_id) =>
    apiRequest(`/memories/${memory_id}`, {
      method: 'GET',
    }),

  updateMemory: (memory_id, memoryData) =>
    apiRequest(`/memories/${memory_id}`, {
      method: 'PATCH',
      body: JSON.stringify(memoryData),
    }),

  deleteMemory: (memory_id) =>
    apiRequest(`/memories/${memory_id}`, {
      method: 'DELETE',
    }),

  getMemoryTranscript: (memory_id) =>
    apiRequest(`/memories/${memory_id}/transcript`, {
      method: 'GET',
    }),

  getMemoryAudio: (memory_id) => {
    // Return the URL for the audio file
    // The backend should serve audio files at this endpoint
    return `${API_BASE_URL}/memories/${memory_id}/audio`
  },

  getMemoryAudioUrl: (memory_id) => {
    // Get a signed URL for downloading the memory audio file
    // This should return a signed/presigned URL from the backend
    return apiRequest(`/memories/${memory_id}/audio-url`, {
      method: 'GET',
    })
  },

  getMemoryTextContent: async (memory_id) => {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/memories/${memory_id}/text`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (parseError) {
        try {
          const text = await response.text();
          errorData = { detail: text || `HTTP ${response.status} ${response.statusText}` };
        } catch (textError) {
          errorData = { detail: `HTTP ${response.status} ${response.statusText}` };
        }
      }
      const errorMessage = errorData.detail?.[0]?.msg || errorData.detail || errorData.message || `API request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }
    
    // Parse JSON response and extract content field
    const data = await response.json();
    const content = data?.content || data?.text || '';
    
    // Format the content: replace tabs with spaces, preserve newlines
    return content
      .replace(/\t/g, '  ') // Replace tabs with 2 spaces for better readability
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n'); // Handle Mac line endings
  },

  // Tag endpoints
  createTag: (name, color) =>
    apiRequest('/memories/tags', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    }),

  listTags: () =>
    apiRequest('/memories/tags', {
      method: 'GET',
    }),

  getTag: (tag_id) =>
    apiRequest(`/memories/tags/${tag_id}`, {
      method: 'GET',
    }),

  updateTag: (tag_id, name, color) =>
    apiRequest(`/memories/tags/${tag_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, color }),
    }),

  deleteTag: (tag_id) =>
    apiRequest(`/memories/tags/${tag_id}`, {
      method: 'DELETE',
    }),
};
