  import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useParams, Routes, Route } from 'react-router-dom'
import './App.css'
import { auth, googleProvider } from './firebase'
import { signInWithPopup, signOut, onAuthStateChanged, getIdToken } from 'firebase/auth'
import { api } from './api'

const SCREENS = {
  MAIN: 'main',
  RECORD: 'record',
  UPLOAD: 'upload',
  REVIEW: 'review',
  WORKSPACE: 'workspace',
  PROCESSING: 'processing',
  LOGIN: 'login',
  VIEW_RECORDING: 'view_recording', // Legacy screen for viewing recording + transcription
  VIEW_MEMORY: 'view_memory', // Screen for viewing memory details with audio and transcription
  CREATE_TEXT_MEMORY: 'create_text_memory', // Screen for creating text-based memories
}

const PROCESS_STATUS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  TRANSCRIBING: 'transcribing',
  INDEXING: 'indexing',
  READY: 'ready',
  FAILED: 'failed'
}

function AppContent() {
  const navigate = useNavigate()
  const { conversationId } = useParams()
  const [currentScreen, setCurrentScreen] = useState(SCREENS.MAIN)
  const [processStatus, setProcessStatus] = useState(PROCESS_STATUS.IDLE)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [messages, setMessages] = useState([])
  const [inputQuery, setInputQuery] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [conversations, setConversations] = useState([])
  const [editingConversationId, setEditingConversationId] = useState(null)
  const [editingConversationTitle, setEditingConversationTitle] = useState('')
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [showCalendarDropdown, setShowCalendarDropdown] = useState(false)
  const [calendarActivity, setCalendarActivity] = useState({})
  const [loadedCalendarMonths, setLoadedCalendarMonths] = useState(new Set())
  const [selectedDateDetails, setSelectedDateDetails] = useState(null)
  const [showDateDetailsModal, setShowDateDetailsModal] = useState(false)
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [toasts, setToasts] = useState([])
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [savedRecordingDuration, setSavedRecordingDuration] = useState(0)
  const [activeTab, setActiveTab] = useState('chat') 
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [recordingName, setRecordingName] = useState('')
  
  // Authentication state
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [imageError, setImageError] = useState(new Set())
  const [authToken, setAuthToken] = useState(null)
  
  // New state for viewing recording
  const [selectedRecording, setSelectedRecording] = useState(null)
  const [recordingTranscription, setRecordingTranscription] = useState(null)
  const [loadingRecording, setLoadingRecording] = useState(false)
  
  const [highlightedTimestamp, setHighlightedTimestamp] = useState(null)
  
  const [currentTranscript, setCurrentTranscript] = useState([
    { speaker: 'Speaker 1', timestamp: '0:00', text: 'Welcome to the strategy session. We are here to talk about the Q3 expansion.' },
    { speaker: 'Speaker 2', timestamp: '0:15', text: 'The focus should be on European markets specifically.' },
    { speaker: 'Speaker 1', timestamp: '0:42', text: 'Agreed. Let us look at the budget allocation for Berlin and Paris.' }
  ])
  
  // Memory and tag state
  const [memories, setMemories] = useState([])
  const [memoryPagination, setMemoryPagination] = useState({ total: 0, page: 1, page_size: 20, total_pages: 0 })
  const [memoriesLoading, setMemoriesLoading] = useState(true)
  const [tags, setTags] = useState([])
  const [memoryText, setMemoryText] = useState('')
  const [memoryTitle, setMemoryTitle] = useState(null)
  const [hasEditedTitle, setHasEditedTitle] = useState(false)
  const [memoryTopic, setMemoryTopic] = useState('')
  const [memoryMood, setMemoryMood] = useState(null)
  const [memoryPeople, setMemoryPeople] = useState('')
  const [memoryDate, setMemoryDate] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [showTagModal, setShowTagModal] = useState(false)
  const [showTagManagementModal, setShowTagManagementModal] = useState(false)
  const [showMemoryDetailModal, setShowMemoryDetailModal] = useState(false)
  const [selectedMemory, setSelectedMemory] = useState(null)
  const [selectedMemoryTranscript, setSelectedMemoryTranscript] = useState(null)
  const [loadingTranscript, setLoadingTranscript] = useState(false)
  const [loadingMemory, setLoadingMemory] = useState(false)
  const [editingMemory, setEditingMemory] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#10a37f')
  
  // Memory filters
  const [memorySearchQuery, setMemorySearchQuery] = useState('')
  const [memoryMediaTypeFilter, setMemoryMediaTypeFilter] = useState(null)
  const [memoryMoodFilter, setMemoryMoodFilter] = useState(null)
  const [memoryStatusFilter, setMemoryStatusFilter] = useState(null)
  const [memoryTopicFilter, setMemoryTopicFilter] = useState('')
  const [selectedFilterTags, setSelectedFilterTags] = useState([])
  
  // Search modal state
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState({ conversations: [], memories: [] })
  const [isSearching, setIsSearching] = useState(false)
  
  // Create Memory dropdown state
  const [showCreateMemoryDropdown, setShowCreateMemoryDropdown] = useState(false)
  
  // Refs for search optimization
  const searchAbortControllerRef = useRef(null)
  const conversationsCacheRef = useRef([])
  
  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState({
    show: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: null,
    type: 'warning' // 'warning', 'danger', 'info'
  })
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)
  const fileInputRef = useRef(null)
  const chatEndRef = useRef(null)
  const audioPlayerRef = useRef(null)
  const recordingAudioRef = useRef(null)
  const activeUtteranceRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationFrameRef = useRef(null)
  const dataArrayRef = useRef(null)
  const authLoadingRef = useRef(true)
  const userRef = useRef(null)
  // When we create a conversation from the first message, skip the route effect loading it (we handle messages in askQuestion)
  const skipLoadForConversationIdRef = useRef(null)
  

  // Audio playback state
  const [audioUrl, setAudioUrl] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [waveformData, setWaveformData] = useState(new Array(32).fill(0))
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [activeUtteranceIndex, setActiveUtteranceIndex] = useState(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  // Auto-scroll to active utterance
  useEffect(() => {
    if (activeUtteranceIndex !== null && activeUtteranceRef.current) {
      activeUtteranceRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      })
    }
  }, [activeUtteranceIndex])

  // Create/cleanup audio URL when file is selected
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile)
      setAudioUrl(url)
      setIsPlaying(false)
      return () => {
        URL.revokeObjectURL(url)
        setAudioUrl(null)
      }
    }
  }, [selectedFile])


  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000)
    } else {
      clearInterval(recordingTimerRef.current)
      setRecordingTime(0)
    }
    return () => clearInterval(recordingTimerRef.current)
  }, [isRecording])

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      userRef.current = user
      setAuthLoading(false)
      authLoadingRef.current = false
      setImageError(new Set())
      if (user) {
        setShowLoginModal(false)
        try {
          const token = await getIdToken(user)
          setAuthToken(token)
        } catch (error) {
          console.error('Error getting auth token:', error)
          setAuthToken(null)
        }
      } else {
        setAuthToken(null)
      }
    })

    return () => unsubscribe()
  }, [])


  useEffect(() => {
    if (user) {
      // Only fetch if auth is fully loaded
      if (!authLoading) {
        // Fetch both in parallel for faster loading
        Promise.allSettled([
          fetchConversations(),
          fetchMemories()
        ]).catch(err => {
          console.error('Error during initial data fetch:', err)
        })
      }
      // Tags are lazy-loaded when needed (when opening tag modal or creating memory)
    } else {
      setConversations([])
      setMemories([])
      setTags([])
      setMemoriesLoading(false)
    }
  }, [user, authLoading])

  // Refresh tokens periodically (tokens expire after 1 hour)
  useEffect(() => {
    if (!user) return

    const refreshTokens = async () => {
      try {
        const token = await getIdToken(user, true)
        setAuthToken(token)
        console.log('Firebase token refreshed successfully')
      } catch (error) {
        console.error('Error refreshing auth token:', error)
        if (error.code === 'auth/user-token-expired' || error.code === 'auth/requires-recent-login') {
          console.warn('Token expired, user may need to re-authenticate')
        }
      }
    }

    const interval = setInterval(refreshTokens, 50 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [user])

  // Keyboard shortcut handler for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearchModal(true)
        setSearchQuery('')
        setSearchResults({ conversations: [], memories: [] })
      }
      
      // Close search modal on Escape
      if (e.key === 'Escape' && showSearchModal) {
        setShowSearchModal(false)
        setSearchQuery('')
        setSearchResults({ conversations: [], memories: [] })
      }
      
      // Close create memory dropdown on Escape
      if (e.key === 'Escape' && showCreateMemoryDropdown) {
        setShowCreateMemoryDropdown(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSearchModal, showCreateMemoryDropdown])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showCreateMemoryDropdown) return
    
    const handleClickOutside = (e) => {
      if (!e.target.closest('.create-memory-dropdown')) {
        setShowCreateMemoryDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showCreateMemoryDropdown])

  // Memoized search function with proper error handling and request cancellation
  const performSearch = useCallback(async (query) => {
    const trimmedQuery = query.trim()
    
    // Minimum query length to avoid too many API calls
    if (trimmedQuery.length < 2) {
      setSearchResults({ conversations: [], memories: [] })
      setIsSearching(false)
      return
    }

    // Cancel any in-flight requests
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort()
    }

    // Create new AbortController for this request
    const abortController = new AbortController()
    searchAbortControllerRef.current = abortController

    setIsSearching(true)

    try {
      // Search conversations (use cached data if available, otherwise fetch)
      let conversationsData = conversationsCacheRef.current
      if (conversationsData.length === 0) {
        conversationsData = await api.listConversations(0, 100)
        conversationsCacheRef.current = conversationsData
      }
      
      // Client-side filter conversations (fast, no API call needed)
      const filteredConversations = conversationsData.filter(conv => 
        conv.title?.toLowerCase().includes(trimmedQuery.toLowerCase())
      )

      // Search memories via API (only if query is long enough)
      let filteredMemories = []
      if (trimmedQuery.length >= 2) {
        const memoriesData = await api.listMemories({ 
          search: trimmedQuery, 
          page: 1, 
          page_size: 20 
        })
        filteredMemories = memoriesData.items || []
      }

      // Check if request was aborted
      if (abortController.signal.aborted) {
        return
      }

      setSearchResults({
        conversations: filteredConversations,
        memories: filteredMemories
      })
    } catch (err) {
      // Don't show error if request was aborted
      if (err.name === 'AbortError' || abortController.signal.aborted) {
        return
      }
      console.error('Search error:', err)
      setSearchResults({ conversations: [], memories: [] })
    } finally {
      if (!abortController.signal.aborted) {
        setIsSearching(false)
      }
    }
  }, [])

  // Debounced search with proper cleanup
  useEffect(() => {
    if (!showSearchModal) {
      // Clear results when modal closes
      setSearchResults({ conversations: [], memories: [] })
      setSearchQuery('')
      // Cancel any in-flight requests
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort()
        searchAbortControllerRef.current = null
      }
      return
    }

    // Clear results immediately if query is empty
    if (!searchQuery.trim()) {
      setSearchResults({ conversations: [], memories: [] })
      setIsSearching(false)
      return
    }

    // Debounce: wait 500ms after user stops typing before searching
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery)
    }, 500)

    return () => {
      clearTimeout(timeoutId)
      // Cancel request if component unmounts or query changes
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort()
        searchAbortControllerRef.current = null
      }
    }
  }, [searchQuery, showSearchModal, performSearch])

  // Refresh conversations cache when conversations change
  useEffect(() => {
    if (conversations.length > 0) {
      conversationsCacheRef.current = conversations
    }
  }, [conversations])

  // Lazy-load tags when needed (tag modal opens or on memory creation screens)
  useEffect(() => {
    if (!user) return
    
    const needsTags = showTagModal || 
                     showTagManagementModal || 
                     currentScreen === SCREENS.REVIEW || 
                     currentScreen === SCREENS.CREATE_TEXT_MEMORY
    
    // Only fetch if tags are needed and not already loaded
    if (needsTags && tags.length === 0) {
      fetchTags()
    }
  }, [user, showTagModal, showTagManagementModal, currentScreen, tags.length])

  // Reset form when navigating to CREATE_TEXT_MEMORY screen
  useEffect(() => {
    if (currentScreen === SCREENS.CREATE_TEXT_MEMORY) {
      setMemoryTitle(null)
      setHasEditedTitle(false)
      setMemoryText('')
      setMemoryTopic('')
      setMemoryMood(null)
      setMemoryPeople('')
      setSelectedTags([])
      setErrorMessage('')
    }
  }, [currentScreen])

  // Fetch calendar data when calendar date changes or dropdown opens
  useEffect(() => {
    if (user && showCalendarDropdown) {
      fetchCalendarData(calendarDate)
    }
  }, [user, calendarDate, showCalendarDropdown])

  // Copy token to clipboard
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00'
    const totalSeconds = Math.floor(seconds)
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Helper to get valid audio duration (handles Infinity/NaN)
  const getValidDuration = () => {
    if (audioDuration && isFinite(audioDuration) && audioDuration > 0) {
      return audioDuration
    }
    return savedRecordingDuration || 1
  }

  // Authentication functions
  const handleGoogleSignIn = async () => {
    try {
      setErrorMessage('')
      await signInWithPopup(auth, googleProvider)
      console.log('Signed in successfully - using Firebase ID token for API calls')
    } catch (error) {
      console.error('Sign in error:', error)
      if (error.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign in was cancelled.')
      } else if (error.code === 'auth/popup-blocked') {
        setErrorMessage('Popup was blocked. Please allow popups and try again.')
      } else {
        setErrorMessage(`Sign in failed: ${error.message}`)
      }
    }
  }

  const handleSignOut = async () => {
    const confirmed = await showConfirmation({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      type: 'warning'
    })
    
    if (!confirmed) return
    
    try {
      await signOut(auth)
      setMessages([])
      setCurrentConversationId(null)
      setShowProfileDialog(false)
      navigate('/')
    } catch (error) {
      console.error('Sign out error:', error)
      setErrorMessage('Failed to sign out.')
    }
  }

  // Get or create a conversation id without navigating. Used when sending the first message so we can set the user message in state before navigating (avoids AI showing before user).
  const getOrCreateConversationIdForFirstMessage = async () => {
    if (!(await requireAuth('create conversation'))) return null
    try {
      if (currentConversationId && messages.length === 0) return currentConversationId
      let mostRecentEmpty = null
      let mostRecentDate = 0
      for (const conv of conversations) {
        const messageCount = conv.message_count ?? 0
        if (messageCount === 0) {
          const createdDate = new Date(conv.created_at || 0).getTime()
          if (createdDate > mostRecentDate) {
            mostRecentDate = createdDate
            mostRecentEmpty = conv
          }
        }
      }
      if (mostRecentEmpty) return mostRecentEmpty.id
      const conversation = await api.createConversation('New Chat')
      setConversations(prev => [conversation, ...prev])
      fetchConversations().catch(err => console.error('Error refreshing conversations:', err))
      if (showCalendarDropdown) fetchCalendarData(calendarDate)
      return conversation.id
    } catch (err) {
      console.error('Failed to create conversation:', err)
      setErrorMessage(`Failed to create conversation: ${err.message}`)
      showToast('Failed to create conversation', 'error')
      return null
    }
  }

  // Create a new conversation or navigate to existing empty one.
  // Returns the conversation id to use, or null on failure.
  const createNewConversation = async () => {
    if (!(await requireAuth('create conversation'))) return null
    try {
      if (currentConversationId && messages.length === 0) {
        setCurrentScreen(SCREENS.MAIN)
        navigate(`/conversation/${currentConversationId}`)
        return currentConversationId
      }
      let mostRecentEmpty = null
      let mostRecentDate = 0
      for (const conv of conversations) {
        const messageCount = conv.message_count ?? 0
        if (messageCount === 0) {
          const createdDate = new Date(conv.created_at || 0).getTime()
          if (createdDate > mostRecentDate) {
            mostRecentDate = createdDate
            mostRecentEmpty = conv
          }
        }
      }
      if (mostRecentEmpty) {
        navigate(`/conversation/${mostRecentEmpty.id}`)
        return mostRecentEmpty.id
      }
      const conversation = await api.createConversation('New Chat')
      setConversations(prev => [conversation, ...prev])
      navigate(`/conversation/${conversation.id}`)
      fetchConversations().catch(err => console.error('Error refreshing conversations:', err))
      if (showCalendarDropdown) fetchCalendarData(calendarDate)
      return conversation.id
    } catch (err) {
      console.error('Failed to create conversation:', err)
      setErrorMessage(`Failed to create conversation: ${err.message}`)
      showToast('Failed to create conversation', 'error')
      return null
    }
  }


  // Load a conversation (public function that navigates)
  const loadConversation = async (conversation) => {
    if (!(await requireAuth('load conversation'))) return
    
    // Set loading state immediately for better UX
    setLoadingConversation(true)
    setMessages([])
    setCurrentScreen(SCREENS.MAIN)
    
    // Navigate to the conversation route
    navigate(`/conversation/${conversation.id}`)
  }

  // Start editing conversation title
  const startEditingConversation = (conversation, e) => {
    e.stopPropagation()
    setEditingConversationId(conversation.id)
    setEditingConversationTitle(conversation.title || 'Untitled Chat')
  }

  // Save conversation title
  const saveConversationTitle = async (conversationId) => {
    if (!editingConversationTitle.trim()) {
      setEditingConversationId(null)
      return
    }
    
    try {
      console.log('Updating conversation title:', conversationId, editingConversationTitle)
      await api.updateConversation(conversationId, editingConversationTitle.trim())
      
      // Update local state
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, title: editingConversationTitle.trim() } 
            : conv
        )
      )
      
      setEditingConversationId(null)
      setEditingConversationTitle('')
      showToast('Conversation renamed', 'success')
      console.log('Conversation title updated successfully')
    } catch (err) {
      console.error('Failed to update conversation title:', err)
      setErrorMessage(`Failed to rename conversation: ${err.message}`)
      showToast('Failed to rename conversation', 'error')
      setEditingConversationId(null)
    }
  }

  // Cancel editing conversation title
  const cancelEditingConversation = () => {
    setEditingConversationId(null)
    setEditingConversationTitle('')
  }

  // Delete a conversation
  const deleteConversation = async (conversationId, e) => {
    if (e) {
      e.stopPropagation()
    }
    
    const confirmed = await showConfirmation({
      title: 'Delete Conversation',
      message: 'Are you sure you want to delete this conversation? All messages will be lost.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    })
    
    if (!confirmed) {
      return
    }
    
    // Store the conversation for potential rollback
    const conversationToDelete = conversations.find(conv => conv.id === conversationId)
    
    // OPTIMISTIC UPDATE - Remove from UI immediately
    console.log('Deleting conversation (optimistic):', conversationId)
    setConversations(prev => prev.filter(conv => conv.id !== conversationId))
    
    // If we're deleting the current conversation, clear it and navigate away
    if (currentConversationId === conversationId) {
      setCurrentConversationId(null)
      setMessages([])
      navigate('/')
    }
    
    try {
      // Call API in background
      await api.deleteConversation(conversationId)
      console.log('Conversation deleted successfully on server')
      showToast('Conversation deleted', 'success')
    } catch (err) {
      console.error('Failed to delete conversation:', err)
      setErrorMessage(`Failed to delete conversation: ${err.message}`)
      showToast('Failed to delete conversation', 'error')
      
      // ROLLBACK - Restore the conversation if API call failed
      if (conversationToDelete) {
        console.log('Rolling back deletion, restoring conversation')
        setConversations(prev => [...prev, conversationToDelete].sort((a, b) => 
          new Date(b.updated_at) - new Date(a.updated_at)
        ))
      }
    }
  }

  // Check if user needs to login for protected actions
  const requireAuth = async (action) => {
    // Wait for auth to finish loading before checking user
    if (authLoadingRef.current) {
      // Wait for auth to finish loading (max 2 seconds)
      let attempts = 0
      while (authLoadingRef.current && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }
    }
    
    // Check user state - use both ref and Firebase's currentUser as fallback
    // Firebase's currentUser is synchronous and available immediately if logged in
    const currentUser = userRef.current || auth.currentUser
    
    if (!currentUser) {
      setShowLoginModal(true)
      return false
    }
    
    // Update refs if they're out of sync (shouldn't happen, but just in case)
    if (userRef.current !== currentUser) {
      userRef.current = currentUser
    }
    
    return true
  }

  // Load a conversation by ID (internal function)
  const loadConversationById = useCallback(async (conversationId) => {
    if (!(await requireAuth('load conversation'))) return
    
    setLoadingConversation(true)
    try {
      console.log('Loading conversation by ID:', conversationId)
      setCurrentConversationId(conversationId)
      setErrorMessage('')
      
      // Navigate to main chat screen
      setCurrentScreen(SCREENS.MAIN)
      
      // Fetch messages for this conversation
      const messages = await api.getConversationMessages(conversationId, 0, 100)
      console.log('Messages fetched:', messages)
      
      // Don't overwrite messages if we're in the middle of sending the first message (askQuestion owns the state)
      if (skipLoadForConversationIdRef.current) {
        console.log('Skipping setMessages in loadConversationById (first-message flow active)')
      } else {
        // Ensure chronological order (backend may return newest first)
        const list = messages || []
        const sorted = list.length && (list[0].created_at ?? list[0].id)
          ? [...list].sort((a, b) => new Date(a.created_at || a.id || 0) - new Date(b.created_at || b.id || 0))
          : list
        setMessages(sorted)
      }
      
      if (window.innerWidth < 1024) setSidebarOpen(false)
    } catch (err) {
      console.error('Failed to load conversation:', err)
      setErrorMessage(`Failed to load conversation: ${err.message}`)
      // Clear messages on error (unless we're in first-message flow)
      if (!skipLoadForConversationIdRef.current) setMessages([])
    } finally {
      setLoadingConversation(false)
    }
  }, [])

  // Load conversation from URL parameter
  useEffect(() => {
    if (!user) return
    
    if (conversationId) {
      // Skip if we're in the middle of creating/sending first message (askQuestion owns the state; ref is true or the new id)
      if (skipLoadForConversationIdRef.current) return
      // Only load if it's different from current conversation
      if (conversationId !== currentConversationId) {
        // Wait for conversations to load if not available yet
        if (conversations.length === 0) {
          // Conversations not loaded yet, wait a bit
          return
        }
        
        const conversation = conversations.find(conv => conv.id === conversationId)
        if (conversation) {
          loadConversationById(conversationId)
        } else {
          // Conversation not found, navigate to home
          navigate('/')
          setCurrentConversationId(null)
          setMessages([])
        }
      }
    } else if (!conversationId && currentConversationId) {
      // URL doesn't have conversationId but we have one loaded - clear it (unless we're sending first message from clean chat)
      if (skipLoadForConversationIdRef.current) return
      setCurrentConversationId(null)
      setMessages([])
    }
  }, [conversationId, user, conversations, currentConversationId, navigate, loadConversationById])

  // Get user initials for avatar
  const getUserInitials = (user) => {
    if (user?.displayName) {
      return user.displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  // Toggle audio playback
  // Initialize audio context and analyser for waveform
  const initializeAudioContext = useCallback(() => {
    if (!audioContextRef.current && audioPlayerRef.current) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        audioContextRef.current = new AudioContext()
        const source = audioContextRef.current.createMediaElementSource(audioPlayerRef.current)
        analyserRef.current = audioContextRef.current.createAnalyser()
        analyserRef.current.fftSize = 64 // 32 bars
        analyserRef.current.smoothingTimeConstant = 0.8
        source.connect(analyserRef.current)
        analyserRef.current.connect(audioContextRef.current.destination)
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount)
      } catch (error) {
        console.error('Error initializing audio context:', error)
      }
    }
  }, [])

  // Start/stop waveform animation
  useEffect(() => {
    if (!isPlaying || !audioUrl) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      setWaveformData(new Array(32).fill(0))
      return
    }

    // Initialize audio context
    initializeAudioContext()

    // Animate waveform during playback
    const animateWaveform = () => {
      if (!isPlaying || !analyserRef.current || !dataArrayRef.current) {
        setWaveformData(new Array(32).fill(0))
        return
      }

      analyserRef.current.getByteFrequencyData(dataArrayRef.current)
      
      // Convert frequency data to waveform bars (32 bars)
      const bars = []
      const step = Math.floor(dataArrayRef.current.length / 32)
      for (let i = 0; i < 32; i++) {
        const index = i * step
        const value = dataArrayRef.current[index] || 0
        // Normalize to 0-1 range and apply some scaling
        bars.push(value / 255)
      }
      
      setWaveformData(bars)
      animationFrameRef.current = requestAnimationFrame(animateWaveform)
    }

    animateWaveform()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isPlaying, audioUrl, initializeAudioContext])

  const togglePlayback = () => {
    const audio = audioPlayerRef.current
    if (!audio) return
    
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      // Resume audio context if suspended (browser autoplay policy)
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume()
      }
      audio.play()
      setIsPlaying(true)
    }
  }

  // Handle audio time update
  const handleTimeUpdate = () => {
    const audio = audioPlayerRef.current
    if (audio) {
      setCurrentPlaybackTime(audio.currentTime)
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setAudioDuration(audio.duration)
      }
    }
  }

  // Handle audio loaded metadata
  const handleLoadedMetadata = () => {
    const audio = audioPlayerRef.current
    if (audio && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
      console.log('Audio metadata loaded, duration:', audio.duration)
      setAudioDuration(audio.duration)
    } else {
      console.warn('Audio metadata loaded but duration is invalid:', audio?.duration)
    }
  }

  // Handle seek
  const handleSeek = (e) => {
    const audio = audioPlayerRef.current
    if (audio) {
      const newTime = parseFloat(e.target.value)
      audio.currentTime = newTime
      setCurrentPlaybackTime(newTime)
    }
  }


  // Helper function to discard memory and return to main
  const handleDiscardMemory = async () => {
    // Check if there are any changes to discard
    const hasChanges = selectedFile || 
                       memoryTitle?.trim() || 
                       memoryText?.trim() || 
                       memoryTopic?.trim() || 
                       memoryMood !== null || 
                       memoryPeople?.trim() || 
                       selectedTags.length > 0
    
    if (hasChanges) {
      const confirmed = await showConfirmation({
        title: 'Discard Memory',
        message: 'Discard this memory? All changes will be lost.',
        confirmText: 'Discard',
        cancelText: 'Cancel',
        type: 'warning'
      })
      if (!confirmed) return
    }
    
    setSelectedFile(null)
    setSavedRecordingDuration(0)
    setIsPlaying(false)
    setMemoryTitle(null)
    setHasEditedTitle(false)
    setMemoryText('')
    setMemoryTopic('')
    setMemoryMood(null)
    setMemoryPeople('')
    setSelectedTags([])
    setCurrentScreen(SCREENS.MAIN)
  }

  // Toggle playback for viewing recording screen
  const toggleRecordingPlayback = () => {
    const audio = recordingAudioRef.current
    if (!audio) return
    
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }

  // Handle audio time update for highlighting
  const handleAudioTimeUpdate = () => {
    const audio = recordingAudioRef.current
    if (!audio) return
    
    const currentTime = audio.currentTime * 1000 // Convert to milliseconds
    setCurrentPlaybackTime(currentTime)
    
    // Find the active utterance based on current playback time
    if (recordingTranscription && typeof recordingTranscription === 'object') {
      if (recordingTranscription.utterances && Array.isArray(recordingTranscription.utterances)) {
        console.log('⏰ Checking utterances, count:', recordingTranscription.utterances.length)
        const activeIndex = recordingTranscription.utterances.findIndex((utterance, idx) => {
          const start = utterance.start || 0
          const nextUtterance = recordingTranscription.utterances[idx + 1]
          const end = nextUtterance ? nextUtterance.start : Infinity
          console.log(`⏰ Utterance ${idx}: start=${start}, end=${end}, current=${currentTime}, match=${currentTime >= start && currentTime < end}`)
          return currentTime >= start && currentTime < end
        })
        console.log('⏰ Active utterance index:', activeIndex)
        setActiveUtteranceIndex(activeIndex >= 0 ? activeIndex : null)
      } else if (recordingTranscription.words && Array.isArray(recordingTranscription.words)) {
        console.log('⏰ Checking words, count:', recordingTranscription.words.length)
        // Handle word-level highlighting if available
        const activeIndex = recordingTranscription.words.findIndex((word, idx) => {
          const start = word.start || 0
          const nextWord = recordingTranscription.words[idx + 1]
          const end = nextWord ? nextWord.start : Infinity
          return currentTime >= start && currentTime < end
        })
        console.log('⏰ Active word index:', activeIndex)
        setActiveUtteranceIndex(activeIndex >= 0 ? activeIndex : null)
      } else {
        console.log('⏰ No utterances or words found in transcription')
        console.log('⏰ Transcription keys:', Object.keys(recordingTranscription))
      }
    }
  }

  // Seek to a specific time in the audio when clicking on a transcript segment
  const seekToTime = (timeMs) => {
    // Try recording audio ref first (for VIEW_RECORDING screen)
    let audio = recordingAudioRef.current
    // If not available, try main audio player ref (for VIEW_MEMORY screen)
    if (!audio) {
      audio = audioPlayerRef.current
    }
    if (!audio) return
    
    const timeSeconds = typeof timeMs === 'number' ? (timeMs / 1000) : parseFloat(timeMs)
    audio.currentTime = timeSeconds
    if (!isPlaying) {
      audio.play()
      setIsPlaying(true)
    }
  }

  // View a recording with its transcription (with progressive loading)
  // --- ACTIONS ---

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    // Check file type
    if (!(file.type.startsWith('audio/') || file.type.startsWith('video/'))) {
      setErrorMessage('Please select an audio or video file.')
      e.target.value = ''
      return
    }
    
    // Check file size (400MB limit)
    const MAX_FILE_SIZE = 400 * 1024 * 1024; // 400MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMessage(`File size (${fileSizeMB} MB) exceeds the maximum allowed size of 400 MB. Please choose a smaller file.`);
      showToast(`File too large (${fileSizeMB} MB). Maximum size is 400 MB.`, 'error');
      e.target.value = ''
      return
    }
    
    if (!(await requireAuth('upload'))) {
      e.target.value = '' 
      return
    }
    
    setSelectedFile(file)
    setRecordingName(`${file.name.replace(/\.[^/.]+$/, '')}`)
    setErrorMessage('') // Clear any previous errors
    
    const url = URL.createObjectURL(file)
    const media = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio')
    media.src = url
    media.onloadedmetadata = () => {
      setSavedRecordingDuration(Math.floor(media.duration))
      URL.revokeObjectURL(url)
    }
    media.onerror = () => {
      setSavedRecordingDuration(0)
      URL.revokeObjectURL(url)
    }
    
    setCurrentScreen(SCREENS.REVIEW)
  }

  const startRecording = async () => {
    setErrorMessage('')
    if (!(await requireAuth('record'))) return
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Your browser does not support audio recording.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const types = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav']
      const supportedType = types.find(type => MediaRecorder.isTypeSupported(type)) || ''
      const mediaRecorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : {})
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm'
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        const extension = mimeType.split('/')[1]?.split(';')[0] || 'webm'
        const file = new File([audioBlob], `recording_${Date.now()}.${extension}`, { type: mimeType })
        setSelectedFile(file)
        setRecordingName(`Recording ${new Date().toLocaleDateString()}`)
        setCurrentScreen(SCREENS.REVIEW)
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorder.start(1000)
      setIsRecording(true)
    } catch (err) {
      setErrorMessage(`Recording failed: ${err.message}`)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setSavedRecordingDuration(recordingTime)
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
    }
    setIsRecording(false)
    setSavedRecordingDuration(0)
    setCurrentScreen(SCREENS.MAIN)
  }

  const uploadAndProcess = async () => {
    if (!(await requireAuth('upload'))) {
      console.error('User not authenticated, cannot upload')
      return
    }
    
    if (!selectedFile) {
      console.error('No file selected')
      setErrorMessage('No file selected. Please record or upload an audio/video file first.')
      return
    }
    
    // Prepare metadata
    const metadata = {
      title: memoryTitle || recordingName || selectedFile.name,
      description: memoryText || '',
      tag_ids: selectedTags.map(tag => tag.id)
    }
    
    // Add optional fields if provided
    if (memoryTopic?.trim()) {
      metadata.topic = memoryTopic.trim()
    }
    
    if (memoryMood !== null && memoryMood >= 1 && memoryMood <= 5) {
      metadata.mood = memoryMood
    }
    
    if (memoryPeople?.trim()) {
      // Split by comma and trim whitespace
      metadata.people = memoryPeople.split(',').map(p => p.trim()).filter(p => p)
    }
    
    console.log('Starting memory upload:', {
      filename: selectedFile.name,
      type: selectedFile.type,
      size: selectedFile.size,
      metadata
    })
    
    setProcessStatus(PROCESS_STATUS.UPLOADING)
    setCurrentScreen(SCREENS.PROCESSING)
    setErrorMessage('')
    setUploadProgress(0) // Reset progress
    
    try {
      console.log('Uploading memory...')
      const result = await api.uploadMemory(
        selectedFile, 
        metadata,
        (progress) => {
          // Update progress as upload happens
          setUploadProgress(progress)
          console.log(`Upload progress: ${progress.toFixed(1)}%`)
        }
      )
      console.log('Memory uploaded successfully:', result)
      
      // OPTIMISTIC UPDATE - Add memory to list immediately
      if (result && result.id) {
        const newMemory = {
          ...result,
          status: result.status || 'processing',
          media_type: result.media_type || (selectedFile.type.startsWith('audio/') ? 'audio' : selectedFile.type.startsWith('video/') ? 'video' : 'text'),
          created_at: result.created_at || new Date().toISOString(),
          tags: selectedTags
        }
        
        // Add to the beginning of the list
        setMemories(prev => [newMemory, ...prev])
        
        // Update pagination
        setMemoryPagination(prev => ({
          ...prev,
          total: prev.total + 1
        }))
      }
      
      setProcessStatus(PROCESS_STATUS.TRANSCRIBING)
      
      // The backend will process asynchronously
      // For now, we'll show success after a short delay
      await new Promise(r => setTimeout(r, 1500))
      
      setProcessStatus(PROCESS_STATUS.READY)
      
      console.log('Refreshing data to get latest state...')
      // Refresh to get the latest state from backend (including processing status)
      fetchMemories()
      // Always reload calendar data after memory upload (force refresh to get new memory)
      fetchCalendarData(calendarDate, true)
      
      // Reset memory form
      setMemoryTitle(null)
      setHasEditedTitle(false)
      setMemoryText('')
      setMemoryTopic('')
      setMemoryMood(null)
      setMemoryPeople('')
      setSelectedTags([])
      
      showToast('Memory uploaded successfully! Processing in background...', 'success')
      setTimeout(() => setCurrentScreen(SCREENS.MAIN), 800)
    } catch (err) {
      console.error('Upload error:', err)
      setProcessStatus(PROCESS_STATUS.FAILED)
      setErrorMessage(err.message || 'Failed to upload memory.')
      showToast('Failed to upload memory', 'error')
      
      // If we had optimistically added it, we should remove it on error
      // But since we only add if result exists, this shouldn't be needed
    }
  }

  const createTextMemory = async () => {
    if (!(await requireAuth('create text memory'))) {
      console.error('User not authenticated, cannot create text memory')
      return
    }
    
    if (!memoryText.trim()) {
      setErrorMessage('Please enter some text for your memory.')
      showToast('Please enter text content', 'error')
      return
    }
    
    // Prepare metadata object
    const metadata = {}
    
    // Add optional fields if provided
    if (memoryTitle?.trim()) {
      metadata.title = memoryTitle.trim()
    }
    
    if (memoryTopic?.trim()) {
      metadata.topic = memoryTopic.trim()
    }
    
    if (memoryMood !== null && memoryMood >= 1 && memoryMood <= 5) {
      metadata.mood = memoryMood
    }
    
    if (memoryPeople?.trim()) {
      // Split by comma and trim whitespace
      metadata.people = memoryPeople.split(',').map(p => p.trim()).filter(p => p)
    }
    
    // Automatically set today's date
    const today = new Date()
    metadata.memory_date = today.toISOString()
    
    // Add tag IDs if any tags are selected
    if (selectedTags.length > 0) {
      metadata.tag_ids = selectedTags.map(tag => tag.id)
    }
    
    console.log('Creating text memory:', {
      text_content: memoryText.trim(),
      metadata
    })
    setErrorMessage('')
    
    try {
      console.log('Creating text memory...')
      const result = await api.createTextMemory(memoryText.trim(), metadata)
      console.log('Text memory created successfully:', result)
      
      // OPTIMISTIC UPDATE - Add memory to list immediately
      if (result && result.id) {
        const newMemory = {
          ...result,
          status: result.status || 'completed',
          media_type: 'text',
          created_at: result.created_at || new Date().toISOString(),
          tags: selectedTags
        }
        
        // Add to the beginning of the list
        setMemories(prev => [newMemory, ...prev])
        
        // Update pagination
        setMemoryPagination(prev => ({
          ...prev,
          total: prev.total + 1
        }))
      }
      
      // Refresh to get the latest state from backend
      fetchMemories()
      // Always reload calendar data after memory upload (force refresh to get new memory)
      fetchCalendarData(calendarDate, true)
      
      // Reset memory form
      setMemoryTitle(null)
      setHasEditedTitle(false)
      setMemoryText('')
      setMemoryTopic('')
      setMemoryMood(null)
      setMemoryPeople('')
      setSelectedTags([])
      
      showToast('Text memory created successfully!', 'success')
      setCurrentScreen(SCREENS.MAIN)
    } catch (err) {
      console.error('Create text memory error:', err)
      setErrorMessage(err.message || 'Failed to create text memory.')
      showToast('Failed to create text memory', 'error')
    }
  }

  const createTag = async () => {
    if (!newTagName.trim()) {
      showToast('Please enter a tag name', 'error')
      return
    }
    
    try {
      const tag = await api.createTag(newTagName.trim(), newTagColor)
      setTags(prev => [...prev, tag])
      
      // Auto-select the newly created tag
      setSelectedTags(prev => {
        const exists = prev.find(t => t.id === tag.id)
        if (!exists) {
          return [...prev, tag]
        }
        return prev
      })
      
      setNewTagName('')
      setNewTagColor('#10a37f')
      setShowTagModal(false)
      showToast('Tag created and selected!', 'success')
    } catch (err) {
      console.error('Failed to create tag:', err)
      showToast(`Failed to create tag: ${err.message}`, 'error')
    }
  }

  const deleteTag = async (tagId, tagName) => {
    const confirmed = await showConfirmation({
      title: 'Delete Tag',
      message: `Delete "${tagName}"?\n\nThis will remove this tag from all memories (memories will not be deleted).`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'warning'
    })
    
    if (!confirmed) {
      return
    }
    
    // Store tag for potential rollback
    const tagToDelete = tags.find(t => t.id === tagId)
    
    // OPTIMISTIC UPDATE - Remove from UI immediately
    setTags(prev => prev.filter(t => t.id !== tagId))
    
    // Remove from selected tags if it was selected
    setSelectedTags(prev => prev.filter(t => t.id !== tagId))
    
    // Clear filter if this tag was in the filter
    if (selectedFilterTags.find(t => t.id === tagId)) {
      setSelectedFilterTags(prev => prev.filter(t => t.id !== tagId))
      fetchMemories({ tag_ids: selectedFilterTags.filter(t => t.id !== tagId).map(t => t.id) })
    }
    
    try {
      await api.deleteTag(tagId)
      showToast('Tag deleted successfully', 'success')
      
      // Refresh memories to update tag associations
      fetchMemories()
    } catch (err) {
      console.error('Failed to delete tag:', err)
      setErrorMessage(`Failed to delete tag: ${err.message}`)
      showToast('Failed to delete tag', 'error')
      
      // ROLLBACK - Restore the tag if API call failed
      if (tagToDelete) {
        setTags(prev => [...prev, tagToDelete].sort((a, b) => 
          a.name.localeCompare(b.name)
        ))
      }
    }
  }

  const toggleTag = (tag) => {
    setSelectedTags(prev => {
      const exists = prev.find(t => t.id === tag.id)
      if (exists) {
        return prev.filter(t => t.id !== tag.id)
      } else {
        return [...prev, tag]
      }
    })
  }

  const viewMemoryDetail = async (memory) => {
    // Navigate immediately with basic memory data for better UX
    setSelectedMemory(memory)
    setCurrentScreen(SCREENS.VIEW_MEMORY)
    setLoadingMemory(true)
    setLoadingTranscript(false)
    setSelectedMemoryTranscript(null)
    setIsPlaying(false)
    setCurrentPlaybackTime(0)
    setAudioUrl(null)
    
    // Close sidebar on mobile
    if (window.innerWidth < 1024) setSidebarOpen(false)
    
    // Load full details in the background
    try {
      // Fetch full memory details from API
      const fullMemory = await api.getMemory(memory.id)
      setSelectedMemory(fullMemory)
      
      // Set up audio URL if available - always fetch fresh signed URL from backend
      if ((fullMemory.media_type === 'audio' || fullMemory.media_type === 'video')) {
        // Always fetch a fresh signed URL from the backend to ensure it's valid and not expired
        try {
          console.log('🔗 Fetching signed URL for memory:', fullMemory.id)
          const signedUrlResponse = await api.getMemoryAudioUrl(fullMemory.id)
          // Handle different response formats
          const signedUrl = typeof signedUrlResponse === 'string' 
            ? signedUrlResponse 
            : (signedUrlResponse?.url || signedUrlResponse?.signed_url || signedUrlResponse?.presigned_url)
          
          if (signedUrl) {
            console.log('✅ Signed URL obtained successfully')
            setAudioUrl(signedUrl)
          } else {
            console.warn('⚠️ No signed URL in response, checking for fallback options')
            // Fallback: check if memory object has a URL (might be a direct URL)
            const fallbackUrl = fullMemory.audio_url || 
                               fullMemory.signed_url || 
                               fullMemory.presigned_url || 
                               fullMemory.url
            if (fallbackUrl) {
              console.warn('⚠️ Using fallback URL from memory object')
              setAudioUrl(fallbackUrl)
            } else if (fullMemory.audio_key || fullMemory.source_key) {
              console.warn('⚠️ Falling back to direct endpoint URL')
              setAudioUrl(api.getMemoryAudio(fullMemory.id))
            }
          }
        } catch (err) {
          console.error('❌ Failed to get signed URL:', err)
          // Fallback: check if memory object has a URL
          const fallbackUrl = fullMemory.audio_url || 
                             fullMemory.signed_url || 
                             fullMemory.presigned_url || 
                             fullMemory.url
          if (fallbackUrl) {
            console.warn('⚠️ Using fallback URL from memory object after error')
            setAudioUrl(fallbackUrl)
          } else if (fullMemory.audio_key || fullMemory.source_key) {
            console.warn('⚠️ Falling back to direct endpoint URL after error')
            setAudioUrl(api.getMemoryAudio(fullMemory.id))
          }
        }
      }
      
      // Set metadata
      setMemoryTitle(fullMemory.title || null)
      setHasEditedTitle(false)
      setMemoryText(fullMemory.description || '')
      setMemoryTopic(fullMemory.topic || '')
      setMemoryMood(fullMemory.mood || null)
      setMemoryPeople(fullMemory.people ? (Array.isArray(fullMemory.people) ? fullMemory.people.join(', ') : fullMemory.people) : '')
      setMemoryDate(fullMemory.memory_date || '')
      setSelectedTags(fullMemory.tags || [])
      setEditingMemory(false)
      
      // Fetch transcript for audio/video memories if status is completed
      if ((fullMemory.media_type === 'audio' || fullMemory.media_type === 'video') && fullMemory.status === 'completed') {
        setLoadingTranscript(true)
        try {
          const transcript = await api.getMemoryTranscript(fullMemory.id)
          console.log('📝 Transcript received:', transcript)
          if (transcript && typeof transcript === 'object' && transcript.utterances) {
            console.log(`📝 Found ${transcript.utterances.length} utterances in transcript`)
          } else if (Array.isArray(transcript)) {
            console.log(`📝 Found ${transcript.length} segments in transcript array`)
          }
          setSelectedMemoryTranscript(transcript)
        } catch (err) {
          console.error('Failed to load transcript:', err)
          // Don't show error toast - transcript is optional
        } finally {
          setLoadingTranscript(false)
        }
      }
      
      // Fetch text content for text memories if source_key exists
      if (fullMemory.media_type === 'text' && fullMemory.source_key && fullMemory.status === 'completed') {
        setLoadingTranscript(true)
        try {
          console.log('📄 Fetching text content for text memory:', fullMemory.id, 'source_key:', fullMemory.source_key)
          const textContent = await api.getMemoryTextContent(fullMemory.id)
          console.log('📄 Text content received (length):', textContent?.length || 0)
          if (textContent && textContent.trim()) {
            setSelectedMemoryTranscript(textContent)
            // Also update memoryText for consistency
            setMemoryText(textContent)
          } else {
            console.warn('⚠️ No text content found in response')
          }
        } catch (err) {
          console.error('❌ Failed to load text content:', err)
          // Don't show error toast - text content is optional
        } finally {
          setLoadingTranscript(false)
        }
      }
    } catch (err) {
      console.error('Failed to load memory details:', err)
      showToast('Failed to load memory details', 'error')
    } finally {
      setLoadingMemory(false)
    }
  }

  const updateMemoryMetadata = async () => {
    if (!selectedMemory) return
    
    try {
      const updateData = {
        title: memoryTitle.trim(),
        description: memoryText.trim(),
        topic: memoryTopic.trim() || undefined,
        mood: memoryMood || undefined,
        people: memoryPeople ? memoryPeople.split(',').map(p => p.trim()).filter(p => p) : undefined,
        memory_date: memoryDate || undefined,
        tag_ids: selectedTags.map(t => t.id)
      }
      
      const updated = await api.updateMemory(selectedMemory.id, updateData)
      
      // Update local state
      setMemories(prev => prev.map(m => m.id === updated.id ? updated : m))
      
      setShowMemoryDetailModal(false)
      setEditingMemory(false)
      showToast('Memory updated successfully!', 'success')
    } catch (err) {
      console.error('Failed to update memory:', err)
      setErrorMessage(`Failed to update memory: ${err.message}`)
      showToast('Failed to update memory', 'error')
    }
  }

  const deleteMemory = async (memoryId) => {
    const confirmed = await showConfirmation({
      title: 'Delete Memory',
      message: 'Delete this memory? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    })
    
    if (!confirmed) {
      return
    }
    
    // Store memory for potential rollback
    const memoryToDelete = memories.find(m => m.id === memoryId)
    
    // OPTIMISTIC UPDATE
    setMemories(prev => prev.filter(m => m.id !== memoryId))
    setShowMemoryDetailModal(false)
    
    try {
      await api.deleteMemory(memoryId)
      showToast('Memory deleted successfully', 'success')
      fetchMemories()
    } catch (err) {
      console.error('Failed to delete memory:', err)
      setErrorMessage(`Failed to delete memory: ${err.message}`)
      showToast('Failed to delete memory', 'error')
      
      // ROLLBACK
      if (memoryToDelete) {
        setMemories(prev => [...prev, memoryToDelete])
      }
    }
  }

  const askQuestion = async () => {
    if (!inputQuery.trim()) return
    if (!(await requireAuth('ask'))) return
    
    // Resolve conversation id: use current or create (without navigating) so we can set user message before navigation
    let conversationIdToUse = currentConversationId
    if (!conversationIdToUse) {
      console.log('No conversation exists, creating one...')
      const createdId = await getOrCreateConversationIdForFirstMessage()
      if (!createdId) {
        console.error('Failed to create conversation, aborting question')
        return
      }
      conversationIdToUse = createdId
      // Prevent the route effect from clearing messages when we're on "/" with a conversation set (first-message flow)
      skipLoadForConversationIdRef.current = createdId
      // Set user message and conversation in state BEFORE navigating so the conversation never shows empty (user always appears first)
      const userMsg = { role: 'user', content: inputQuery }
      setCurrentConversationId(createdId)
      setMessages([userMsg])
      setCurrentScreen(SCREENS.MAIN)
      navigate(`/conversation/${createdId}`)
    }
    
    const userMsg = { role: 'user', content: inputQuery }
    if (conversationIdToUse === currentConversationId) {
      // We're in an existing conversation: append user message to list
      setMessages(prev => [...prev, userMsg])
    }
    const currentQuery = inputQuery
    setInputQuery('')
    setIsThinking(true)
    setErrorMessage('')
    
    try {
      // Save user message to conversation
      console.log('Saving user message to conversation:', conversationIdToUse)
      await api.addMessageToConversation(conversationIdToUse, 'user', currentQuery)
      
      // Get AI response
      const data = await api.askQuestion(currentQuery)
      const answer = data.answer || data
      
      // Save assistant response to conversation
      console.log('Saving assistant response to conversation:', conversationIdToUse)
      await api.addMessageToConversation(conversationIdToUse, 'assistant', answer)
      
      setMessages(prev => [...prev, { role: 'assistant', content: answer, sources: [] }])
      
      // Refresh conversations list to update message count
      fetchConversations()
    } catch (err) {
      console.error('Error in askQuestion:', err)
      setErrorMessage('Error getting response.')
    } finally {
      setIsThinking(false)
      skipLoadForConversationIdRef.current = null
    }
  }

  const fetchMemories = async (customFilters = {}) => {
    if (!user) {
      console.log('fetchMemories: No user, skipping')
      setMemoriesLoading(false)
      return
    }
    
    // Don't fetch if auth is still loading
    if (authLoading) {
      console.log('fetchMemories: Auth still loading, skipping')
      return
    }
    
    try {
      setMemoriesLoading(true)
      // Use cached token if available, otherwise get a new one
      const token = authToken || await getIdToken(user, false)
      if (!token) {
        console.warn('fetchMemories: No token available')
        setMemoriesLoading(false)
        return
      }
      
      // Build filters from state or custom filters
      const filters = {
        page: customFilters.page || memoryPagination.page,
        page_size: 20,
        search: customFilters.search !== undefined ? customFilters.search : memorySearchQuery,
        media_type: customFilters.media_type !== undefined ? customFilters.media_type : memoryMediaTypeFilter,
        mood: customFilters.mood !== undefined ? customFilters.mood : memoryMoodFilter,
        status_filter: customFilters.status_filter !== undefined ? customFilters.status_filter : memoryStatusFilter,
        topic: customFilters.topic !== undefined ? customFilters.topic : memoryTopicFilter,
        tag_ids: customFilters.tag_ids !== undefined ? customFilters.tag_ids : (selectedFilterTags.length > 0 ? selectedFilterTags.map(t => t.id) : null),
      }
      
      console.log('fetchMemories: Fetching with filters:', filters)
      const data = await api.listMemories(filters)
      
      // Sort by created_at descending (newest first) to ensure new memories appear at top
      const sortedMemories = (data.items || []).sort((a, b) => {
        const dateA = new Date(a.created_at || a.memory_date || 0)
        const dateB = new Date(b.created_at || b.memory_date || 0)
        return dateB - dateA
      })
      
      setMemories(sortedMemories)
      setMemoryPagination({
        total: data.total || 0,
        page: data.page || 1,
        page_size: data.page_size || 20,
        total_pages: data.total_pages || 0
      })
    } catch (err) {
      console.error('Error fetching memories:', err)
      setMemories([])
      setMemoryPagination({ total: 0, page: 1, page_size: 20, total_pages: 0 })
    } finally {
      setMemoriesLoading(false)
    }
  }

  const fetchTags = async () => {
    if (!user) {
      console.log('fetchTags: No user, skipping')
      return
    }
    
    try {
      const token = await getIdToken(user, false)
      if (!token) {
        console.warn('fetchTags: No token available, waiting...')
        setTimeout(() => fetchTags(), 1000)
        return
      }
      
      console.log('fetchTags: Token available, fetching tags...')
      const data = await api.listTags()
      setTags(data || [])
    } catch (err) {
      console.error('Error fetching tags:', err)
    }
  }

  const fetchConversations = async () => {
    if (!user) {
      console.log('fetchConversations: No user, skipping')
      return
    }
    
    try {
      // Use cached token if available, otherwise get a new one
      const token = authToken || await getIdToken(user, false)
      if (!token) {
        console.warn('fetchConversations: No token available')
        return
      }
      
      console.log('fetchConversations: Token available, fetching conversations...')
      const data = await api.listConversations(0, 100)
      console.log('Conversations fetched:', data)
      setConversations(data || [])
    } catch (err) {
      console.error('Error fetching conversations:', err)
      // Don't break the app - keep existing conversations if any
      // This allows the app to continue working even if the API fails
    }
  }


  // --- TOAST NOTIFICATION HELPER ---
  
  const showToast = (message, type = 'success') => {
    const id = Date.now()
    const newToast = { id, message, type }
    setToasts(prev => [...prev, newToast])
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  // --- CALENDAR HELPER FUNCTIONS ---
  
  const fetchCalendarData = async (date, forceRefresh = false) => {
    if (!user) return
    
    try {
      const year = date.getFullYear()
      const month = date.getMonth()
      
      // Create a unique key for this month (YYYY-MM)
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
      
      // Check if we already have data for this month and don't need to refresh
      if (!forceRefresh && loadedCalendarMonths.has(monthKey)) {
        console.log('Calendar data already loaded for month:', monthKey)
        return
      }
      
      // Get first and last day of month
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      
      // Format dates as YYYY-MM-DD (using local time, consistent with getEmojiForDate)
      const formatDateLocal = (date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      
      const start_date = formatDateLocal(firstDay)
      const end_date = formatDateLocal(lastDay)
      
      console.log('Fetching memories for calendar:', start_date, 'to', end_date)
      
      // Fetch memories - get all pages if needed
      let allMemories = []
      let page = 1
      const pageSize = 100
      let hasMore = true
      
      while (hasMore) {
        const filters = {
          page: page,
          page_size: pageSize,
        }
        
        const data = await api.listMemories(filters)
        const memories = data.items || []
        allMemories = [...allMemories, ...memories]
        
        // Check if there are more pages
        hasMore = memories.length === pageSize && page < 10 // Safety limit of 10 pages
        page++
      }
      
      const memoriesList = allMemories
      console.log(`Fetched ${memoriesList.length} total memories for calendar`)
      
      // Group memories by date (YYYY-MM-DD) - merge with existing data
      setCalendarActivity(prevActivity => {
        const activityByDate = { ...prevActivity }
        
        memoriesList.forEach(memory => {
          // Use memory_date if available, otherwise use created_at
          const memoryDate = memory.memory_date || memory.created_at
          if (!memoryDate) return
          
          // Convert to local date and format as YYYY-MM-DD (consistent with getEmojiForDate)
          const date = new Date(memoryDate)
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          const dateStr = `${year}-${month}-${day}`
          
          // Check if date is within the month range (compare as strings)
          if (dateStr >= start_date && dateStr <= end_date) {
            if (!activityByDate[dateStr]) {
              activityByDate[dateStr] = {
                memories: [],
                date: dateStr
              }
            }
            // Check if this memory already exists to avoid duplicates
            const existingMemory = activityByDate[dateStr].memories.find(m => m.id === memory.id)
            if (!existingMemory) {
              activityByDate[dateStr].memories.push(memory)
            }
          }
        })
        
        console.log('Calendar activity data updated for month:', monthKey)
        return activityByDate
      })
      
      // Mark this month as loaded
      setLoadedCalendarMonths(prev => new Set([...prev, monthKey]))
    } catch (err) {
      console.error('Error fetching calendar data:', err)
    }
  }
  
  const getCalendarDays = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }
  
  const getEmojiForDate = (date) => {
    if (!date) return null
    
    // Format date as YYYY-MM-DD without timezone conversion
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')  
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    const dayActivity = calendarActivity[dateStr]
    
    if (!dayActivity || !dayActivity.memories || dayActivity.memories.length === 0) {
      return null
    }
    
    // Calculate average mood for the day
    const memories = dayActivity.memories
    const memoriesWithMood = memories.filter(m => m.mood && m.mood >= 1 && m.mood <= 5)
    
    if (memoriesWithMood.length > 0) {
      // Calculate average mood
      const sum = memoriesWithMood.reduce((acc, m) => acc + m.mood, 0)
      const average = sum / memoriesWithMood.length
      // Round to nearest integer (1-5)
      const averageMood = Math.round(average)
      
      // Map mood (1-5) to emojis: 😢 😕 😐 🙂 😄
      const moodEmojis = ['😢', '😕', '😐', '🙂', '😄']
      const emojiIndex = Math.min(Math.max(averageMood - 1, 0), 4)
      return moodEmojis[emojiIndex]
    }
    
    // Default emoji if no mood is set
    return '📝'
  }
  
  const isToday = (date) => {
    if (!date) return false
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Group conversations by date
  const groupConversationsByDate = (conversations) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(today.getDate() - today.getDay())
    
    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    const lastWeekEnd = new Date(thisWeekStart)
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1)
    
    const groups = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'Last Week': [],
      'Older': []
    }
    
    conversations.forEach(conv => {
      const convDate = new Date(conv.updated_at || conv.created_at)
      convDate.setHours(0, 0, 0, 0)
      
      if (convDate.getTime() === today.getTime()) {
        groups['Today'].push(conv)
      } else if (convDate.getTime() === yesterday.getTime()) {
        groups['Yesterday'].push(conv)
      } else if (convDate >= thisWeekStart && convDate < today) {
        groups['This Week'].push(conv)
      } else if (convDate >= lastWeekStart && convDate <= lastWeekEnd) {
        groups['Last Week'].push(conv)
      } else {
        groups['Older'].push(conv)
      }
    })
    
    // Return only groups that have conversations
    return Object.entries(groups)
      .filter(([_, convs]) => convs.length > 0)
      .map(([label, convs]) => ({ label, conversations: convs }))
  }
  
  const changeMonth = (direction) => {
    setCalendarDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() + direction)
      // Fetch data for the new month if not already cached
      fetchCalendarData(newDate)
      return newDate
    })
  }

  const handleDateClick = async (date) => {
    if (!date) return
    
    // Format date as YYYY-MM-DD
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    // Check if there's activity on this date
    const dayActivity = calendarActivity[dateStr]
    if (!dayActivity || !dayActivity.memories || dayActivity.memories.length === 0) {
      return
    }
    
    // Format details from memories
    const details = {
      date: dateStr,
      memories: dayActivity.memories,
      total_count: dayActivity.memories.length
    }
    
    console.log('Date details:', details)
    setSelectedDateDetails(details)
    setShowDateDetailsModal(true)
  }

  // --- UI COMPONENTS (JSX blocks to avoid remounting bugs) ---

  const sidebarJSX = (
    <>
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-[100dvh]
        ${sidebarOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full lg:w-20 lg:translate-x-0'} 
        bg-[#f9f9f9] dark:bg-[#171717] border-r border-slate-200 dark:border-white/10 
        transition-all duration-300 ease-out z-[70] flex flex-col flex-shrink-0
      `}>
        <div className="p-4 lg:p-3 flex flex-col h-full overflow-hidden">
          <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'lg:justify-center'} mb-6 px-2`}>
            <div className={`flex items-center gap-3 ${!sidebarOpen && 'lg:hidden'}`}>
              <div className="w-10 h-10 bg-gradient-to-br from-[#10a37f] to-[#0d8a6a] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#10a37f]/30 flex-shrink-0">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"><path d="M12 3C7.5 3 4 6.5 4 10.5C4 14.5 7.5 18 12 18C12 18 12 21 12 21C12 21 17 17 17 17C19.5 15.5 21 13 21 10.5C21 6.5 17.5 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8.5" cy="10.5" r="1.5" fill="currentColor"/><circle cx="12" cy="10.5" r="1.5" fill="currentColor"/><circle cx="15.5" cy="10.5" r="1.5" fill="currentColor"/></svg>
              </div>
              <span className="font-bold text-lg tracking-tight dark:text-white">Zentra Journal</span>
            </div>
            <div className={`hidden ${!sidebarOpen && 'lg:flex'} items-center justify-center`}>
              <div className="w-10 h-10 bg-gradient-to-br from-[#10a37f] to-[#0d8a6a] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#10a37f]/30">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"><path d="M12 3C7.5 3 4 6.5 4 10.5C4 14.5 7.5 18 12 18C12 18 12 21 12 21C12 21 17 17 17 17C19.5 15.5 21 13 21 10.5C21 6.5 17.5 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8.5" cy="10.5" r="1.5" fill="currentColor"/><circle cx="12" cy="10.5" r="1.5" fill="currentColor"/><circle cx="15.5" cy="10.5" r="1.5" fill="currentColor"/></svg>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="space-y-2 mb-6">
            <button onClick={() => { createNewConversation(); if(window.innerWidth < 1024) setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all text-sm font-semibold active:scale-[0.98] ${!sidebarOpen && 'lg:justify-center lg:px-0'}`} title="New Chat"><svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg><span className={`${!sidebarOpen && 'lg:hidden'}`}>New Chat</span></button>
            
            <input 
              ref={fileInputRef} 
              type="file" 
              accept="audio/*,video/*" 
              onChange={handleFileSelect} 
              className="hidden"
              style={{ zIndex: 1001 }}
            />
          </div>
          
          <div className={`flex-1 overflow-y-auto custom-scrollbar ${!sidebarOpen && 'lg:hidden'} py-4`}>
            <div className="px-2 mb-6">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 mb-2">Conversations</p>
              <div className="space-y-4">
                {conversations.length > 0 ? (
                  groupConversationsByDate(conversations).map((group) => (
                    <div key={group.label} className="space-y-1">
                      <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-1.5">
                        {group.label}
                      </p>
                      {group.conversations.map((conv) => (
                        <div 
                          key={conv.id} 
                          onClick={() => editingConversationId !== conv.id && loadConversation(conv)}
                          className={`group flex items-center justify-between p-2 rounded-xl hover:bg-white dark:hover:bg-white/5 border transition-all ${
                            editingConversationId === conv.id ? 'cursor-default' : 'cursor-pointer'
                          } ${
                            currentConversationId === conv.id 
                              ? 'bg-[#10a37f]/10 border-[#10a37f]/30' 
                              : 'border-transparent hover:border-slate-200 dark:hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              currentConversationId === conv.id 
                                ? 'bg-[#10a37f] text-white' 
                                : 'bg-blue-500/10 text-blue-500'
                            }`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              {editingConversationId === conv.id ? (
                                <input
                                  type="text"
                                  value={editingConversationTitle}
                                  onChange={(e) => setEditingConversationTitle(e.target.value)}
                                  onBlur={() => saveConversationTitle(conv.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveConversationTitle(conv.id)
                                    if (e.key === 'Escape') cancelEditingConversation()
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full text-xs font-semibold dark:text-white bg-white dark:bg-slate-800 border border-[#10a37f] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#10a37f]"
                                  autoFocus
                                />
                              ) : (
                                <>
                                  <p className="text-xs font-semibold dark:text-white truncate">{conv.title || 'Untitled Chat'}</p>
                                  <p className="text-[10px] text-slate-500">{conv.message_count || 0} messages</p>
                                </>
                              )}
                            </div>
                          </div>
                          {editingConversationId !== conv.id && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                              <button
                                onClick={(e) => startEditingConversation(conv, e)}
                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-[#10a37f] rounded-lg transition-all"
                                title="Rename conversation"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => deleteConversation(conv.id, e)}
                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                                title="Delete conversation"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center"><p className="text-xs text-slate-500 dark:text-slate-400">No conversations yet</p></div>
                )}
              </div>
            </div>

          </div>

          <div className={`mt-auto pt-4 border-t border-slate-200 dark:border-white/10 ${!sidebarOpen && 'lg:border-0'}`}>
            {user ? (
              <div className="space-y-2">
                <div 
                  className={`flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer ${!sidebarOpen && 'lg:justify-center'}`}
                  onClick={() => {
                    if (!sidebarOpen) {
                      setShowProfileDialog(true)
                    }
                  }}
                >
                  {user.photoURL && !imageError.has('profile') ? (
                    <img src={user.photoURL} alt={user.displayName || user.email} className="w-9 h-9 rounded-full flex-shrink-0 object-cover border-2 border-slate-200 dark:border-white/10" onError={() => setImageError(prev => new Set(prev).add('profile'))} />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-xs text-white font-bold flex-shrink-0 border-2 border-slate-200 dark:border-white/10">{getUserInitials(user)}</div>
                  )}
                  <div className={`flex-1 min-w-0 ${!sidebarOpen && 'lg:hidden'}`}>
                    <span className="block text-sm font-semibold dark:text-white truncate">{user.displayName || user.email}</span>
                    <span className="text-[10px] text-[#10a37f] font-semibold">Pro Plan</span>
                  </div>
                </div>
                {sidebarOpen && (
                  <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg><span>Sign Out</span></button>
                )}
              </div>
            ) : (
              <button onClick={() => setShowLoginModal(true)} className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors ${!sidebarOpen && 'lg:justify-center'}`}><div className="w-9 h-9 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center flex-shrink-0"><svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div><div className={`flex-1 min-w-0 ${!sidebarOpen && 'lg:hidden'}`}><span className="block text-sm font-semibold dark:text-white">Sign In</span><span className="text-[10px] text-slate-500 dark:text-slate-400">Click to login</span></div></button>
            )}
          </div>
        </div>
      </aside>
    </>
  )

  const headerJSX = (
    <header className="h-14 lg:h-16 border-b border-slate-200 dark:border-white/10 px-4 lg:px-6 flex items-center justify-between bg-white/80 dark:bg-[#0d0d0d]/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-500" title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
          {sidebarOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          )}
        </button>
        <div className="hidden lg:flex items-center gap-3"><div className="h-5 w-px bg-slate-200 dark:bg-white/10" /><h1 className="text-sm font-semibold text-slate-600 dark:text-slate-300">AI Assistant</h1></div>
        <div className="lg:hidden flex items-center gap-2"><div className="w-2 h-2 bg-[#10a37f] rounded-full animate-pulse"></div><span className="font-bold text-base dark:text-white">Zentra Journal</span></div>
      </div>
      <div className="flex items-center gap-2 lg:gap-3">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#10a37f]/10 rounded-full"><div className="w-2 h-2 bg-[#10a37f] rounded-full animate-pulse"></div><span className="text-xs font-semibold text-[#10a37f]">Memory Active</span></div>
        
        {/* Calendar Dropdown Button */}
        <div className="relative">
          <button 
            onClick={() => setShowCalendarDropdown(!showCalendarDropdown)} 
            className={`p-2 rounded-lg transition-all ${showCalendarDropdown ? 'bg-[#10a37f]/10 text-[#10a37f]' : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400'}`}
            title="Calendar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          
          {/* Calendar Dropdown */}
          {showCalendarDropdown && (
            <>
              <div 
                className="fixed inset-0 z-[60]" 
                onClick={() => setShowCalendarDropdown(false)}
              />
              <div 
                className="absolute right-0 mt-2 z-[70] animate-fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  className="bg-white dark:bg-[#171717] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl p-5 w-80"
                >
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white">
                      {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          const today = new Date()
                          setCalendarDate(today)
                          fetchCalendarData(today)
                        }}
                        className="px-2.5 py-1 text-xs font-semibold bg-[#10a37f] text-white rounded-lg hover:bg-[#0d8a6a] transition-colors"
                        title="Go to today"
                      >
                        Today
                      </button>
                      <button
                        onClick={() => changeMonth(-1)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                        title="Previous month"
                      >
                        <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => changeMonth(1)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                        title="Next month"
                      >
                        <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* Weekday Headers */}
                  <div className="grid grid-cols-7 gap-2 mb-3">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                      <div key={idx} className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {getCalendarDays(calendarDate).map((date, idx) => {
                      const emoji = date ? getEmojiForDate(date) : null
                      const today = date && isToday(date)
                      
                      return (
                        <div
                          key={idx}
                          onClick={() => handleDateClick(date)}
                          className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm relative ${
                            date 
                              ? 'hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer transition-colors' 
                              : ''
                          } ${
                            today 
                              ? 'bg-[#10a37f] text-white font-bold shadow-lg' 
                              : 'text-slate-700 dark:text-slate-300'
                          } ${
                            emoji 
                              ? 'hover:scale-110 active:scale-95' 
                              : ''
                          }`}
                        >
                          {date && (
                            <>
                              <span className={`text-xs ${today ? 'font-bold' : ''}`}>
                                {date.getDate()}
                              </span>
                              {emoji && (
                                <span className="text-sm leading-none mt-1">
                                  {emoji}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        <button 
          onClick={() => { 
            createNewConversation()
            if(window.innerWidth < 1024) setSidebarOpen(false)
          }} 
          className="lg:hidden p-2 bg-[#10a37f] text-white rounded-lg active:scale-95 transition-transform hover:bg-[#0d8a6a]"
          title="New Chat"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>
    </header>
  )

  const ToastContainer = () => {
    return (
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-sm animate-fade-in flex items-center gap-3 min-w-[300px] ${
              toast.type === 'success' 
                ? 'bg-green-500/90 border-green-600 text-white' 
                : toast.type === 'error'
                ? 'bg-red-500/90 border-red-600 text-white'
                : 'bg-blue-500/90 border-blue-600 text-white'
            }`}
          >
            {toast.type === 'success' && (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        ))}
      </div>
    )
  }

  const DateDetailsModal = () => {
    if (!showDateDetailsModal || !selectedDateDetails) return null
    
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          onClick={() => setShowDateDetailsModal(false)} 
        />
        <div className="relative w-full max-w-2xl bg-white dark:bg-[#171717] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 max-h-[80vh] overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold dark:text-white">
                {new Date(selectedDateDetails.date).toLocaleDateString('default', { 
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {selectedDateDetails.total_count} {selectedDateDetails.total_count === 1 ? 'item' : 'items'}
              </p>
            </div>
            <button 
              onClick={() => setShowDateDetailsModal(false)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
            {/* Memories */}
            {selectedDateDetails.memories && selectedDateDetails.memories.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>📝</span>
                  Memories ({selectedDateDetails.memories.length})
                </h3>
                <div className="space-y-2">
                  {selectedDateDetails.memories.map((memory) => (
                    <div 
                      key={memory.id}
                      onClick={() => {
                        viewMemoryDetail(memory)
                        setShowDateDetailsModal(false)
                        setShowCalendarDropdown(false)
                      }}
                      className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#10a37f] dark:hover:border-[#10a37f] cursor-pointer transition-all hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            memory.media_type === 'video' ? 'bg-blue-500/10 text-blue-500' :
                            memory.media_type === 'text' ? 'bg-orange-500/10 text-orange-500' :
                            'bg-purple-500/10 text-purple-500'
                          }`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {memory.media_type === 'video' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              ) : memory.media_type === 'text' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                              )}
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-slate-800 dark:text-white truncate">
                                {memory.title || 'Untitled Memory'}
                              </h4>
                              {memory.mood && (
                                <span className="text-sm flex-shrink-0">
                                  {['😢', '😕', '😐', '🙂', '😄'][memory.mood - 1]}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                              {memory.description || memory.topic || 'No description'}
                            </p>
                            {memory.tags && memory.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {memory.tags.slice(0, 3).map((tag) => (
                                  <span 
                                    key={tag.id}
                                    className="text-[10px] px-2 py-0.5 rounded-full"
                                    style={{ 
                                      backgroundColor: `${tag.color}20`,
                                      color: tag.color
                                    }}
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                                {memory.tags.length > 3 && (
                                  <span className="text-[10px] text-slate-400">+{memory.tags.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 flex-shrink-0">
                          {new Date(memory.created_at || memory.memory_date).toLocaleTimeString('default', { 
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Legacy Recordings (keeping for backward compatibility if needed) */}
            {selectedDateDetails.recordings && selectedDateDetails.recordings.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>🎙️</span>
                  Recordings ({selectedDateDetails.recordings.length})
                </h3>
                <div className="space-y-2">
                  {selectedDateDetails.recordings.map((rec) => (
                    <div 
                      key={rec.id || rec.document_id}
                      onClick={() => {
                        viewMemoryDetail(rec)
                        setShowDateDetailsModal(false)
                        setShowCalendarDropdown(false)
                      }}
                      className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#10a37f] dark:hover:border-[#10a37f] cursor-pointer transition-all hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800 dark:text-white mb-1">
                            {rec.filename}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span className={`px-2 py-0.5 rounded-full ${
                              rec.status === 'indexed' 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                            }`}>
                              {rec.status}
                            </span>
                            {rec.has_transcription && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                                Transcribed
                              </span>
                            )}
                            {rec.duration_seconds && (
                              <span>{Math.floor(rec.duration_seconds / 60)}m {rec.duration_seconds % 60}s</span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(rec.created_at).toLocaleTimeString('default', { 
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {selectedDateDetails.total_count === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">No activity on this date</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Helper function to show confirmation modal
  const showConfirmation = (config) => {
    return new Promise((resolve) => {
      setConfirmationModal({
        show: true,
        title: config.title || 'Confirm Action',
        message: config.message || 'Are you sure?',
        confirmText: config.confirmText || 'Confirm',
        cancelText: config.cancelText || 'Cancel',
        type: config.type || 'warning',
        onConfirm: () => {
          setConfirmationModal(prev => ({ ...prev, show: false }))
          resolve(true)
        },
        onCancel: () => {
          setConfirmationModal(prev => ({ ...prev, show: false }))
          resolve(false)
        }
      })
    })
  }

  const ProfileDialog = () => {
    if (!showProfileDialog || !user) return null

    return (
      <>
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]"
          onClick={() => setShowProfileDialog(false)}
        />
        <div className="fixed bottom-4 left-4 z-[90] lg:left-20">
          <div 
            className="bg-white dark:bg-[#171717] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Profile</h3>
              <button
                onClick={() => setShowProfileDialog(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              {user.photoURL && !imageError.has('profile') ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || user.email} 
                  className="w-16 h-16 rounded-full flex-shrink-0 object-cover border-2 border-slate-200 dark:border-white/10" 
                  onError={() => setImageError(prev => new Set(prev).add('profile'))} 
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center text-lg text-white font-bold flex-shrink-0 border-2 border-slate-200 dark:border-white/10">
                  {getUserInitials(user)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold dark:text-white truncate">{user.displayName || user.email}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                <span className="inline-block mt-1 text-xs text-[#10a37f] font-semibold">Pro Plan</span>
              </div>
            </div>

            <div className="space-y-2">
              <button 
                onClick={handleSignOut} 
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all font-semibold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  const ConfirmationModal = () => {
    if (!confirmationModal.show) return null

    const typeStyles = {
      warning: {
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
        iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
        iconColor: 'text-yellow-600 dark:text-yellow-400',
        buttonBg: 'bg-yellow-500 hover:bg-yellow-600',
        border: 'border-yellow-200 dark:border-yellow-800'
      },
      danger: {
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        iconBg: 'bg-red-100 dark:bg-red-900/30',
        iconColor: 'text-red-600 dark:text-red-400',
        buttonBg: 'bg-red-500 hover:bg-red-600',
        border: 'border-red-200 dark:border-red-800'
      },
      info: {
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        iconColor: 'text-blue-600 dark:text-blue-400',
        buttonBg: 'bg-blue-500 hover:bg-blue-600',
        border: 'border-blue-200 dark:border-blue-800'
      }
    }

    const styles = typeStyles[confirmationModal.type] || typeStyles.warning

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={confirmationModal.onCancel} />
        <div className="relative w-full max-w-md bg-white dark:bg-[#171717] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-6 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-12 h-12 ${styles.iconBg} ${styles.iconColor} rounded-xl flex items-center justify-center`}>
              {styles.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                {confirmationModal.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">
                {confirmationModal.message}
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={confirmationModal.onCancel}
              className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              {confirmationModal.cancelText}
            </button>
            <button
              onClick={confirmationModal.onConfirm}
              className={`flex-1 px-4 py-2.5 ${styles.buttonBg} text-white font-semibold rounded-xl transition-colors`}
            >
              {confirmationModal.confirmText}
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  const LoginModal = () => {
    if (!showLoginModal) return null
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLoginModal(false)} />
        <div className="relative w-full max-w-md bg-white dark:bg-[#171717] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-8 animate-fade-in">
          <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          <div className="w-16 h-16 bg-gradient-to-br from-[#10a37f] to-[#0d8a6a] rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-[#10a37f]/30"><svg className="w-8 h-8" viewBox="0 0 24 24" fill="none"><path d="M12 3C7.5 3 4 6.5 4 10.5C4 14.5 7.5 18 12 18C12 18 12 21 12 21C12 21 17 17 17 17C19.5 15.5 21 13 21 10.5C21 6.5 17.5 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8.5" cy="10.5" r="1.5" fill="currentColor"/><circle cx="12" cy="10.5" r="1.5" fill="currentColor"/><circle cx="15.5" cy="10.5" r="1.5" fill="currentColor"/></svg></div>
          <h2 className="text-2xl font-bold mb-2 text-center dark:text-white">Sign In Required</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">Please sign in to record audio, upload files, and access your profile</p>
          {errorMessage && (<div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl"><p className="text-red-500 text-sm font-medium text-center">{errorMessage}</p></div>)}
          <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-[#1a1a1a] border-2 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:border-[#10a37f] hover:bg-[#10a37f]/5 dark:hover:bg-[#10a37f]/10 transition-all font-semibold shadow-lg active:scale-[0.98]"><svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg><span>Continue with Google</span></button>
        </div>
      </div>
    )
  }

  const SearchModal = () => {
    if (!showSearchModal) return null
    
    const searchInputRef = useRef(null)
    
    // Focus input when modal opens
    useEffect(() => {
      if (showSearchModal && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 100)
      }
    }, [showSearchModal])

    return (
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSearchModal(false)} />
        <div className="relative w-full max-w-2xl bg-white dark:bg-[#171717] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-fade-in">
          {/* Search Input */}
          <div className="p-4 border-b border-slate-200 dark:border-white/10">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations and memories..."
                className="w-full px-4 py-3 pl-10 pr-20 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10a37f] dark:text-white"
              />
              <svg className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <div className="absolute right-3 top-2.5 flex items-center gap-1 text-xs text-slate-400">
                <kbd className="px-2 py-1 bg-slate-100 dark:bg-white/10 rounded text-xs">Esc</kbd>
                <span>to close</span>
              </div>
            </div>
          </div>

          {/* Search Results */}
          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
            {isSearching ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-[#10a37f] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Searching...</p>
              </div>
            ) : searchQuery.trim() === '' ? (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">Start typing to search conversations and memories</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 rounded text-xs">⌘K</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 rounded text-xs">Ctrl+K</kbd> to open this search</p>
              </div>
            ) : searchResults.conversations.length === 0 && searchResults.memories.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">No results found</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Conversations Results */}
                {searchResults.conversations.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-2">
                      Conversations ({searchResults.conversations.length})
                    </h3>
                    <div className="space-y-1">
                      {searchResults.conversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => {
                            loadConversation(conv)
                            setShowSearchModal(false)
                            setSearchQuery('')
                          }}
                          className="w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                                {conv.title || 'Untitled Chat'}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {conv.message_count || 0} messages
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Memories Results */}
                {searchResults.memories.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-2">
                      Memories ({searchResults.memories.length})
                    </h3>
                    <div className="space-y-1">
                      {searchResults.memories.map((memory) => (
                        <button
                          key={memory.id}
                          onClick={() => {
                            viewMemoryDetail(memory)
                            setShowSearchModal(false)
                            setSearchQuery('')
                          }}
                          className="w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#10a37f]/10 text-[#10a37f] flex items-center justify-center flex-shrink-0">
                              {memory.media_type === 'audio' && '🎵'}
                              {memory.media_type === 'video' && '🎬'}
                              {memory.media_type === 'text' && '📄'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                                {memory.title || 'Untitled Memory'}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {memory.description || memory.topic || 'No description'}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // VIEW_MEMORY Screen - Full page view with audio player and transcription
  if (currentScreen === SCREENS.VIEW_MEMORY && selectedMemory) {
    return (
      <>
        <ToastContainer />
        <DateDetailsModal />
        <LoginModal />
        <SearchModal />
        <ConfirmationModal />
        <ProfileDialog />
        <ConfirmationModal />
        <ProfileDialog />
        <div className="h-[100dvh] flex bg-white dark:bg-[#0d0d0d] overflow-hidden">
          {sidebarJSX}
          <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
            <header className="h-14 lg:h-16 border-b border-slate-200 dark:border-white/10 px-4 lg:px-6 flex items-center justify-between bg-white/80 dark:bg-[#0d0d0d]/80 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { 
                    setCurrentScreen(SCREENS.MAIN)
                    setSelectedMemory(null)
                    setIsPlaying(false)
                    setActiveUtteranceIndex(null)
                    setCurrentPlaybackTime(0)
                    setAudioUrl(null)
                  }} 
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                    {selectedMemory.title || 'Untitled Memory'}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {selectedMemory.created_at ? new Date(selectedMemory.created_at).toLocaleDateString() : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingMemory(true)
                    setCurrentScreen(SCREENS.VIEW_MEMORY)
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-500"
                  title="Edit"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button 
                  onClick={() => deleteMemory(selectedMemory.id)} 
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-lg transition-all" 
                  title="Delete memory"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative pb-24 lg:pb-0">
              {loadingMemory && (
                <div className="absolute inset-0 bg-white/80 dark:bg-[#0d0d0d]/80 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                      <div className="absolute inset-0 border-4 border-[#10a37f]/20 rounded-full"></div>
                      <div className="absolute inset-0 border-t-4 border-[#10a37f] rounded-full animate-spin"></div>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 font-medium">Loading memory details...</p>
                  </div>
                </div>
              )}
              <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  {/* Transcription - Left/Center (takes 2 columns on large screens) */}
                  <div className="lg:col-span-2 bg-white dark:bg-[#171717] rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden order-2 lg:order-1 mb-6 lg:mb-0">
                    <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-white/10">
                      <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 flex-wrap">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#10a37f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {selectedMemory.media_type === 'text' ? 'Content' : 'Transcription'}
                        {selectedMemoryTranscript && typeof selectedMemoryTranscript === 'object' && selectedMemoryTranscript.utterances && (
                          <span className="text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400">
                            ({selectedMemoryTranscript.utterances.length} {selectedMemoryTranscript.utterances.length === 1 ? 'segment' : 'segments'})
                          </span>
                        )}
                        {selectedMemoryTranscript && Array.isArray(selectedMemoryTranscript) && (
                          <span className="text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400">
                            ({selectedMemoryTranscript.length} {selectedMemoryTranscript.length === 1 ? 'segment' : 'segments'})
                          </span>
                        )}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {selectedMemory.media_type === 'text' 
                          ? (selectedMemory.status === 'completed' ? 'Text content of the memory' : 'Text content will be available after processing')
                          : (selectedMemory.status === 'completed' ? 'Full transcript of the recording' : 'Transcription will be available after processing')
                        }
                      </p>
                    </div>
                  
                    <div className="p-4 sm:p-6 pb-8 lg:pb-6 space-y-3 sm:space-y-4 max-h-[500px] sm:max-h-[600px] overflow-y-auto custom-scrollbar">
                      {loadingTranscript ? (
                        <div className="text-center py-12">
                          <div className="relative w-16 h-16 mx-auto mb-6">
                            <div className="absolute inset-0 border-4 border-[#10a37f]/20 rounded-full"></div>
                            <div className="absolute inset-0 border-t-4 border-[#10a37f] rounded-full animate-spin"></div>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">Loading transcription...</p>
                        </div>
                      ) : selectedMemory.status !== 'completed' ? (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">Processing in progress</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">Transcription will appear here when ready</p>
                        </div>
                      ) : selectedMemoryTranscript ? (
                        typeof selectedMemoryTranscript === 'string' ? (
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedMemoryTranscript}</p>
                        ) : Array.isArray(selectedMemoryTranscript) ? (
                          selectedMemoryTranscript.map((segment, idx) => (
                            <div 
                              key={idx} 
                              ref={activeUtteranceIndex === idx ? activeUtteranceRef : null}
                              onClick={() => segment.start && seekToTime(segment.start)}
                              className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-all cursor-pointer ${
                                activeUtteranceIndex === idx
                                  ? 'bg-[#10a37f]/10 border-[#10a37f] shadow-lg scale-[1.01] sm:scale-[1.02]'
                                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 active:bg-slate-100 dark:active:bg-white/10'
                              }`}
                            >
                              {segment.speaker && (
                                <p className="text-[10px] sm:text-xs font-bold text-[#10a37f] mb-1.5 sm:mb-2">{segment.speaker}</p>
                              )}
                              {segment.timestamp && (
                                <p className="text-[10px] sm:text-xs text-slate-500 mb-1.5 sm:mb-2">{segment.timestamp}</p>
                              )}
                              <p className={`text-xs sm:text-sm leading-relaxed ${
                                activeUtteranceIndex === idx
                                  ? 'text-slate-900 dark:text-white font-medium'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}>{segment.text || segment.content || JSON.stringify(segment)}</p>
                            </div>
                          ))
                        ) : typeof selectedMemoryTranscript === 'object' && selectedMemoryTranscript.utterances ? (
                          selectedMemoryTranscript.utterances.map((utterance, idx) => (
                            <div 
                              key={idx} 
                              ref={activeUtteranceIndex === idx ? activeUtteranceRef : null}
                              onClick={() => utterance.start && seekToTime(utterance.start)}
                              className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-all duration-200 cursor-pointer ${
                                activeUtteranceIndex === idx
                                  ? 'bg-[#10a37f]/10 border-[#10a37f] shadow-lg scale-[1.01] sm:scale-[1.02]'
                                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 active:bg-slate-100 dark:active:bg-white/10'
                              }`}
                            >
                              {utterance.speaker && (
                                <p className="text-[10px] sm:text-xs font-bold text-[#10a37f] mb-1.5 sm:mb-2">Speaker {utterance.speaker}</p>
                              )}
                              {utterance.start && (
                                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mb-1.5 sm:mb-2 flex items-center gap-1">
                                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                  </svg>
                                  {formatTime(utterance.start / 1000)}
                                </p>
                              )}
                              <p className={`text-xs sm:text-sm leading-relaxed ${
                                activeUtteranceIndex === idx
                                  ? 'text-slate-900 dark:text-white font-medium'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}>{utterance.text}</p>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                            <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap overflow-x-auto">{JSON.stringify(selectedMemoryTranscript, null, 2)}</pre>
                          </div>
                        )
                      ) : (
                        <div className="text-center py-12">
                          <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-slate-500 dark:text-slate-400">No transcription available</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Audio Player - Right Side (takes 1 column on large screens) - Hidden on mobile */}
                  {(selectedMemory.media_type === 'audio' || selectedMemory.media_type === 'video') && (
                    <div className="hidden lg:block lg:col-span-1 order-1 lg:order-2">
                      <div className="bg-gradient-to-br from-[#10a37f]/10 to-[#10a37f]/5 dark:from-[#10a37f]/20 dark:to-[#10a37f]/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-[#10a37f]/20 lg:sticky lg:top-6">
                        <div className="text-center mb-4 sm:mb-6">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#10a37f] rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                          </div>
                          <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white mb-1">Audio Player</h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {audioUrl ? 'Ready to play' : 'Audio loading...'}
                          </p>
                        </div>
                        
                        {audioUrl ? (
                          <>
                            {/* Audio Player with Waveform */}
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#10a37f]/10 text-[#10a37f] rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs sm:text-sm font-bold dark:text-white truncate">{selectedMemory.title || 'Audio'}</p>
                                    <p className="text-[10px] sm:text-xs text-slate-500 font-semibold">{formatTime(audioDuration || 0)}</p>
                                  </div>
                                </div>
                                <button onClick={togglePlayback} className="p-2 sm:p-2.5 text-white bg-[#10a37f] active:bg-[#1a7f64] rounded-lg transition-all active:scale-95 shadow-md shadow-[#10a37f]/20 flex-shrink-0 ml-2">
                                  {isPlaying ? (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                  )}
                                </button>
                              </div>
                              
                              {/* Progress Slider */}
                              <div className="mb-3 space-y-1.5 sm:space-y-2">
                                <div className="relative">
                                  <input
                                    type="range"
                                    min="0"
                                    max={audioDuration || 1}
                                    value={currentPlaybackTime || 0}
                                    onChange={handleSeek}
                                    className="w-full h-1.5 sm:h-2 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer custom-range-slider"
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                                    {formatTime(currentPlaybackTime)}
                                  </span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                                    {formatTime(audioDuration)}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Waveform Visualization */}
                              <div className="flex items-end justify-center gap-0.5 h-8 sm:h-10 mt-2 sm:mt-3">
                                {waveformData.map((value, index) => (
                                  <div
                                    key={index}
                                    className="flex-1 bg-[#10a37f] rounded-t transition-all duration-75 ease-out"
                                    style={{
                                      height: isPlaying ? `${Math.max(3, value * 100)}%` : '3px',
                                      opacity: isPlaying ? 0.6 + (value * 0.4) : 0.2,
                                      minHeight: '3px'
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                            
                            {/* Hidden audio element */}
                            {audioUrl && (
                              <audio 
                                ref={audioPlayerRef} 
                                src={audioUrl} 
                                onEnded={() => {
                                  setIsPlaying(false)
                                  setActiveUtteranceIndex(null)
                                }}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onLoadedData={() => {
                                  // Also try to get duration when data is loaded
                                  const audio = audioPlayerRef.current
                                  if (audio && audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
                                    setAudioDuration(audio.duration)
                                  }
                                }}
                                onCanPlay={() => {
                                  // Try once more when audio can play
                                  const audio = audioPlayerRef.current
                                  if (audio && audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
                                    setAudioDuration(audio.duration)
                                  }
                                }}
                                onError={(e) => {
                                  console.error('Audio loading error:', e)
                                  console.error('Audio URL:', audioUrl)
                                }}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                preload="metadata"
                                crossOrigin="anonymous"
                                className="hidden"
                              />
                            )}
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <div className="relative w-12 h-12 mx-auto mb-4">
                              <div className="absolute inset-0 border-4 border-[#10a37f]/20 rounded-full"></div>
                              <div className="absolute inset-0 border-t-4 border-[#10a37f] rounded-full animate-spin"></div>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Loading audio...</p>
                          </div>
                        )}
                        
                        {/* Memory Metadata */}
                        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-200 dark:border-white/10 space-y-2.5 sm:space-y-3">
                          {selectedMemory.topic && (
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Topic</p>
                              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 break-words">{selectedMemory.topic}</p>
                            </div>
                          )}
                          {selectedMemory.mood && (
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mood</p>
                              <p className="text-xl sm:text-2xl">{['😢', '😕', '😐', '🙂', '😄'][selectedMemory.mood - 1]}</p>
                            </div>
                          )}
                          {selectedMemory.people && selectedMemory.people.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">People</p>
                              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 break-words">
                                {Array.isArray(selectedMemory.people) ? selectedMemory.people.join(', ') : selectedMemory.people}
                              </p>
                            </div>
                          )}
                          {selectedMemory.tags && selectedMemory.tags.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tags</p>
                              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                {selectedMemory.tags.map(tag => (
                                  <span
                                    key={tag.id}
                                    className="px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-semibold"
                                    style={{
                                      backgroundColor: tag.color + '20',
                                      color: tag.color
                                    }}
                                  >
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {(selectedMemory.conversation_id || selectedMemory.conversationId) && (
                            <div className="pt-2">
                              <button
                                onClick={() => {
                                  const convId = selectedMemory.conversation_id || selectedMemory.conversationId
                                  navigate(`/conversation/${convId}`)
                                  setCurrentScreen(SCREENS.MAIN)
                                  setSelectedMemory(null)
                                  setIsPlaying(false)
                                  setActiveUtteranceIndex(null)
                                  setCurrentPlaybackTime(0)
                                  setAudioUrl(null)
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 bg-[#10a37f] text-white rounded-lg active:bg-[#1a7f64] transition-colors font-semibold text-xs sm:text-sm"
                              >
                                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                View Chat
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Floating Spotify-style Audio Player - Mobile Only */}
            {(selectedMemory.media_type === 'audio' || selectedMemory.media_type === 'video') && audioUrl && (
              <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#0d0d0d]/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] pb-safe-bottom">
                <div className="px-3 py-2">
                  {/* Metadata Section */}
                  {(selectedMemory.topic || selectedMemory.mood || (selectedMemory.people && selectedMemory.people.length > 0) || (selectedMemory.tags && selectedMemory.tags.length > 0)) && (
                    <div className="mb-2 pb-2 border-b border-slate-200/50 dark:border-white/10">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        {selectedMemory.topic && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Topic</span>
                            <span className="text-slate-700 dark:text-slate-300 font-medium">{selectedMemory.topic}</span>
                          </div>
                        )}
                        {selectedMemory.mood && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Mood</span>
                            <span className="text-base">{['😢', '😕', '😐', '🙂', '😄'][selectedMemory.mood - 1]}</span>
                          </div>
                        )}
                        {selectedMemory.people && selectedMemory.people.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">People</span>
                            <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[120px]">
                              {Array.isArray(selectedMemory.people) ? selectedMemory.people.join(', ') : selectedMemory.people}
                            </span>
                          </div>
                        )}
                        {selectedMemory.tags && selectedMemory.tags.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tags</span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {selectedMemory.tags.slice(0, 3).map(tag => (
                                <span
                                  key={tag.id}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                                  style={{
                                    backgroundColor: tag.color + '20',
                                    color: tag.color
                                  }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                              {selectedMemory.tags.length > 3 && (
                                <span className="text-slate-500 dark:text-slate-400 text-[10px]">+{selectedMemory.tags.length - 3}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Progress Bar */}
                  <div className="mb-2">
                    <input
                      type="range"
                      min="0"
                      max={audioDuration || 1}
                      value={currentPlaybackTime || 0}
                      onChange={handleSeek}
                      className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #10a37f 0%, #10a37f ${((currentPlaybackTime || 0) / (audioDuration || 1)) * 100}%, rgb(226 232 240) ${((currentPlaybackTime || 0) / (audioDuration || 1)) * 100}%, rgb(226 232 240) 100%)`
                      }}
                    />
                  </div>
                  
                  {/* Player Controls */}
                  <div className="flex items-center gap-3">
                    {/* Thumbnail/Icon */}
                    <div className="w-12 h-12 bg-[#10a37f] rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    
                    {/* Title and Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                        {selectedMemory.title || 'Audio'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatTime(currentPlaybackTime)} / {formatTime(audioDuration || 0)}
                      </p>
                    </div>
                    
                    {/* Play/Pause Button */}
                    <button 
                      onClick={togglePlayback} 
                      className="w-10 h-10 bg-[#10a37f] text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-lg active:scale-95 transition-transform hover:bg-[#1a7f64]"
                    >
                      {isPlaying ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  // NEW: View Recording Screen
  if (currentScreen === SCREENS.VIEW_RECORDING && selectedRecording) {
    return (
      <>
        <ToastContainer />
        <DateDetailsModal />
        <LoginModal />
        <SearchModal />
        <ConfirmationModal />
        <ProfileDialog />
        <ConfirmationModal />
        <ProfileDialog />
        <div className="h-[100dvh] flex bg-white dark:bg-[#0d0d0d] overflow-hidden">
          {sidebarJSX}
          <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
            <header className="h-14 lg:h-16 border-b border-slate-200 dark:border-white/10 px-4 lg:px-6 flex items-center justify-between bg-white/80 dark:bg-[#0d0d0d]/80 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <button onClick={() => { 
                  setCurrentScreen(SCREENS.MAIN); 
                  setSelectedRecording(null); 
                  setIsPlaying(false); 
                  setActiveUtteranceIndex(null);
                  setCurrentPlaybackTime(0);
                }} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div>
                  <h1 className="text-sm font-semibold text-slate-800 dark:text-white truncate">{selectedRecording.filename || 'Untitled Recording'}</h1>
                  <p className="text-xs text-slate-500">{new Date(selectedRecording.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <button onClick={(e) => handleDeleteDocument(selectedRecording, e)} className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-lg transition-all" title="Delete recording">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="max-w-7xl mx-auto p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Transcription - Center/Left (takes 2 columns on large screens) */}
                  <div className="lg:col-span-2 bg-white dark:bg-[#171717] rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden order-2 lg:order-1">
                    <div className="p-6 border-b border-slate-200 dark:border-white/10">
                      <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#10a37f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Transcription
                        {recordingTranscription && typeof recordingTranscription === 'object' && recordingTranscription.utterances && (
                          <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                            ({recordingTranscription.utterances.length} {recordingTranscription.utterances.length === 1 ? 'segment' : 'segments'})
                          </span>
                        )}
                        {recordingTranscription && Array.isArray(recordingTranscription) && (
                          <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                            ({recordingTranscription.length} {recordingTranscription.length === 1 ? 'segment' : 'segments'})
                          </span>
                        )}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Full transcript of the recording</p>
                    </div>
                  
                  <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {loadingRecording && !recordingTranscription ? (
                      <div className="text-center py-12">
                        <div className="relative w-16 h-16 mx-auto mb-6">
                          <div className="absolute inset-0 border-4 border-[#10a37f]/20 rounded-full"></div>
                          <div className="absolute inset-0 border-t-4 border-[#10a37f] rounded-full animate-spin"></div>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">Loading transcription...</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">This may take a moment</p>
                      </div>
                    ) : recordingTranscription ? (
                      typeof recordingTranscription === 'string' ? (
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{recordingTranscription}</p>
                      ) : Array.isArray(recordingTranscription) ? (
                        recordingTranscription.map((segment, idx) => (
                          <div 
                            key={idx} 
                            ref={activeUtteranceIndex === idx ? activeUtteranceRef : null}
                            onClick={() => segment.start && seekToTime(segment.start)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer ${
                              activeUtteranceIndex === idx
                                ? 'bg-[#10a37f]/10 border-[#10a37f] shadow-lg scale-[1.02]'
                                : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                            }`}
                          >
                            {segment.speaker && (
                              <p className="text-xs font-bold text-[#10a37f] mb-2">{segment.speaker}</p>
                            )}
                            {segment.timestamp && (
                              <p className="text-xs text-slate-500 mb-2">{segment.timestamp}</p>
                            )}
                            <p className={`text-sm leading-relaxed ${
                              activeUtteranceIndex === idx
                                ? 'text-slate-900 dark:text-white font-medium'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}>{segment.text || segment.content || JSON.stringify(segment)}</p>
                          </div>
                        ))
                      ) : typeof recordingTranscription === 'object' ? (
                        <div className="space-y-4">
                          {/* Check for common transcription text fields */}
                          {(recordingTranscription.text || recordingTranscription.content) ? (
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {recordingTranscription.text || recordingTranscription.content}
                            </p>
                          ) : recordingTranscription.utterances && Array.isArray(recordingTranscription.utterances) ? (
                            recordingTranscription.utterances.map((utterance, idx) => (
                              <div 
                                key={idx} 
                                ref={activeUtteranceIndex === idx ? activeUtteranceRef : null}
                                onClick={() => utterance.start && seekToTime(utterance.start)}
                                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                                  activeUtteranceIndex === idx
                                    ? 'bg-[#10a37f]/10 border-[#10a37f] shadow-lg scale-[1.02]'
                                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                                }`}
                              >
                                {utterance.speaker && (
                                  <p className="text-xs font-bold text-[#10a37f] mb-2">Speaker {utterance.speaker}</p>
                                )}
                                {utterance.start && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                    </svg>
                                    {Math.floor(utterance.start / 1000)}s
                                  </p>
                                )}
                                <p className={`text-sm leading-relaxed ${
                                  activeUtteranceIndex === idx
                                    ? 'text-slate-900 dark:text-white font-medium'
                                    : 'text-slate-700 dark:text-slate-300'
                                }`}>{utterance.text}</p>
                              </div>
                            ))
                          ) : recordingTranscription.words && Array.isArray(recordingTranscription.words) ? (
                            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                {recordingTranscription.words.map(w => w.text || w.word).join(' ')}
                              </p>
                            </div>
                          ) : (
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                              <p className="text-xs font-bold text-yellow-700 dark:text-yellow-300 mb-2">Raw Transcription Object:</p>
                              <pre className="text-xs text-yellow-600 dark:text-yellow-400 whitespace-pre-wrap overflow-x-auto">{JSON.stringify(recordingTranscription, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                          <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap overflow-x-auto">{JSON.stringify(recordingTranscription, null, 2)}</pre>
                        </div>
                      )
                    ) : (
                      <div className="text-center py-12">
                        <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-slate-500 dark:text-slate-400">No transcription available</p>
                      </div>
                    )}
                    </div>
                  </div>

                  {/* Audio Player - Right Side (takes 1 column on large screens) */}
                  <div className="lg:col-span-1 order-1 lg:order-2">
                    <div className="bg-gradient-to-br from-[#10a37f]/10 to-[#10a37f]/5 dark:from-[#10a37f]/20 dark:to-[#10a37f]/10 rounded-2xl p-6 border border-[#10a37f]/20 sticky top-6">
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-[#10a37f] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Audio Player</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {loadingRecording && !selectedRecording?.audioUrl ? 'Loading audio...' : selectedRecording?.audioUrl ? 'Ready to play' : 'No audio available'}
                        </p>
                      </div>
                      
                      {loadingRecording && !selectedRecording?.audioUrl ? (
                        <div className="text-center py-8">
                          <div className="relative w-12 h-12 mx-auto mb-4">
                            <div className="absolute inset-0 border-4 border-[#10a37f]/20 rounded-full"></div>
                            <div className="absolute inset-0 border-t-4 border-[#10a37f] rounded-full animate-spin"></div>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Preparing audio...</p>
                        </div>
                      ) : selectedRecording?.audioUrl ? (
                        <>
                          <div className="mb-4 flex justify-center">
                            <button onClick={toggleRecordingPlayback} className="p-6 bg-[#10a37f] hover:bg-[#1a7f64] text-white rounded-2xl transition-all active:scale-95 shadow-xl">
                              {isPlaying ? (
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                              ) : (
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                              )}
                            </button>
                          </div>
                          <audio 
                            ref={recordingAudioRef} 
                            src={selectedRecording.audioUrl} 
                            onEnded={() => {
                              setIsPlaying(false)
                              setActiveUtteranceIndex(null)
                            }}
                            onTimeUpdate={handleAudioTimeUpdate}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            className="w-full"
                            controls
                          />
                          <div className="mt-4 p-3 bg-white dark:bg-white/5 rounded-xl">
                            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                              <span>Audio File</span>
                              <svg className="w-4 h-4 text-[#10a37f]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z"/>
                              </svg>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 text-center">
                          <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm text-red-600 dark:text-red-400">Audio not available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (currentScreen === SCREENS.REVIEW) {
    return (
      <>
        <ToastContainer />
        <DateDetailsModal />
        <LoginModal />
        <SearchModal />
        <ConfirmationModal />
        <ProfileDialog />
        <ConfirmationModal />
        <ProfileDialog />
        {showTagModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#171717] rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-white/10">
              <h3 className="text-xl font-bold mb-4 dark:text-white">Create New Tag</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Tag Name</label>
                  <input 
                    type="text" 
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g., Work, Personal, Ideas"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10a37f] dark:text-white"
                    onKeyPress={(e) => e.key === 'Enter' && createTag()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Color</label>
                  <input 
                    type="color" 
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-full h-12 rounded-xl cursor-pointer"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={createTag}
                    className="flex-1 py-3 bg-[#10a37f] text-white font-semibold rounded-xl hover:bg-[#1a7f64] transition-colors"
                  >
                    Create Tag
                  </button>
                  <button 
                    onClick={() => setShowTagModal(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                    <button
                      onClick={() => {
                        setShowTagModal(false)
                        setShowTagManagementModal(true)
                      }}
                      className="w-full text-sm text-slate-600 dark:text-slate-400 hover:text-[#10a37f] transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Manage Existing Tags
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {showTagManagementModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#171717] rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-white/10 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold dark:text-white">Manage Tags</h3>
                <button
                  onClick={() => setShowTagManagementModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {tags.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 dark:text-slate-400 mb-4">No tags yet</p>
                  <button
                    onClick={() => {
                      setShowTagManagementModal(false)
                      setShowTagModal(true)
                    }}
                    className="px-4 py-2 bg-[#10a37f] text-white font-semibold rounded-xl hover:bg-[#1a7f64] transition-colors"
                  >
                    Create Your First Tag
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {tags.map(tag => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: tag.color + '20' }}
                        >
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold dark:text-white truncate">{tag.name}</p>
                          <p className="text-xs text-slate-500">
                            {tag.memory_count || 0} {tag.memory_count === 1 ? 'memory' : 'memories'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteTag(tag.id, tag.name)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-lg transition-all flex-shrink-0"
                        title="Delete tag"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  onClick={() => {
                    setShowTagManagementModal(false)
                    setShowTagModal(true)
                  }}
                  className="w-full py-3 bg-[#10a37f] text-white font-semibold rounded-xl hover:bg-[#1a7f64] transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Tag
                </button>
              </div>
            </div>
          </div>
        )}
        
        {showMemoryDetailModal && selectedMemory && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#171717] rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-white/10 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold dark:text-white">
                  {editingMemory ? 'Edit Memory' : 'Memory Details'}
                </h3>
                <button
                  onClick={() => setShowMemoryDetailModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Title</label>
                  {editingMemory ? (
                    <input 
                      type="text" 
                      value={memoryTitle} 
                      onChange={(e) => setMemoryTitle(e.target.value)} 
                      className="w-full bg-transparent text-lg font-bold focus:outline-none dark:text-white px-1" 
                    />
                  ) : (
                    <p className="text-lg font-bold dark:text-white px-1">{selectedMemory.title || 'Untitled'}</p>
                  )}
                </div>

                {/* Description */}
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Description</label>
                  {editingMemory ? (
                    <textarea 
                      value={memoryText} 
                      onChange={(e) => setMemoryText(e.target.value)} 
                      className="w-full bg-transparent text-sm focus:outline-none dark:text-white px-1 min-h-[100px] resize-none" 
                    />
                  ) : (
                    <p className="text-sm dark:text-white px-1">{selectedMemory.description || 'No description'}</p>
                  )}
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Media Type</label>
                    <p className="text-sm dark:text-white px-1 capitalize">
                      {selectedMemory.media_type === 'audio' && '🎵 Audio'}
                      {selectedMemory.media_type === 'video' && '🎬 Video'}
                      {selectedMemory.media_type === 'text' && '📄 Text'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Status</label>
                    <p className="text-sm dark:text-white px-1 capitalize">
                      {selectedMemory.status === 'completed' && '✅ Completed'}
                      {selectedMemory.status === 'processing' && '⏳ Processing'}
                      {selectedMemory.status === 'pending' && '⏸️ Pending'}
                      {selectedMemory.status === 'failed' && '❌ Failed'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Topic</label>
                    {editingMemory ? (
                      <input 
                        type="text" 
                        value={memoryTopic} 
                        onChange={(e) => setMemoryTopic(e.target.value)} 
                        className="w-full bg-transparent text-sm focus:outline-none dark:text-white px-1" 
                      />
                    ) : (
                      <p className="text-sm dark:text-white px-1">{selectedMemory.topic || 'None'}</p>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Date</label>
                    {editingMemory ? (
                      <input 
                        type="datetime-local" 
                        value={memoryDate} 
                        onChange={(e) => setMemoryDate(e.target.value)} 
                        className="w-full bg-transparent text-sm focus:outline-none dark:text-white px-1" 
                      />
                    ) : (
                      <p className="text-sm dark:text-white px-1">
                        {selectedMemory.memory_date ? new Date(selectedMemory.memory_date).toLocaleString() : 'Not set'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Mood</label>
                    {editingMemory ? (
                      <div className="flex gap-2 px-1">
                        {[1, 2, 3, 4, 5].map((mood) => (
                          <button
                            key={mood}
                            type="button"
                            onClick={() => setMemoryMood(memoryMood === mood ? null : mood)}
                            className={`flex-1 py-2 rounded-lg text-lg transition-all ${
                              memoryMood === mood 
                                ? 'bg-[#10a37f] shadow-md scale-110' 
                                : 'bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'
                            }`}
                          >
                            {['😢', '😕', '😐', '🙂', '😄'][mood - 1]}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-2xl px-1">
                        {selectedMemory.mood ? ['😢', '😕', '😐', '🙂', '😄'][selectedMemory.mood - 1] : 'Not set'}
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">People</label>
                    {editingMemory ? (
                      <input 
                        type="text" 
                        value={memoryPeople} 
                        onChange={(e) => setMemoryPeople(e.target.value)} 
                        className="w-full bg-transparent text-sm focus:outline-none dark:text-white px-1" 
                        placeholder="John, Sarah, ..."
                      />
                    ) : (
                      <p className="text-sm dark:text-white px-1">
                        {selectedMemory.people && selectedMemory.people.length > 0 ? selectedMemory.people.join(', ') : 'None'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Tags</label>
                  {editingMemory ? (
                    <div className="flex flex-wrap gap-2 px-1">
                      {tags.map(tag => (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            selectedTags.find(t => t.id === tag.id)
                              ? 'ring-2 ring-offset-2 dark:ring-offset-[#171717]'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: tag.color + '20',
                            color: tag.color,
                            ringColor: tag.color
                          }}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 px-1">
                      {selectedMemory.tags && selectedMemory.tags.length > 0 ? (
                        selectedMemory.tags.map(tag => (
                          <span 
                            key={tag.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ backgroundColor: tag.color + '20', color: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No tags</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Created</label>
                    <p className="text-xs dark:text-white px-1">
                      {new Date(selectedMemory.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Updated</label>
                    <p className="text-xs dark:text-white px-1">
                      {new Date(selectedMemory.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Transcript Section */}
                {(selectedMemory.media_type === 'audio' || selectedMemory.media_type === 'video') && (
                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                        Transcript {selectedMemory.media_type === 'video' && '(Audio)'}
                      </label>
                      {selectedMemory.status === 'completed' && (
                        <span className="text-[10px] text-slate-500 px-2 py-1 bg-white dark:bg-white/5 rounded-lg">
                          {selectedMemory.status === 'completed' ? '✅ Available' : '⏳ Processing'}
                        </span>
                      )}
                    </div>
                    
                    {loadingTranscript ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="flex items-center gap-2 text-slate-500">
                          <div className="w-4 h-4 border-2 border-[#10a37f] border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm">Loading transcript...</span>
                        </div>
                      </div>
                    ) : selectedMemory.status !== 'completed' ? (
                      <div className="text-center py-6">
                        <p className="text-sm text-slate-500">
                          {selectedMemory.status === 'processing' && '⏳ Transcript is being generated...'}
                          {selectedMemory.status === 'pending' && '⏸️ Memory is pending processing'}
                          {selectedMemory.status === 'failed' && '❌ Transcription failed'}
                        </p>
                      </div>
                    ) : selectedMemoryTranscript ? (
                      <div className="max-h-96 overflow-y-auto custom-scrollbar px-1">
                        {typeof selectedMemoryTranscript === 'string' ? (
                          <p className="text-sm dark:text-white whitespace-pre-wrap">{selectedMemoryTranscript}</p>
                        ) : selectedMemoryTranscript.utterances ? (
                          <div className="space-y-3">
                            {selectedMemoryTranscript.utterances.map((utterance, idx) => (
                              <div key={idx} className="flex gap-3 p-3 rounded-lg hover:bg-white dark:hover:bg-white/5 transition-colors">
                                <div className="flex-shrink-0 w-20 text-right">
                                  <span className="text-xs font-mono text-slate-500">
                                    {Math.floor(utterance.start / 1000 / 60)}:{String(Math.floor((utterance.start / 1000) % 60)).padStart(2, '0')}
                                  </span>
                                  {utterance.speaker && (
                                    <p className="text-[10px] font-semibold text-[#10a37f] mt-1">
                                      {utterance.speaker}
                                    </p>
                                  )}
                                </div>
                                <p className="text-sm dark:text-white flex-1">{utterance.text}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm dark:text-white whitespace-pre-wrap">{JSON.stringify(selectedMemoryTranscript, null, 2)}</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-sm text-slate-500">No transcript available</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex gap-3">
                {editingMemory ? (
                  <>
                    <button
                      onClick={updateMemoryMetadata}
                      className="flex-1 py-3 bg-[#10a37f] text-white font-semibold rounded-xl hover:bg-[#1a7f64] transition-colors"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setEditingMemory(false)
                        viewMemoryDetail(selectedMemory)
                      }}
                      className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditingMemory(true)}
                      className="flex-1 py-3 bg-[#10a37f] text-white font-semibold rounded-xl hover:bg-[#1a7f64] transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => deleteMemory(selectedMemory.id)}
                      className="px-6 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="h-[100dvh] bg-white dark:bg-[#0d0d0d] relative overflow-hidden md:flex md:items-center md:justify-center">
          {audioUrl && (
            <audio 
              ref={audioPlayerRef} 
              src={audioUrl} 
              onEnded={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
            />
          )}

          {/* Desktop: Full-page layout */}
          <div className="hidden md:flex md:flex-col h-full w-full">
            <div className="w-full max-w-7xl mx-auto px-6 py-8 flex-1 flex flex-col">
              {/* Header with close button */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight dark:text-white mb-2">Create Memory</h2>
                  <p className="text-sm text-slate-500">Add audio, text, and tags to create a rich memory</p>
                </div>
                <button
                  onClick={handleDiscardMemory}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Left Column: Required Fields */}
                <div className="flex flex-col space-y-6">
                  {/* Title - Most prominent */}
                  <div className="p-6 bg-white dark:bg-white/10 rounded-2xl border-2 border-[#10a37f]/20 dark:border-[#10a37f]/30 shadow-sm hover:shadow-md transition-shadow">
                    <label className="block text-xs font-bold text-[#10a37f] uppercase tracking-wider mb-3 px-1">
                      Memory Title ✱
                    </label>
                    <input 
                      type="text" 
                      value={hasEditedTitle ? (memoryTitle || '') : (memoryTitle ?? recordingName ?? '')} 
                      onChange={(e) => {
                        setMemoryTitle(e.target.value)
                        setHasEditedTitle(true)
                      }} 
                      className="w-full bg-transparent text-2xl font-bold focus:outline-none focus:ring-0 dark:text-white px-1 placeholder:text-slate-300 dark:placeholder:text-slate-600" 
                      placeholder="Give it a meaningful title..." 
                      autoFocus
                    />
                  </div>
                  
                {/* Audio Clip - Required visual */}
                <div className="px-6 py-4 bg-white dark:bg-white/10 rounded-2xl border-2 border-[#10a37f]/20 dark:border-[#10a37f]/30 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#10a37f]/10 text-[#10a37f] rounded-xl flex items-center justify-center shadow-inner">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold dark:text-white">Audio Clip</p>
                        <p className="text-xs text-slate-500 font-semibold">{formatTime(savedRecordingDuration)} duration</p>
                      </div>
                    </div>
                    <button onClick={togglePlayback} className="p-3 text-white bg-[#10a37f] hover:bg-[#1a7f64] rounded-xl transition-all active:scale-95 shadow-lg shadow-[#10a37f]/20">
                      {isPlaying ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      )}
                    </button>
                  </div>
                  {/* Progress Slider */}
                  <div className="mt-4 space-y-2">
                    <div className="relative">
                      <input
                        type="range"
                        min="0"
                        max={getValidDuration()}
                        value={currentPlaybackTime || 0}
                        onChange={handleSeek}
                                    className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer custom-range-slider"
                        style={{
                          background: `linear-gradient(to right, #10a37f 0%, #10a37f ${((currentPlaybackTime || 0) / getValidDuration()) * 100}%, rgb(226 232 240) ${((currentPlaybackTime || 0) / getValidDuration()) * 100}%, rgb(226 232 240) 100%)`
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {formatTime(currentPlaybackTime)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {formatTime(getValidDuration())}
                      </span>
                    </div>
                  </div>
                  {/* Waveform Visualization */}
                  <div className="flex items-end justify-center gap-1 h-12 mt-2">
                    {waveformData.map((value, index) => (
                      <div
                        key={index}
                        className="flex-1 bg-[#10a37f] rounded-t transition-all duration-75 ease-out"
                        style={{
                          height: isPlaying ? `${Math.max(4, value * 100)}%` : '4px',
                          opacity: isPlaying ? 0.6 + (value * 0.4) : 0.2,
                          minHeight: '4px'
                        }}
                      />
                    ))}
                  </div>
                </div>

                  {/* Additional Notes */}
                  <div className="flex-1 p-5 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Additional Notes</label>
                    <textarea 
                      value={memoryText} 
                      onChange={(e) => setMemoryText(e.target.value)} 
                      className="w-full h-full bg-transparent text-sm focus:outline-none dark:text-white px-1 resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600" 
                      placeholder="Add context, thoughts, or key points..."
                    />
                  </div>
                </div>

                {/* Right Column: Optional Fields */}
                <div className="flex flex-col space-y-5 overflow-y-auto">
                  <div className="p-5 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Topic</label>
                    <input 
                      type="text" 
                      value={memoryTopic} 
                      onChange={(e) => setMemoryTopic(e.target.value)} 
                      className="w-full bg-transparent text-sm focus:outline-none dark:text-white px-1 placeholder:text-slate-400 dark:placeholder:text-slate-600" 
                      placeholder="e.g., Work Meeting, Personal Reflection"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="p-5 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Mood</label>
                      <div className="flex gap-2 px-1">
                        {[1, 2, 3, 4, 5].map((mood) => (
                          <button
                            key={mood}
                            type="button"
                            onClick={() => setMemoryMood(memoryMood === mood ? null : mood)}
                            className={`flex-1 py-2.5 rounded-lg text-xl transition-all ${
                              memoryMood === mood 
                                ? 'bg-[#10a37f] shadow-lg scale-110 ring-2 ring-[#10a37f]/30 ring-offset-2' 
                                : 'bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 hover:scale-105'
                            }`}
                            title={['😢', '😕', '😐', '🙂', '😄'][mood - 1]}
                          >
                            {['😢', '😕', '😐', '🙂', '😄'][mood - 1]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-5 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">People</label>
                      <input 
                        type="text" 
                        value={memoryPeople} 
                        onChange={(e) => setMemoryPeople(e.target.value)} 
                        className="w-full bg-transparent text-sm focus:outline-none dark:text-white px-1 placeholder:text-slate-400 dark:placeholder:text-slate-600" 
                        placeholder="John, Sarah, ..."
                      />
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50/50 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                        Tags {tags.length > 0 && <span className="text-slate-500">({tags.length} available)</span>}
                      </label>
                      <button 
                        onClick={() => setShowTagModal(true)}
                        className="text-xs font-semibold text-[#10a37f] hover:text-[#1a7f64] transition-colors"
                      >
                        + New Tag
                      </button>
                    </div>
                    
                    {tags.length === 0 ? (
                      <div className="text-center py-6 px-1">
                        <p className="text-sm text-slate-400 mb-2">No tags yet</p>
                        <p className="text-xs text-slate-500">Create tags to organize your memories</p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-4 px-1">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            💡 Select tags to categorize this memory. Tags with numbers show existing usage.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 px-1 max-h-48 overflow-y-auto">
                          {tags.map(tag => {
                            const isSelected = selectedTags.find(t => t.id === tag.id)
                            const memoryCount = tag.memory_count || 0
                            
                            return (
                              <div key={tag.id} className="relative group">
                                <button
                                  onClick={() => toggleTag(tag)}
                                  className={`relative px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                                    isSelected
                                      ? 'ring-2 ring-offset-2 dark:ring-offset-[#171717] scale-105'
                                      : 'opacity-70 hover:opacity-100 hover:scale-105'
                                  }`}
                                  style={{
                                    backgroundColor: tag.color + '20',
                                    color: tag.color,
                                    ringColor: tag.color
                                  }}
                                  title={memoryCount > 0 ? `${tag.name} - Used in ${memoryCount} ${memoryCount === 1 ? 'memory' : 'memories'}` : tag.name}
                                >
                                  <span className="flex items-center gap-1.5">
                                    {isSelected && (
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                    <span>{tag.name}</span>
                                    {memoryCount > 0 && (
                                      <span 
                                        className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                                        style={{ 
                                          backgroundColor: tag.color + '40',
                                          color: tag.color
                                        }}
                                      >
                                        {memoryCount}
                                      </span>
                                    )}
                                  </span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteTag(tag.id, tag.name)
                                  }}
                                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] hover:bg-red-600 shadow-lg z-10"
                                  title={`Delete "${tag.name}"`}
                                >
                                  ×
                                </button>
                              </div>
                            )
                          })}
                        </div>
                        {selectedTags.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                            <p className="text-xs text-slate-500 dark:text-slate-400 px-1 flex items-center gap-2">
                              <svg className="w-4 h-4 text-[#10a37f]" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className="font-semibold">Selected:</span> {selectedTags.map(t => t.name).join(', ')}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 gap-4 pt-4 border-t border-slate-200 dark:border-white/10">
                    <button 
                      onClick={uploadAndProcess} 
                      className="w-full py-5 bg-[#10a37f] text-white text-base font-bold rounded-2xl shadow-lg shadow-[#10a37f]/30 hover:bg-[#1a7f64] hover:shadow-xl hover:shadow-[#10a37f]/40 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Memory
                    </button>
                    <button 
                      onClick={handleDiscardMemory}
                      className="w-full py-3 text-slate-500 dark:text-white/40 font-semibold text-sm hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile: Full-screen scrollable layout */}
          <div className="md:hidden h-[100dvh] flex flex-col bg-white dark:bg-[#0d0d0d] overflow-hidden">
            {/* Header with close button */}
            <div className="flex items-center justify-between px-4 pt-safe-top pt-4 pb-3 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0d0d] z-10">
              <div>
                <h2 className="text-xl font-bold tracking-tight dark:text-white">Create Memory</h2>
                <p className="text-xs text-slate-500 mt-0.5">Add details to your recording</p>
              </div>
              <button
                onClick={handleDiscardMemory}
                className="p-2 active:bg-slate-100 dark:active:bg-white/10 rounded-lg transition-colors text-slate-500 dark:text-slate-400"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 pb-safe-bottom custom-scrollbar">
              <div className="space-y-4 max-w-2xl mx-auto">
                {/* Title - Most prominent */}
                <div className="p-4 bg-white dark:bg-white/10 rounded-xl border-2 border-[#10a37f]/20 dark:border-[#10a37f]/30 shadow-sm">
                  <label className="block text-[10px] font-bold text-[#10a37f] uppercase tracking-wider mb-2">
                    Memory Title ✱
                  </label>
                  <input 
                    type="text" 
                    value={hasEditedTitle ? (memoryTitle || '') : (memoryTitle ?? recordingName ?? '')} 
                    onChange={(e) => {
                      setMemoryTitle(e.target.value)
                      setHasEditedTitle(true)
                    }} 
                    className="w-full bg-transparent text-lg font-bold focus:outline-none focus:ring-0 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600" 
                    placeholder="Give it a meaningful title..." 
                    autoFocus
                  />
                </div>

                {/* Audio Clip */}
                <div className="p-4 bg-white dark:bg-white/10 rounded-xl border-2 border-[#10a37f]/20 dark:border-[#10a37f]/30 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-[#10a37f]/10 text-[#10a37f] rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold dark:text-white truncate">Audio Clip</p>
                        <p className="text-xs text-slate-500 font-semibold">{formatTime(savedRecordingDuration)}</p>
                      </div>
                    </div>
                    <button onClick={togglePlayback} className="p-2.5 text-white bg-[#10a37f] active:bg-[#1a7f64] rounded-lg transition-all active:scale-95 shadow-md shadow-[#10a37f]/20 flex-shrink-0 ml-2">
                      {isPlaying ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      )}
                    </button>
                  </div>
                  {/* Progress Slider */}
                  <div className="mt-4 space-y-2">
                    <div className="relative">
                      <input
                        type="range"
                        min="0"
                        max={getValidDuration()}
                        value={currentPlaybackTime || 0}
                        onChange={handleSeek}
                        className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #10a37f 0%, #10a37f ${((currentPlaybackTime || 0) / getValidDuration()) * 100}%, rgb(226 232 240) ${((currentPlaybackTime || 0) / getValidDuration()) * 100}%, rgb(226 232 240) 100%)`
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {formatTime(currentPlaybackTime)}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {formatTime(getValidDuration())}
                      </span>
                    </div>
                  </div>
                  {/* Waveform Visualization */}
                  <div className="flex items-end justify-center gap-0.5 h-10 mt-3">
                    {waveformData.map((value, index) => (
                      <div
                        key={index}
                        className="flex-1 bg-[#10a37f] rounded-t transition-all duration-75 ease-out"
                        style={{
                          height: isPlaying ? `${Math.max(3, value * 100)}%` : '3px',
                          opacity: isPlaying ? 0.6 + (value * 0.4) : 0.2,
                          minHeight: '3px'
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Optional Section Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 text-[10px] font-semibold text-slate-400 bg-white dark:bg-[#0d0d0d] uppercase tracking-wider">
                      Optional Details
                    </span>
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="p-4 bg-slate-50/50 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Additional Notes</label>
                  <textarea 
                    value={memoryText} 
                    onChange={(e) => setMemoryText(e.target.value)} 
                    className="w-full bg-transparent text-sm focus:outline-none dark:text-white min-h-[100px] resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600" 
                    placeholder="Add context, thoughts, or key points..."
                  />
                </div>

                {/* Topic */}
                <div className="p-4 bg-slate-50/50 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Topic</label>
                  <input 
                    type="text" 
                    value={memoryTopic} 
                    onChange={(e) => setMemoryTopic(e.target.value)} 
                    className="w-full bg-transparent text-sm focus:outline-none dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600" 
                    placeholder="e.g., Work Meeting, Personal Reflection"
                  />
                </div>

                {/* Mood and People */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-50/50 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Mood</label>
                    <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((mood) => (
                          <button
                            key={mood}
                            type="button"
                            onClick={() => setMemoryMood(memoryMood === mood ? null : mood)}
                            className={`flex-1 py-1 rounded-lg text-lg transition-all ${
                              memoryMood === mood 
                                ? 'bg-[#10a37f] shadow-md scale-105 ring-2 ring-[#10a37f]/30' 
                                : 'bg-white dark:bg-white/5 active:bg-slate-100 dark:active:bg-white/10'
                            }`}
                            title={['😢', '😕', '😐', '🙂', '😄'][mood - 1]}
                          >
                            {['😢', '😕', '😐', '🙂', '😄'][mood - 1]}
                          </button>
                        ))}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50/50 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">People</label>
                    <input 
                      type="text" 
                      value={memoryPeople} 
                      onChange={(e) => setMemoryPeople(e.target.value)} 
                      className="w-full bg-transparent text-sm focus:outline-none dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600" 
                      placeholder="John, Sarah..."
                    />
                  </div>
                </div>

                {/* Tags */}
                <div className="p-4 bg-slate-50/50 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Tags {tags.length > 0 && <span className="text-slate-500">({tags.length})</span>}
                    </label>
                    <button 
                      onClick={() => setShowTagModal(true)}
                      className="text-xs font-semibold text-[#10a37f] active:text-[#1a7f64] transition-colors px-2 py-1"
                    >
                      + New
                    </button>
                  </div>
                  
                  {tags.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-slate-400 mb-1">No tags yet</p>
                      <p className="text-[10px] text-slate-500">Create tags to organize</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {tags.map(tag => {
                          const isSelected = selectedTags.find(t => t.id === tag.id)
                          const memoryCount = tag.memory_count || 0
                          
                          return (
                            <div key={tag.id} className="relative group">
                              <button
                                onClick={() => toggleTag(tag)}
                                className={`relative px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                                  isSelected
                                    ? 'ring-2 ring-offset-1 dark:ring-offset-[#0d0d0d]'
                                    : 'opacity-70 active:opacity-100'
                                }`}
                                style={{
                                  backgroundColor: isSelected ? tag.color + '20' : 'transparent',
                                  color: tag.color,
                                  borderColor: isSelected ? tag.color : 'transparent',
                                  ringColor: tag.color
                                }}
                                title={memoryCount > 0 ? `${tag.name} - ${memoryCount} memories` : tag.name}
                              >
                                <span className="flex items-center gap-1">
                                  {isSelected && (
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                  <span>{tag.name}</span>
                                  {memoryCount > 0 && (
                                    <span 
                                      className="text-[9px] px-1 py-0.5 rounded-full font-bold ml-0.5"
                                      style={{ 
                                        backgroundColor: tag.color + '40',
                                        color: tag.color
                                      }}
                                    >
                                      {memoryCount}
                                    </span>
                                  )}
                                </span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteTag(tag.id, tag.name)
                                }}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] hover:bg-red-600 shadow-lg"
                                title={`Delete "${tag.name}"`}
                              >
                                ×
                              </button>
                            </div>
                          )
                        })}
                      </div>
                      {selectedTags.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-[#10a37f]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="font-semibold">Selected:</span> 
                            <span className="truncate">{selectedTags.map(t => t.name).join(', ')}</span>
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 gap-3 pt-4 border-t border-slate-200 dark:border-white/10 pb-4">
                  <button 
                    onClick={uploadAndProcess} 
                    className="w-full py-4 bg-[#10a37f] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#10a37f]/30 active:bg-[#1a7f64] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Memory
                  </button>
                  <button 
                    onClick={async () => {
                      // Check if there are any changes or a file selected
                      const hasChanges = selectedFile || 
                                        memoryText.trim() || 
                                        memoryTitle?.trim() || 
                                        memoryTopic?.trim() || 
                                        memoryMood !== null || 
                                        memoryPeople?.trim() || 
                                        selectedTags.length > 0
                      
                      if (hasChanges) {
                        const confirmed = await showConfirmation({
                          title: 'Discard Memory',
                          message: 'Discard this memory? All changes will be lost.',
                          confirmText: 'Discard',
                          cancelText: 'Cancel',
                          type: 'warning'
                        })
                        if (!confirmed) return
                      }
                      
                      handleDiscardMemory()
                    }}
                    className="w-full py-3 text-slate-500 dark:text-white/40 font-semibold text-xs active:text-red-500 active:bg-red-50 dark:active:bg-red-500/10 rounded-lg transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }
  
  if (currentScreen === SCREENS.CREATE_TEXT_MEMORY) {
    return (
      <>
        <ToastContainer />
        <DateDetailsModal />
        <LoginModal />
        <SearchModal />
        <ConfirmationModal />
        <ProfileDialog />
        <ConfirmationModal />
        <ProfileDialog />
        {showTagModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#171717] rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-white/10">
              <h3 className="text-xl font-bold mb-4 dark:text-white">Create New Tag</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Tag Name</label>
                  <input 
                    type="text" 
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g., Work, Personal, Ideas"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10a37f] dark:text-white"
                    onKeyPress={(e) => e.key === 'Enter' && createTag()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Color</label>
                  <input 
                    type="color" 
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-full h-12 rounded-xl cursor-pointer"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={createTag}
                    className="flex-1 py-3 bg-[#10a37f] text-white font-semibold rounded-xl hover:bg-[#1a7f64] transition-colors"
                  >
                    Create Tag
                  </button>
                  <button 
                    onClick={() => setShowTagModal(false)}
                    className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="h-[100dvh] flex bg-white dark:bg-[#0d0d0d] overflow-hidden">
          {sidebarJSX}
          <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
            <header className="h-14 lg:h-16 border-b border-slate-200 dark:border-white/10 px-4 lg:px-6 flex items-center justify-between bg-white/80 dark:bg-[#0d0d0d]/80 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <button 
                  onClick={async () => {
                    // Check if there are any changes
                    const hasChanges = memoryText.trim() || 
                                      memoryTitle?.trim() || 
                                      memoryTopic?.trim() || 
                                      memoryMood !== null || 
                                      memoryPeople?.trim() || 
                                      selectedTags.length > 0
                    
                    if (hasChanges) {
                      const confirmed = await showConfirmation({
                        title: 'Discard Text Memory',
                        message: 'Discard this text memory? All changes will be lost.',
                        confirmText: 'Discard',
                        cancelText: 'Cancel',
                        type: 'warning'
                      })
                      if (!confirmed) return
                    }
                    
                    setMemoryTitle(null)
                    setHasEditedTitle(false)
                    setMemoryText('')
                    setMemoryTopic('')
                    setMemoryMood(null)
                    setMemoryPeople('')
                    setSelectedTags([])
                    setCurrentScreen(SCREENS.MAIN)
                  }} 
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-lg font-bold text-slate-800 dark:text-white">Create Text Memory</h1>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 lg:px-8 py-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {errorMessage && (
                  <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-red-500 text-sm font-medium">{errorMessage}</p>
                  </div>
                )}

                {/* Diary-style Date Display */}
                <div className="text-center py-4 mb-2">
                  <div className="inline-block">
                    <div className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white mb-1">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                    </div>
                    <div className="text-sm lg:text-base text-slate-500 dark:text-slate-400">
                      {new Date().toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Title</label>
                  <input 
                    type="text" 
                    value={memoryTitle || ''} 
                    onChange={(e) => {
                      setMemoryTitle(e.target.value)
                      setHasEditedTitle(true)
                    }} 
                    placeholder="Enter a title for your memory..."
                    className="w-full bg-transparent text-lg font-semibold focus:outline-none dark:text-white" 
                  />
                </div>

                {/* Text Content */}
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Content *</label>
                  <textarea 
                    value={memoryText} 
                    onChange={(e) => setMemoryText(e.target.value)} 
                    placeholder="Write your memory here..."
                    className="w-full bg-transparent text-sm focus:outline-none dark:text-white min-h-[300px] resize-none" 
                  />
                  <p className="text-xs text-slate-400 mt-2">This is the main content of your text memory</p>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Topic</label>
                    <input 
                      type="text" 
                      value={memoryTopic} 
                      onChange={(e) => setMemoryTopic(e.target.value)} 
                      placeholder="e.g., Work, Personal, Ideas"
                      className="w-full bg-transparent text-sm focus:outline-none dark:text-white" 
                    />
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Mood</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((mood) => (
                        <button
                          key={mood}
                          type="button"
                          onClick={() => setMemoryMood(memoryMood === mood ? null : mood)}
                          className={`flex-1 py-2 rounded-lg text-lg transition-all ${
                            memoryMood === mood 
                              ? 'bg-[#10a37f] shadow-md scale-110' 
                              : 'bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'
                          }`}
                        >
                          {['😢', '😕', '😐', '🙂', '😄'][mood - 1]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">People</label>
                  <input 
                    type="text" 
                    value={memoryPeople} 
                    onChange={(e) => setMemoryPeople(e.target.value)} 
                    placeholder="John, Sarah, ..."
                    className="w-full bg-transparent text-sm focus:outline-none dark:text-white" 
                  />
                </div>

                {/* Tags */}
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Tags</label>
                    <button
                      onClick={() => setShowTagModal(true)}
                      className="text-xs text-[#10a37f] hover:text-[#1a7f64] font-semibold flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Tag
                    </button>
                  </div>
                  {tags.length === 0 ? (
                    <p className="text-xs text-slate-400">No tags available. Create one to get started!</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            selectedTags.find(t => t.id === tag.id)
                              ? 'bg-[#10a37f] text-white shadow-md'
                              : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:border-[#10a37f]'
                          }`}
                          style={selectedTags.find(t => t.id === tag.id) ? {} : { borderColor: tag.color + '40' }}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={createTextMemory}
                    disabled={!memoryText.trim()}
                    className="flex-1 py-3 bg-[#10a37f] text-white font-semibold rounded-xl hover:bg-[#1a7f64] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Create Memory
                  </button>
                  <button 
                    onClick={async () => {
                      // Check if there are any changes
                      const hasChanges = memoryText.trim() || 
                                        memoryTitle?.trim() || 
                                        memoryTopic?.trim() || 
                                        memoryMood !== null || 
                                        memoryPeople?.trim() || 
                                        selectedTags.length > 0
                      
                      if (hasChanges) {
                        const confirmed = await showConfirmation({
                          title: 'Discard Text Memory',
                          message: 'Discard this text memory? All changes will be lost.',
                          confirmText: 'Discard',
                          cancelText: 'Cancel',
                          type: 'warning'
                        })
                        if (!confirmed) return
                      }
                      
                      setMemoryTitle(null)
                      setHasEditedTitle(false)
                      setMemoryText('')
                      setMemoryTopic('')
                      setMemoryMood(null)
                      setMemoryPeople('')
                      setSelectedTags([])
                      setCurrentScreen(SCREENS.MAIN)
                    }}
                    className="px-6 py-3 text-slate-500 dark:text-white/40 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (currentScreen === SCREENS.MAIN) {
    return (
      <>
        <ToastContainer />
        <DateDetailsModal />
        <LoginModal />
        <SearchModal />
        <ConfirmationModal />
        <ProfileDialog />
        <ConfirmationModal />
        <ProfileDialog />
        <div className="h-[100dvh] flex bg-white dark:bg-[#0d0d0d] overflow-hidden">
          {sidebarJSX}
          <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
            {headerJSX}
            <div className="flex-1 overflow-y-auto px-4 lg:px-8 custom-scrollbar">
              <div className="max-w-3xl mx-auto py-8 lg:py-12 pb-24">
                {messages.length === 0 && !loadingConversation && (
                  <div className="text-center py-16 lg:py-24 px-4">
                    <div className="w-20 h-20 lg:w-24 lg:h-24 bg-[#10a37f]/10 rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto mb-8 text-3xl lg:text-4xl">🎙️</div>
                    {memoriesLoading || authLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-[#10a37f] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-[#10a37f] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-[#10a37f] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    ) : memories.length === 0 ? (
                      <>
                        <h3 className="text-2xl lg:text-3xl font-bold mb-4 dark:text-white">Hi, I'm here to help you reflect, one day at a time.</h3>
                        <p className="text-sm lg:text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">We'll start with a simple check-in, and over time I'll help summarize how you've been feeling.</p>
                        <p className="text-sm lg:text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-4 font-semibold mb-8">Ready to begin?</p>
                        <div className="flex flex-wrap items-center justify-center gap-3 max-w-2xl mx-auto">
                          <button
                            onClick={() => setInputQuery("How can I start reflecting today?")}
                            className="px-4 py-2.5 bg-white/5 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:bg-white/10 dark:hover:bg-white/10 transition-all text-sm font-medium"
                          >
                            How can I start reflecting today?
                          </button>
                          <button
                            onClick={() => setInputQuery("What should I focus on this week?")}
                            className="px-4 py-2.5 bg-white/5 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:bg-white/10 dark:hover:bg-white/10 transition-all text-sm font-medium"
                          >
                            What should I focus on this week?
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-2xl lg:text-3xl font-bold mb-4 dark:text-white">I'm here.</h3>
                        <p className="text-sm lg:text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed mb-8">Would you like to check in again, or look back at recent patterns?</p>
                        <div className="flex flex-wrap items-center justify-center gap-3 max-w-2xl mx-auto">
                          <button
                            onClick={() => setInputQuery("Summarize my recent memories")}
                            className="px-4 py-2.5 bg-white/5 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:bg-white/10 dark:hover:bg-white/10 transition-all text-sm font-medium"
                          >
                            Summarize my recent memories
                          </button>
                          <button
                            onClick={() => setInputQuery("What patterns do you notice in my reflections?")}
                            className="px-4 py-2.5 bg-white/5 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:bg-white/10 dark:hover:bg-white/10 transition-all text-sm font-medium"
                          >
                            What patterns do you notice?
                          </button>
                          <button
                            onClick={() => setInputQuery("How have I been feeling lately?")}
                            className="px-4 py-2.5 bg-white/5 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:bg-white/10 dark:hover:bg-white/10 transition-all text-sm font-medium"
                          >
                            How have I been feeling lately?
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {loadingConversation && messages.length === 0 && (
                  <div className="text-center py-16 lg:py-24 px-4">
                    <div className="w-20 h-20 lg:w-24 lg:h-24 bg-[#10a37f]/10 rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto mb-8 text-3xl lg:text-4xl">🎙️</div>
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-[#10a37f] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-[#10a37f] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-[#10a37f] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Loading conversation...</p>
                    </div>
                  </div>
                )}
                <div className="space-y-6">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 lg:gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && (<div className="w-8 h-8 rounded-lg bg-[#10a37f] text-white flex items-center justify-center flex-shrink-0 mt-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>)}
                      <div className={`max-w-[85%] lg:max-w-[75%] rounded-2xl ${msg.role === 'user' ? 'bg-[#10a37f] text-white px-4 py-2.5 rounded-br-sm' : 'text-slate-800 dark:text-white/90'}`}><p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p></div>
                      {msg.role === 'user' && (<div className="hidden lg:flex w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center flex-shrink-0 text-xs font-bold mt-1 dark:text-white border border-slate-200 dark:border-white/10 overflow-hidden">{user?.photoURL && !imageError.has('chat') ? (<img src={user.photoURL} alt={user.displayName} className="w-full h-full rounded-full object-cover" onError={() => setImageError(prev => new Set(prev).add('chat'))} />) : getUserInitials(user)}</div>)}
                    </div>
                  ))}
                  {isThinking && (<div className="flex gap-3 lg:gap-4"><div className="w-8 h-8 rounded-lg bg-[#10a37f] text-white flex items-center justify-center flex-shrink-0"><svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div><div className="flex items-center gap-1.5 py-3"><div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce [animation-delay:0.15s]"></div><div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce [animation-delay:0.3s]"></div></div></div>)}
                </div>
                <div ref={chatEndRef} />
              </div>
            </div>
            <div className="px-4 lg:px-8 pb-6 pb-safe-bottom pt-2 bg-gradient-to-t from-white dark:from-[#0d0d0d] via-white/95 dark:via-[#0d0d0d]/95 to-transparent">
              <div className="max-w-3xl mx-auto">
                <div className="relative">
                  {/* Create Memory Dropdown Button - Perfectly aligned */}
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 create-memory-dropdown">
                    <button
                      onClick={() => setShowCreateMemoryDropdown(!showCreateMemoryDropdown)}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 ${
                        showCreateMemoryDropdown
                          ? 'bg-[#10a37f]/10 dark:bg-[#10a37f]/20 text-[#10a37f] shadow-sm'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                      title="Create Memory"
                    >
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </button>
                    
                    {showCreateMemoryDropdown && (
                      <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden z-50 backdrop-blur-xl">
                        <div className="p-2">
                          <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                            Create Memory
                          </div>
                          <button
                            onClick={async () => {
                              if (await requireAuth('record')) {
                                setCurrentScreen(SCREENS.RECORD)
                                setShowCreateMemoryDropdown(false)
                              }
                            }}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-150 text-left group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-[#10a37f]/10 dark:bg-[#10a37f]/20 flex items-center justify-center group-hover:bg-[#10a37f]/20 dark:group-hover:bg-[#10a37f]/30 transition-colors">
                              <svg className="w-5 h-5 text-[#10a37f] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-900 dark:text-white">Record</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Record audio memory</div>
                            </div>
                          </button>
                          <button
                            onClick={async () => {
                              if (await requireAuth('upload')) {
                                fileInputRef.current.click()
                                setShowCreateMemoryDropdown(false)
                              }
                            }}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-150 text-left group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-[#10a37f]/10 dark:bg-[#10a37f]/20 flex items-center justify-center group-hover:bg-[#10a37f]/20 dark:group-hover:bg-[#10a37f]/30 transition-colors">
                              <svg className="w-5 h-5 text-[#10a37f] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-900 dark:text-white">Upload</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Upload audio or video</div>
                            </div>
                          </button>
                          <button
                            onClick={async () => {
                              if (await requireAuth('create text memory')) {
                                setCurrentScreen(SCREENS.CREATE_TEXT_MEMORY)
                                setShowCreateMemoryDropdown(false)
                              }
                            }}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-150 text-left group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 dark:group-hover:bg-blue-500/30 transition-colors">
                              <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-900 dark:text-white">Write Memory</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Create text memory</div>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Unique styled text input field */}
                  <div className="relative group">
                    <textarea 
                      value={inputQuery} 
                      onChange={(e) => setInputQuery(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), askQuestion())} 
                      placeholder="Type your message..." 
                      className="w-full pl-14 pr-14 py-4 bg-white dark:bg-[#1a1a1a] border-2 border-slate-200 dark:border-white/10 rounded-2xl shadow-sm focus:shadow-lg focus:border-[#10a37f] dark:focus:border-[#10a37f] transition-all duration-200 resize-none text-[15px] leading-relaxed placeholder-slate-400 dark:placeholder-slate-500 dark:text-white focus:outline-none focus:ring-0" 
                      rows="1" 
                      style={{
                        boxShadow: inputQuery.trim() 
                          ? '0 4px 6px -1px rgba(16, 163, 127, 0.1), 0 2px 4px -1px rgba(16, 163, 127, 0.06)' 
                          : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                      }}
                    />
                    
                    {/* Send button - redesigned */}
                    <button 
                      onClick={askQuestion} 
                      disabled={!inputQuery.trim() || isThinking} 
                      className={`absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 ${
                        inputQuery.trim() && !isThinking
                          ? 'bg-[#10a37f] text-white shadow-md shadow-[#10a37f]/30 hover:bg-[#0d8a6a] hover:shadow-lg hover:shadow-[#10a37f]/40 active:scale-95'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* <p className="hidden lg:block text-center text-xs text-slate-400 mt-3">Responses are grounded in your audio transcripts</p> */}
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (currentScreen === SCREENS.RECORD) {
    return (
      <>
        <ToastContainer />
        <DateDetailsModal />
        <LoginModal />
        <SearchModal />
        <ConfirmationModal />
        <ProfileDialog />
        <ConfirmationModal />
        <ProfileDialog />
        <div className="h-[100dvh] flex bg-[#0d0d0d] text-white overflow-hidden">
          <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
            <button onClick={cancelRecording} className="absolute top-8 left-8 p-3 hover:bg-white/10 rounded-2xl transition-all active:scale-90"><svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            <div className="text-center mb-16"><span className="text-[10px] font-bold text-[#10a37f] uppercase tracking-[0.3em] mb-4 block">Capturing Voice</span><h2 className="text-2xl font-bold tracking-tight">Audio Intake Studio</h2></div>
            {errorMessage && (<div className="mb-8 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl max-w-md text-center"><p className="text-red-400 text-sm font-medium">{errorMessage}</p><button onClick={() => setErrorMessage('')} className="mt-2 text-xs text-red-400/70 hover:text-red-400 underline">Dismiss</button></div>)}
            <div className="flex items-center gap-2 mb-12 h-20">{[...Array(32)].map((_, i) => (<div key={i} className={`wave-bar ${isRecording ? '' : 'opacity-20 animate-none !h-1'}`}></div>))}</div>
            <div className="text-8xl font-light mb-16 tabular-nums tracking-tighter text-white animate-pulse">{formatTime(recordingTime)}</div>
            <div className="flex flex-col items-center gap-8"><button onClick={isRecording ? stopRecording : startRecording} className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center transition-all shadow-2xl active:scale-95 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-[#10a37f] hover:bg-[#1a7f64] shadow-[#10a37f]/20'}`}>{isRecording ? (<div className="w-8 h-8 bg-white rounded-lg"></div>) : (<svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>)}</button><p className="text-slate-400 text-sm font-bold tracking-widest uppercase">{isRecording ? 'Recording Live...' : 'Tap to Start'}</p></div>
          </main>
        </div>
      </>
    )
  }

  if (currentScreen === SCREENS.UPLOAD) {
    return (
      <>
        <ToastContainer />
        <DateDetailsModal />
        <LoginModal />
        <SearchModal />
        <ConfirmationModal />
        <ProfileDialog />
        <ConfirmationModal />
        <ProfileDialog />
        <div className="h-[100dvh] flex bg-white dark:bg-[#0d0d0d] overflow-hidden">
          {sidebarJSX}
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 lg:h-16 flex items-center px-4 lg:px-6 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0d0d0d]/80 backdrop-blur-xl"><button onClick={() => setCurrentScreen(SCREENS.MAIN)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button><span className="ml-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Upload Media</span></header>
            <div className="flex-1 flex items-center justify-center p-6"><div className="w-full max-w-sm bg-white dark:bg-[#171717] p-8 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl text-center"><div className="w-16 h-16 bg-[#10a37f]/10 text-[#10a37f] rounded-2xl flex items-center justify-center mx-auto mb-6"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg></div><h3 className="text-lg font-bold mb-1 dark:text-white truncate">{selectedFile?.name}</h3><p className="text-sm text-slate-500 mb-8">{(selectedFile?.size / 1024 / 1024).toFixed(2)} MB</p><div className="space-y-2"><button onClick={uploadAndProcess} className="w-full py-3 bg-[#10a37f] text-white font-semibold rounded-xl transition-all active:scale-[0.98]">Process Media</button><button onClick={() => setCurrentScreen(SCREENS.MAIN)} className="w-full py-3 text-slate-500 font-medium text-sm hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Cancel</button></div></div></div>
          </div>
        </div>
      </>
    )
  }

  if (currentScreen === SCREENS.PROCESSING) {
    return (
      <>
        <ToastContainer />
        <DateDetailsModal />
        <LoginModal />
        <SearchModal />
        <ConfirmationModal />
        <ProfileDialog />
        <ConfirmationModal />
        <ProfileDialog />
        <div className="h-[100dvh] flex bg-white dark:bg-[#0d0d0d] items-center justify-center p-6 overflow-hidden">
          <div className="text-center max-w-xs animate-fade-in">
            <div className="relative w-24 h-24 mx-auto mb-10">
              <div className="absolute inset-0 border-4 border-[#10a37f]/10 rounded-[2rem]"></div>
              <div className="absolute inset-0 border-t-4 border-[#10a37f] rounded-[2rem] animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-8 h-8 text-[#10a37f] animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-3 tracking-tight dark:text-white">Expanding Intelligence</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em] mb-4">
              {processStatus === PROCESS_STATUS.UPLOADING && 'Uploading to cloud...'}
              {processStatus === PROCESS_STATUS.TRANSCRIBING && 'Analyzing voice patterns...'}
              {processStatus === PROCESS_STATUS.INDEXING && 'Grounding global memory...'}
              {processStatus === PROCESS_STATUS.READY && 'Ready!'}
            </p>
            {/* Show actual upload progress when uploading */}
            {processStatus === PROCESS_STATUS.UPLOADING && uploadProgress > 0 && selectedFile && (
              <div className="mb-4 space-y-1">
                <p className="text-xs text-[#10a37f] font-semibold">
                  {uploadProgress.toFixed(1)}% uploaded
                </p>
                <p className="text-[10px] text-slate-400">
                  {((selectedFile.size * uploadProgress / 100) / 1024 / 1024).toFixed(2)} MB of {((selectedFile.size) / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
            <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#10a37f] transition-all duration-300" 
                style={{ 
                  width: processStatus === PROCESS_STATUS.UPLOADING 
                    ? `${Math.max(uploadProgress, 5)}%` // Show at least 5% during upload
                    : processStatus === PROCESS_STATUS.TRANSCRIBING 
                    ? '60%' 
                    : processStatus === PROCESS_STATUS.INDEXING
                    ? '90%'
                    : '100%'
                }}
              ></div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (currentScreen === SCREENS.LOGIN || authLoading) {
    return (
      <div className="h-[100dvh] flex bg-white dark:bg-[#0d0d0d] items-center justify-center p-6 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#10a37f]/5 via-transparent to-transparent pointer-events-none" />
        <div className="text-center max-w-md w-full z-10 animate-fade-in">
          {authLoading ? (
            <div className="space-y-6"><div className="relative w-20 h-20 mx-auto"><div className="absolute inset-0 border-4 border-[#10a37f]/10 rounded-[2rem]"></div><div className="absolute inset-0 border-t-4 border-[#10a37f] rounded-[2rem] animate-spin"></div><div className="absolute inset-0 flex items-center justify-center"><svg className="w-8 h-8 text-[#10a37f]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3C7.5 3 4 6.5 4 10.5C4 14.5 7.5 18 12 18C12 18 12 21 12 21C12 21 17 17 17 17C19.5 15.5 21 13 21 10.5C21 6.5 17.5 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8.5" cy="10.5" r="1.5" fill="currentColor"/><circle cx="12" cy="10.5" r="1.5" fill="currentColor"/><circle cx="15.5" cy="10.5" r="1.5" fill="currentColor"/></svg></div></div><p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p></div>
          ) : (
            <>
              <div className="w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-[#10a37f] to-[#0d8a6a] rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto mb-8 text-white shadow-lg shadow-[#10a37f]/30"><svg className="w-10 h-10 lg:w-12 lg:h-12" viewBox="0 0 24 24" fill="none"><path d="M12 3C7.5 3 4 6.5 4 10.5C4 14.5 7.5 18 12 18C12 18 12 21 12 21C12 21 17 17 17 17C19.5 15.5 21 13 21 10.5C21 6.5 17.5 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8.5" cy="10.5" r="1.5" fill="currentColor"/><circle cx="12" cy="10.5" r="1.5" fill="currentColor"/><circle cx="15.5" cy="10.5" r="1.5" fill="currentColor"/></svg></div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-3 tracking-tight dark:text-white">Welcome to Zentra Journal</h1>
              <p className="text-base text-slate-500 dark:text-slate-400 mb-10 max-w-sm mx-auto">Sign in to access your audio recordings and AI-powered insights</p>
              {errorMessage && (<div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center"><p className="text-red-500 text-sm font-medium">{errorMessage}</p></div>)}
              <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-[#171717] border-2 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl hover:border-[#10a37f] hover:bg-[#10a37f]/5 dark:hover:bg-[#10a37f]/10 transition-all font-semibold shadow-lg active:scale-[0.98]"><svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg><span>Continue with Google</span></button>
              <p className="mt-8 text-xs text-slate-400 dark:text-slate-500">By signing in, you agree to our Terms of Service and Privacy Policy</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return null
}

// Main App component with routing
function App() {
  return (
    <Routes>
      <Route path="/conversation/:conversationId" element={<AppContent />} />
      <Route path="*" element={<AppContent />} />
    </Routes>
  )
}

export default App
