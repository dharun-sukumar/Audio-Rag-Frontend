import { auth } from './firebase';
import { getIdToken } from 'firebase/auth';

const API_BASE_URL = 'http://38.242.215.255:8000';

async function getAuthToken(forceRefresh = false) {
  const user = auth.currentUser;
  if (!user) {
    console.warn('No user authenticated - cannot get token');
    return null;
  }
  try {
    // Get Firebase ID token (always use Firebase, not Google OAuth)
    const token = await getIdToken(user, forceRefresh);
    if (!token) {
      console.error('getIdToken returned null/undefined');
      return null;
    }
    console.log('Firebase ID token retrieved:', {
      length: token.length,
      preview: `${token.substring(0, 50)}...`,
      forceRefresh
    });
    return token;
  } catch (error) {
    console.error('Error getting Firebase auth token:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message
    });
    return null;
  }
}

async function apiRequest(endpoint, options = {}) {
  // Get Firebase ID token (don't force refresh unless needed - use cached token if valid)
  let token = await getAuthToken(false);
  
  if (!token && endpoint !== '/') {
    console.warn(`No Firebase auth token available for request to ${endpoint}`);
  }

  // Build headers - ensure authorization header is properly formatted
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Add authorization header if token exists
  if (token) {
    // Trim token to remove any whitespace and format as Bearer token
    const cleanToken = token.trim();
    headers['authorization'] = `Bearer ${cleanToken}`;
    
    // Log full token for debugging (user can copy this to test in Insomnia)
    console.log('🔑 Full token being sent (copy this to test in Insomnia):', cleanToken);
  }

  // Log token details for debugging (first 50 chars only for security)
  console.log(`Making ${options.method || 'GET'} request to ${endpoint}`, {
    hasToken: !!token,
    tokenLength: token?.length,
    tokenPreview: token ? `${token.substring(0, 50)}...` : 'none',
    tokenType: 'Firebase ID Token',
    authorizationHeader: headers['authorization'] ? `${headers['authorization'].substring(0, 60)}...` : 'missing'
  });

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (fetchError) {
    // Handle network errors (CORS, connection refused, etc.)
    console.error('Network/Fetch error:', fetchError);
    
    // If it's a CORS error, the backend might be returning an error without CORS headers
    if (fetchError.message.includes('CORS') || fetchError.message.includes('Failed to fetch')) {
      console.error('CORS or network error detected. This could mean:');
      console.error('1. Backend is not running');
      console.error('2. Backend error response missing CORS headers');
      console.error('3. Network connectivity issue');
      throw new Error('Network/CORS error: Check if backend is running and error responses include CORS headers.');
    }
    throw new Error(`Network error: ${fetchError.message}`);
  }

  // If we get a 401, try refreshing the Firebase token
  if (response.status === 401 && token) {
    console.log('Got 401, attempting to refresh Firebase token...');
    
    // First, let's see what the error message is
    let errorData;
    try {
      errorData = await response.clone().json();
      console.error('401 Error details:', errorData);
    } catch (e) {
      console.error('Could not parse 401 error response');
    }
    
    const user = auth.currentUser;
    if (user) {
      try {
        // Force refresh Firebase token
        token = await getIdToken(user, true);
        if (token) {
          headers['authorization'] = `Bearer ${token.trim()}`;
          console.log('Retrying with refreshed Firebase token...', {
            tokenLength: token.length,
            tokenPreview: `${token.substring(0, 50)}...`
          });
          console.log('🔑 NEW refreshed token (copy to test):', token);
          
          response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
          });
          
          // Log the response status after retry
          console.log('Response after token refresh:', response.status, response.statusText);
        } else {
          console.error('Token refresh returned null/undefined');
        }
      } catch (error) {
        console.error('Failed to refresh Firebase token:', error);
      }
    } else {
      console.error('No user found when trying to refresh token');
    }
    
    // If still 401 after refresh, the token is truly invalid
    if (response.status === 401) {
      console.error('Firebase token refresh failed, user may need to sign in again');
      // Try to get the error message
      try {
        const errorText = await response.clone().json();
        console.error('Final 401 error:', errorText);
      } catch (e) {
        console.error('Could not parse final error response');
      }
    }
  }

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (parseError) {
      // If response is not JSON, try to get text
      try {
        const text = await response.text();
        errorData = { detail: text || `HTTP ${response.status} ${response.statusText}` };
      } catch (textError) {
        errorData = { detail: `HTTP ${response.status} ${response.statusText}` };
      }
    }
    
    const errorMessage = errorData.detail?.[0]?.msg || errorData.detail || errorData.message || `API request failed with status ${response.status}`;
    
    // Log detailed error for debugging
    console.error('API Error:', {
      endpoint,
      status: response.status,
      statusText: response.statusText,
      hasToken: !!token,
      tokenLength: token?.length,
      error: errorMessage,
      tokenType: 'Firebase ID Token',
      errorData
    });
    
    // Provide more helpful error messages
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
  // Test endpoint to check backend connectivity
  testConnection: () => 
    apiRequest('/', {
      method: 'GET',
    }),

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
    apiRequest(`/conversations/?skip=${skip}&limit=${limit}`, {
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
    uploadMemory: async (file, metadata) => {
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('No authentication token available');
    }

    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await fetch(`${API_BASE_URL}/memories/upload`, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${token.trim()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { detail: `HTTP ${response.status} ${response.statusText}` };
      }
      const errorMessage = errorData.detail?.[0]?.msg || errorData.detail || errorData.message || `Upload failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return response.json();
  },

  createMemory: (memoryData) =>
    apiRequest('/memories', {
      method: 'POST',
      body: JSON.stringify(memoryData),
    }),

  createTextMemory: async (textContent, metadata) => {
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('No authentication token available');
    }

    // Prepare form data
    const formData = new URLSearchParams();
    formData.append('text_content', textContent);
    
    // Only add metadata if it exists and has content
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
        'authorization': `Bearer ${token.trim()}`,
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
    // Get the text content for a text memory from the source_key file
    // This endpoint returns JSON with a "content" field containing the text
    const token = await getAuthToken(false);
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['authorization'] = `Bearer ${token.trim()}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/memories/${memory_id}/text`, {
      method: 'GET',
      headers,
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
