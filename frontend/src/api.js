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

  return response.json();
}

export const api = {
  // Test endpoint to check backend connectivity
  testConnection: () => 
    apiRequest('/', {
      method: 'GET',
    }),

  generateUploadUrl: (filename, mime) => 
    apiRequest('/generate-upload-url', {
      method: 'POST',
      body: JSON.stringify({ filename, mime }),
    }),

  processAudio: (audio_key) => 
    apiRequest('/process-audio', {
      method: 'POST',
      body: JSON.stringify({ audio_key }),
    }),

  askQuestion: (query) => 
    apiRequest('/ask', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),

  // Audio endpoints (updated API)
  listAudioFiles: (page = 1, page_size = 10) => 
    apiRequest(`/audio?page=${page}&page_size=${page_size}`, {
      method: 'GET',
    }),

  getAudioWithTranscription: (document_id) => 
    apiRequest(`/audio/${document_id}`, {
      method: 'GET',
    }),

  deleteAudio: (document_id) => 
    apiRequest(`/audio/${document_id}`, {
      method: 'DELETE',
    }),

  getTranscription: (document_id) => 
    apiRequest(`/transcription/${document_id}`, {
      method: 'GET',
    }),

  // Legacy document endpoints (kept for backwards compatibility)
  listDocuments: () => 
    apiRequest('/documents/', {
      method: 'GET',
    }),

  deleteDocument: (documentId) => 
    apiRequest(`/documents/${documentId}`, {
      method: 'DELETE',
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
};
