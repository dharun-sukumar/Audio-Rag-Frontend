import { useState, useRef, useEffect, useCallback } from 'react'
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
  VIEW_RECORDING: 'view_recording', // New screen for viewing recording + transcription
}

const PROCESS_STATUS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  TRANSCRIBING: 'transcribing',
  INDEXING: 'indexing',
  READY: 'ready',
  FAILED: 'failed'
}

function App() {
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
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [savedRecordingDuration, setSavedRecordingDuration] = useState(0)
  const [activeTab, setActiveTab] = useState('chat') 
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [library, setLibrary] = useState([])
  const [recordingName, setRecordingName] = useState('')
  
  // Authentication state
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [imageError, setImageError] = useState(new Set())
  const [authToken, setAuthToken] = useState(null)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [showFullToken, setShowFullToken] = useState(false)
  
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
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)
  const fileInputRef = useRef(null)
  const chatEndRef = useRef(null)
  const audioPlayerRef = useRef(null)
  const recordingAudioRef = useRef(null)
  const activeUtteranceRef = useRef(null)

  // Audio playback state
  const [audioUrl, setAudioUrl] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0)
  const [activeUtteranceIndex, setActiveUtteranceIndex] = useState(null)

  // Copy URL to clipboard
  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

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
      setAuthLoading(false)
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
      fetchDocuments()
      fetchConversations()
    } else {
      setLibrary([])
      setConversations([])
    }
  }, [user])

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

  // Copy token to clipboard
  const copyToken = async () => {
    if (!authToken) return
    try {
      await navigator.clipboard.writeText(authToken)
      setTokenCopied(true)
      setTimeout(() => setTokenCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy token:', err)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
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
    try {
      await signOut(auth)
      setMessages([])
      setCurrentConversationId(null)
    } catch (error) {
      console.error('Sign out error:', error)
      setErrorMessage('Failed to sign out.')
    }
  }

  // Create a new conversation
  const createNewConversation = async () => {
    if (!requireAuth('create conversation')) return false
    
    try {
      console.log('Creating new conversation...')
      const conversation = await api.createConversation('New Chat')
      console.log('Conversation created:', conversation)
      setCurrentConversationId(conversation.id)
      setMessages([])
      setErrorMessage('')
      // Refresh conversations list
      fetchConversations()
      return true
    } catch (err) {
      console.error('Failed to create conversation:', err)
      setErrorMessage(`Failed to create conversation: ${err.message}`)
      return false
    }
  }

  // Load a conversation
  const loadConversation = async (conversation) => {
    if (!requireAuth('load conversation')) return
    
    try {
      console.log('Loading conversation:', conversation.id)
      setCurrentConversationId(conversation.id)
      setErrorMessage('')
      
      // Navigate to main chat screen
      setCurrentScreen(SCREENS.MAIN)
      
      // Fetch messages for this conversation
      const messages = await api.getConversationMessages(conversation.id, 0, 100)
      console.log('Messages fetched:', messages)
      
      // Messages are already in the correct format from the API
      setMessages(messages || [])
      
      if (window.innerWidth < 1024) setSidebarOpen(false)
    } catch (err) {
      console.error('Failed to load conversation:', err)
      setErrorMessage(`Failed to load conversation: ${err.message}`)
      // Clear messages on error
      setMessages([])
    }
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
      console.log('Conversation title updated successfully')
    } catch (err) {
      console.error('Failed to update conversation title:', err)
      setErrorMessage(`Failed to rename conversation: ${err.message}`)
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
    
    if (!confirm('Are you sure you want to delete this conversation? All messages will be lost.')) {
      return
    }
    
    try {
      console.log('Deleting conversation:', conversationId)
      await api.deleteConversation(conversationId)
      
      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.id !== conversationId))
      
      // If we're deleting the current conversation, clear it
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null)
        setMessages([])
      }
      
      console.log('Conversation deleted successfully')
    } catch (err) {
      console.error('Failed to delete conversation:', err)
      setErrorMessage(`Failed to delete conversation: ${err.message}`)
    }
  }

  // Check if user needs to login for protected actions
  const requireAuth = (action) => {
    if (!user) {
      setShowLoginModal(true)
      return false
    }
    return true
  }

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
  const togglePlayback = () => {
    const audio = audioPlayerRef.current
    if (!audio) return
    
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
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
    
    console.log('⏰ Current time (ms):', currentTime)
    console.log('⏰ Has transcription:', !!recordingTranscription)
    
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
    const audio = recordingAudioRef.current
    if (!audio) return
    
    audio.currentTime = timeMs / 1000 // Convert from milliseconds to seconds
    if (!isPlaying) {
      audio.play()
      setIsPlaying(true)
    }
  }

  // View a recording with its transcription (with progressive loading)
  const viewRecording = async (doc) => {
    if (!requireAuth('view')) return
    
    try {
      console.log('📂 Full document object:', JSON.stringify(doc, null, 2))
      console.log('📂 Available fields:', Object.keys(doc))
      
      // Try to find the correct UUID field
      const documentId = doc.document_id || doc.id || doc.uuid || doc._id
      console.log('📂 Using document_id:', documentId)
      
      if (!documentId) {
        throw new Error('No valid document ID found. Available fields: ' + Object.keys(doc).join(', '))
      }
      
      // IMMEDIATELY navigate to view screen with basic info
      setSelectedRecording({
        ...doc,
        document_id: documentId,
        audioUrl: null,  // Will load progressively
        transcription: null  // Will load progressively
      })
      setRecordingTranscription(null)
      setLoadingRecording(true)
      setErrorMessage('')
      setCurrentScreen(SCREENS.VIEW_RECORDING)
      console.log('✅ Navigated to VIEW_RECORDING - loading data...')
      
      // Close sidebar on mobile for immediate feedback
      if (window.innerWidth < 1024) setSidebarOpen(false)
      
      // NOW fetch data in the background
      const data = await api.getAudioWithTranscription(documentId)
      console.log('📥 API Response received:', data)
      console.log('📥 Response type:', typeof data)
      console.log('📥 Response keys:', Object.keys(data || {}))
      
      // Handle different response structures
      let audioUrl = null
      let transcription = null
      
      // Extract audio URL - it's returned as an object with {url, key, expires_in}
      if (data.audio && typeof data.audio === 'object' && data.audio.url) {
        audioUrl = data.audio.url
      } else if (typeof data.audio === 'string') {
        audioUrl = data.audio
      } else if (data.audio_url) {
        audioUrl = data.audio_url
      } else if (data.url) {
        audioUrl = data.url
      } else if (data.audioUrl) {
        audioUrl = data.audioUrl
      } else if (data.file_url) {
        audioUrl = data.file_url
      }
      
      // Extract transcription - it's returned as an object with various fields
      if (data.transcription) {
        if (typeof data.transcription === 'object') {
          transcription = data.transcription.text || 
                         data.transcription.content || 
                         data.transcription.utterances ||
                         data.transcription.words ||
                         data.transcription
        } else {
          transcription = data.transcription
        }
      } else if (data.transcript) {
        transcription = data.transcript
      } else if (data.text) {
        transcription = data.text
      } else if (data.transcription_text) {
        transcription = data.transcription_text
      }
      
      console.log('🎵 Audio URL (extracted):', audioUrl)
      console.log('📝 Transcription (extracted):', transcription)
      console.log('📝 Transcription type:', typeof transcription)
      console.log('📝 Transcription keys:', transcription && typeof transcription === 'object' ? Object.keys(transcription) : 'N/A')
      
      // Check for utterances structure
      if (transcription && typeof transcription === 'object') {
        if (transcription.utterances) {
          console.log('📝 Utterances found:', transcription.utterances.length)
          console.log('📝 First utterance:', transcription.utterances[0])
        }
        if (transcription.words) {
          console.log('📝 Words found:', transcription.words.length)
          console.log('📝 First few words:', transcription.words.slice(0, 5))
        }
      }
      
      // Update with loaded data
      setSelectedRecording(prev => ({
        ...prev,
        audioUrl: audioUrl,
        transcription: transcription
      }))
      setRecordingTranscription(transcription)
      setLoadingRecording(false)
      
      console.log('✅ Data loaded successfully')
    } catch (err) {
      console.error('❌ Error fetching recording:', err)
      console.error('Error details:', {
        message: err.message,
        stack: err.stack
      })
      setErrorMessage(`Failed to load recording: ${err.message}`)
      setLoadingRecording(false)
      // Don't navigate away on error - show error on the screen
    }
  }


  // --- ACTIONS ---

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file && (file.type.startsWith('audio/') || file.type.startsWith('video/'))) {
      if (!requireAuth('upload')) {
        e.target.value = '' 
        return
      }
      setSelectedFile(file)
      setRecordingName(`${file.name.replace(/\.[^/.]+$/, '')}`)
      
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
    } else if (file) {
      setErrorMessage('Please select an audio or video file.')
    }
  }

  const startRecording = async () => {
    setErrorMessage('')
    if (!requireAuth('record')) return
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
    if (!requireAuth('upload')) {
      console.error('User not authenticated, cannot upload')
      return
    }
    
    if (!selectedFile) {
      console.error('No file selected')
      setErrorMessage('No file selected. Please record or upload an audio/video file first.')
      return
    }
    
    console.log('Starting upload and process:', {
      filename: selectedFile.name,
      type: selectedFile.type,
      size: selectedFile.size
    })
    
    setProcessStatus(PROCESS_STATUS.UPLOADING)
    setCurrentScreen(SCREENS.PROCESSING)
    setErrorMessage('')
    
    try {
      console.log('Step 1: Generating upload URL...')
      const { upload_url, object_key } = await api.generateUploadUrl(selectedFile.name, selectedFile.type)
      console.log('Upload URL generated:', { upload_url, object_key })
      
      console.log('Step 2: Uploading to S3...')
      const uploadRes = await fetch(upload_url, { 
        method: 'PUT', 
        body: selectedFile, 
        headers: { 'Content-Type': selectedFile.type } 
      })
      if (!uploadRes.ok) {
        console.error('S3 upload failed:', uploadRes.status, uploadRes.statusText)
        throw new Error(`S3 upload failed: ${uploadRes.status} ${uploadRes.statusText}`)
      }
      console.log('S3 upload successful')
      
      setProcessStatus(PROCESS_STATUS.TRANSCRIBING)
      console.log('Step 3: Processing audio...')
      await api.processAudio(object_key)
      console.log('Audio processing complete')
      
      setProcessStatus(PROCESS_STATUS.INDEXING)
      await new Promise(r => setTimeout(r, 1000))
      setProcessStatus(PROCESS_STATUS.READY)
      
      console.log('Step 4: Fetching documents...')
      fetchDocuments()
      setTimeout(() => setCurrentScreen(SCREENS.MAIN), 800)
    } catch (err) {
      console.error('Upload and process error:', err)
      setProcessStatus(PROCESS_STATUS.FAILED)
      setErrorMessage(err.message || 'Failed to process audio.')
    }
  }

  const askQuestion = async () => {
    if (!inputQuery.trim()) return
    if (!requireAuth('ask')) return
    
    // Create a conversation if one doesn't exist
    if (!currentConversationId) {
      console.log('No conversation exists, creating one...')
      const created = await createNewConversation()
      if (!created) {
        console.error('Failed to create conversation, aborting question')
        return
      }
    }
    
    const userMsg = { role: 'user', content: inputQuery }
    setMessages(prev => [...prev, userMsg])
    const currentQuery = inputQuery
    setInputQuery('')
    setIsThinking(true)
    setErrorMessage('')
    
    try {
      // Save user message to conversation
      console.log('Saving user message to conversation:', currentConversationId)
      await api.addMessageToConversation(currentConversationId, 'user', currentQuery)
      
      // Get AI response
      const data = await api.askQuestion(currentQuery)
      const answer = data.answer || data
      
      // Save assistant response to conversation
      console.log('Saving assistant response to conversation:', currentConversationId)
      await api.addMessageToConversation(currentConversationId, 'assistant', answer)
      
      setMessages(prev => [...prev, { role: 'assistant', content: answer, sources: [] }])
      
      // Refresh conversations list to update message count
      fetchConversations()
    } catch (err) {
      console.error('Error in askQuestion:', err)
      setErrorMessage('Error getting response.')
    } finally {
      setIsThinking(false)
    }
  }

  const fetchDocuments = async () => {
    if (!user) {
      console.log('fetchDocuments: No user, skipping')
      return
    }
    
    try {
      const token = await getIdToken(user, false)
      if (!token) {
        console.warn('fetchDocuments: No token available, waiting...')
        setTimeout(() => fetchDocuments(), 1000)
        return
      }
      
      console.log('fetchDocuments: Token available, fetching documents...')
      // Try the new API first, fallback to old API
      try {
        const data = await api.listAudioFiles(1, 50)
        setLibrary(data.items || data || [])
      } catch (err) {
        console.log('New API failed, trying legacy API:', err)
        const docs = await api.listDocuments()
        setLibrary(docs || [])
      }
    } catch (err) {
      console.error('Error fetching documents:', err)
      console.error('Error details:', {
        message: err.message,
        stack: err.stack
      })
    }
  }

  const fetchConversations = async () => {
    if (!user) {
      console.log('fetchConversations: No user, skipping')
      return
    }
    
    try {
      const token = await getIdToken(user, false)
      if (!token) {
        console.warn('fetchConversations: No token available, waiting...')
        setTimeout(() => fetchConversations(), 1000)
        return
      }
      
      console.log('fetchConversations: Token available, fetching conversations...')
      const data = await api.listConversations(0, 100)
      console.log('Conversations fetched:', data)
      setConversations(data || [])
    } catch (err) {
      console.error('Error fetching conversations:', err)
      console.error('Error details:', {
        message: err.message,
        stack: err.stack
      })
    }
  }

  const handleDeleteDocument = async (docIdOrDoc, e) => {
    if (e) {
      e.stopPropagation()
    }
    if (!confirm('Are you sure you want to delete this recording?')) return
    try {
      // Handle both doc object and direct ID
      let docId
      if (typeof docIdOrDoc === 'string') {
        docId = docIdOrDoc
      } else {
        docId = docIdOrDoc.document_id || docIdOrDoc.id || docIdOrDoc.uuid
      }
      
      console.log('🗑️ Deleting document with ID:', docId)
      
      // Try new API first, fallback to old
      try {
        await api.deleteAudio(docId)
      } catch (err) {
        console.log('New delete API failed, trying legacy:', err)
        await api.deleteDocument(docId)
      }
      
      // Filter by both possible ID fields
      setLibrary(prev => prev.filter(doc => 
        doc.id !== docId && doc.document_id !== docId
      ))
      
      if (selectedRecording?.document_id === docId || selectedRecording?.id === docId) {
        setCurrentScreen(SCREENS.MAIN)
        setSelectedRecording(null)
      }
    } catch (err) {
      alert(`Failed: ${err.message}`)
    }
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
        fixed lg:sticky top-0 left-0 h-screen
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
              <span className="font-bold text-lg tracking-tight dark:text-white">VoiceMemory</span>
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
            <button onClick={() => { if (requireAuth('record')) { setCurrentScreen(SCREENS.RECORD); if(window.innerWidth < 1024) setSidebarOpen(false); } }} className={`w-full flex items-center gap-3 px-3 py-3 bg-[#10a37f] text-white rounded-xl hover:bg-[#1a7f64] transition-all text-sm font-semibold shadow-md active:scale-[0.98] ${!sidebarOpen && 'lg:justify-center lg:px-0'}`} title="Record Audio"><svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg><span className={`${!sidebarOpen && 'lg:hidden'}`}>Record</span></button>
            <button onClick={() => { if (requireAuth('upload')) { fileInputRef.current.click(); if(window.innerWidth < 1024) setSidebarOpen(false); } }} className={`w-full flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all text-sm font-semibold active:scale-[0.98] ${!sidebarOpen && 'lg:justify-center lg:px-0'}`} title="Upload File"><svg className="w-5 h-5 text-[#10a37f] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg><span className={`${!sidebarOpen && 'lg:hidden'}`}>Upload</span></button>
            <input ref={fileInputRef} type="file" accept="audio/*,video/*" onChange={handleFileSelect} className="hidden" />
          </div>
          
          <div className={`flex-1 overflow-y-auto custom-scrollbar ${!sidebarOpen && 'lg:hidden'} py-4`}>
            <div className="px-2 mb-6">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 mb-2">Conversations</p>
              <div className="space-y-1">
                {conversations.length > 0 ? (
                  conversations.map((conv) => (
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
                  ))
                ) : (
                  <div className="p-4 text-center"><p className="text-xs text-slate-500 dark:text-slate-400">No conversations yet</p></div>
                )}
              </div>
            </div>
            <div className="px-2 mb-4">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 mb-2">Global Memory</p>
              <div className="space-y-1">
                {library.length > 0 ? (
                  library.map((doc) => (
                    <div 
                      key={doc.document_id || doc.id || doc.uuid} 
                      onClick={() => {
                        viewRecording(doc)
                        if (window.innerWidth < 1024) setSidebarOpen(false)
                      }}
                      className="group flex items-center justify-between p-2 rounded-xl hover:bg-white dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-[#10a37f]/10 text-[#10a37f] rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold dark:text-white truncate">{doc.filename || 'Untitled Recording'}</p>
                          <p className="text-[10px] text-slate-500">{new Date(doc.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <button onClick={(e) => handleDeleteDocument(doc, e)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-lg transition-all" title="Delete recording"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center"><p className="text-xs text-slate-500 dark:text-slate-400">No recordings yet</p></div>
                )}
              </div>
            </div>
          </div>

          <div className={`mt-auto pt-4 border-t border-slate-200 dark:border-white/10 ${!sidebarOpen && 'lg:border-0'}`}>
            {user ? (
              <div className="space-y-2">
                <div className={`flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors ${!sidebarOpen && 'lg:justify-center'}`}>
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
                  <>
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowFullToken(!showFullToken)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                          <span>Auth Token</span>
                        </div>
                        <svg className={`w-4 h-4 transition-transform ${showFullToken ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {showFullToken && authToken && (
                        <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 space-y-2">
                          <div>
                            <p className="text-[10px] font-semibold text-[#10a37f] mb-1">Firebase ID Token</p>
                            <div className="flex items-start justify-between gap-2">
                              <code className="flex-1 text-[10px] font-mono text-slate-600 dark:text-slate-300 break-all leading-relaxed">
                                {authToken}
                              </code>
                              <button
                                onClick={copyToken}
                                className="flex-shrink-0 p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                                title="Copy token"
                              >
                                {tokenCopied ? (
                                  <svg className="w-4 h-4 text-[#10a37f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
                            Using Firebase ID token for all API calls
                          </p>
                        </div>
                      )}
                    </div>
                    <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg><span>Sign Out</span></button>
                  </>
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
        <div className="lg:hidden flex items-center gap-2"><div className="w-2 h-2 bg-[#10a37f] rounded-full animate-pulse"></div><span className="font-bold text-base dark:text-white">VoiceMemory</span></div>
      </div>
      <div className="flex items-center gap-2 lg:gap-3">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#10a37f]/10 rounded-full"><div className="w-2 h-2 bg-[#10a37f] rounded-full animate-pulse"></div><span className="text-xs font-semibold text-[#10a37f]">Memory Active</span></div>
        <button onClick={() => { if (requireAuth('record')) { setCurrentScreen(SCREENS.RECORD); } }} className="lg:hidden p-2 bg-[#10a37f] text-white rounded-lg active:scale-95 transition-transform"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg></button>
        <button onClick={copyUrl} className={`p-2 rounded-lg transition-all ${copied ? 'bg-[#10a37f]/10 text-[#10a37f]' : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400'}`} title="Copy link">{copied ? (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>) : (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>)}</button>
      </div>
    </header>
  )

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

  // NEW: View Recording Screen
  if (currentScreen === SCREENS.VIEW_RECORDING && selectedRecording) {
    return (
      <>
        <LoginModal />
        <div className="h-screen flex bg-white dark:bg-[#0d0d0d] overflow-hidden">
          {sidebarJSX}
          <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
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
        <LoginModal />
        <div className="h-screen flex bg-white dark:bg-[#0d0d0d] items-end md:items-center justify-center relative overflow-hidden">
          {audioUrl && (<audio ref={audioPlayerRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />)}
          <div className="absolute inset-0 bg-[#10a37f]/5 pointer-events-none" />
          <div className="w-full max-w-lg bg-white dark:bg-[#171717] rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 md:p-10 shadow-2xl border-t md:border border-slate-200 dark:border-white/10 animate-fade-in z-10">
            <div className="text-center mb-8"><div className="w-16 h-1 bg-slate-200 dark:bg-white/10 rounded-full mx-auto mb-8 md:hidden" /><h2 className="text-2xl font-bold tracking-tight">Review Recording</h2><p className="text-sm text-slate-500">Ready to index this into your global memory?</p></div>
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10"><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Session Name</label><input type="text" value={recordingName} onChange={(e) => setRecordingName(e.target.value)} className="w-full bg-transparent text-lg font-bold focus:outline-none dark:text-white px-1" placeholder="Give it a name..." /></div>
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl">
                <div className="flex items-center gap-3"><div className="w-10 h-10 bg-[#10a37f]/10 text-[#10a37f] rounded-xl flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><div><p className="text-xs font-bold dark:text-white uppercase tracking-tighter">Audio Clip</p><p className="text-[10px] text-slate-500 font-bold uppercase">{formatTime(savedRecordingDuration)} Duration</p></div></div>
                <button onClick={togglePlayback} className="p-3 text-white bg-[#10a37f] hover:bg-[#1a7f64] rounded-xl transition-colors active:scale-95">{isPlaying ? (<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>) : (<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>)}</button>
              </div>
              <div className="grid grid-cols-1 gap-3 pt-4"><button onClick={uploadAndProcess} className="w-full py-4 bg-[#10a37f] text-white font-bold rounded-2xl shadow-lg shadow-[#10a37f]/20 hover:bg-[#1a7f64] transition-all active:scale-[0.98]">Transcribe & Index</button><button onClick={() => { setSelectedFile(null); setSavedRecordingDuration(0); setIsPlaying(false); setCurrentScreen(SCREENS.MAIN); }} className="w-full py-4 text-slate-500 dark:text-white/40 font-bold text-sm hover:text-red-500 transition-colors">Discard Recording</button></div>
            </div>
          </div>
        </div>
      </>
    )
  }
  
  if (currentScreen === SCREENS.MAIN) {
    return (
      <>
        <LoginModal />
        <div className="h-screen flex bg-white dark:bg-[#0d0d0d] overflow-hidden">
          {sidebarJSX}
          <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
            {headerJSX}
            <div className="flex-1 overflow-y-auto px-4 lg:px-8 custom-scrollbar">
              <div className="max-w-3xl mx-auto py-8 lg:py-12 pb-32 lg:pb-24">
                {messages.length === 0 && (
                  <div className="text-center py-16 lg:py-24 px-4">
                    <div className="w-20 h-20 lg:w-24 lg:h-24 bg-[#10a37f]/10 rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto mb-8 text-3xl lg:text-4xl">🎙️</div>
                    {library.length === 0 ? (
                      <>
                        <h3 className="text-2xl lg:text-3xl font-bold mb-4 dark:text-white">Hi, I'm here to help you reflect, one day at a time.</h3>
                        <p className="text-sm lg:text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">We'll start with a simple check-in, and over time I'll help summarize how you've been feeling.</p>
                        <p className="text-sm lg:text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-4 font-semibold">Ready to begin?</p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-2xl lg:text-3xl font-bold mb-4 dark:text-white">I'm here.</h3>
                        <p className="text-sm lg:text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">Would you like to check in again, or look back at recent patterns?</p>
                      </>
                    )}
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
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#0d0d0d]/90 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 px-4 py-2 flex justify-around items-center z-50 pb-safe"><button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center gap-0.5 p-2 text-slate-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg><span className="text-[9px] font-semibold uppercase">Menu</span></button><button onClick={() => { if (requireAuth('record')) setCurrentScreen(SCREENS.RECORD); }} className="w-14 h-14 bg-[#10a37f] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#10a37f]/30 -mt-6 active:scale-95 transition-transform"><svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg></button><button onClick={createNewConversation} className="flex flex-col items-center gap-0.5 p-2 text-slate-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg><span className="text-[9px] font-semibold uppercase">New</span></button></div>
            <div className="px-4 lg:px-8 pb-20 lg:pb-6 pt-2 bg-gradient-to-t from-white dark:from-[#0d0d0d] via-white/95 dark:via-[#0d0d0d]/95 to-transparent"><div className="max-w-3xl mx-auto"><div className="relative"><textarea value={inputQuery} onChange={(e) => setInputQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), askQuestion())} placeholder="Ask about your recordings..." className="w-full pl-4 pr-12 py-3.5 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-lg focus:ring-2 focus:ring-[#10a37f]/30 focus:border-[#10a37f]/50 transition-all resize-none text-[15px] placeholder-slate-400 dark:text-white" rows="1" /><button onClick={askQuestion} disabled={!inputQuery.trim() || isThinking} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#10a37f] text-white rounded-xl disabled:opacity-30 transition-all active:scale-95"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg></button></div><p className="hidden lg:block text-center text-xs text-slate-400 mt-3">Responses are grounded in your audio transcripts</p></div></div>
          </div>
        </div>
      </>
    )
  }

  if (currentScreen === SCREENS.RECORD) {
    return (
      <>
        <LoginModal />
        <div className="h-screen flex bg-[#0d0d0d] text-white overflow-hidden">
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
        <LoginModal />
        <div className="h-screen flex bg-white dark:bg-[#0d0d0d] overflow-hidden">
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
        <LoginModal />
        <div className="h-screen flex bg-white dark:bg-[#0d0d0d] items-center justify-center p-6 overflow-hidden">
          <div className="text-center max-w-xs animate-fade-in"><div className="relative w-24 h-24 mx-auto mb-10"><div className="absolute inset-0 border-4 border-[#10a37f]/10 rounded-[2rem]"></div><div className="absolute inset-0 border-t-4 border-[#10a37f] rounded-[2rem] animate-spin"></div><div className="absolute inset-0 flex items-center justify-center"><svg className="w-8 h-8 text-[#10a37f] animate-pulse" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div></div><h2 className="text-2xl font-bold mb-3 tracking-tight dark:text-white">Expanding Intelligence</h2><p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em] mb-8">{processStatus === PROCESS_STATUS.UPLOADING && 'Uploading to cloud...'}{processStatus === PROCESS_STATUS.TRANSCRIBING && 'Analyzing voice patterns...'}{processStatus === PROCESS_STATUS.INDEXING && 'Grounding global memory...'}{processStatus === PROCESS_STATUS.READY && 'Ready!'}</p><div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden"><div className="h-full bg-[#10a37f] transition-all duration-500" style={{ width: processStatus === PROCESS_STATUS.UPLOADING ? '30%' : processStatus === PROCESS_STATUS.TRANSCRIBING ? '60%' : '90%' }}></div></div></div>
        </div>
      </>
    )
  }

  if (currentScreen === SCREENS.LOGIN || authLoading) {
    return (
      <div className="h-screen flex bg-white dark:bg-[#0d0d0d] items-center justify-center p-6 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#10a37f]/5 via-transparent to-transparent pointer-events-none" />
        <div className="text-center max-w-md w-full z-10 animate-fade-in">
          {authLoading ? (
            <div className="space-y-6"><div className="relative w-20 h-20 mx-auto"><div className="absolute inset-0 border-4 border-[#10a37f]/10 rounded-[2rem]"></div><div className="absolute inset-0 border-t-4 border-[#10a37f] rounded-[2rem] animate-spin"></div><div className="absolute inset-0 flex items-center justify-center"><svg className="w-8 h-8 text-[#10a37f]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3C7.5 3 4 6.5 4 10.5C4 14.5 7.5 18 12 18C12 18 12 21 12 21C12 21 17 17 17 17C19.5 15.5 21 13 21 10.5C21 6.5 17.5 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8.5" cy="10.5" r="1.5" fill="currentColor"/><circle cx="12" cy="10.5" r="1.5" fill="currentColor"/><circle cx="15.5" cy="10.5" r="1.5" fill="currentColor"/></svg></div></div><p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p></div>
          ) : (
            <>
              <div className="w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-[#10a37f] to-[#0d8a6a] rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto mb-8 text-white shadow-lg shadow-[#10a37f]/30"><svg className="w-10 h-10 lg:w-12 lg:h-12" viewBox="0 0 24 24" fill="none"><path d="M12 3C7.5 3 4 6.5 4 10.5C4 14.5 7.5 18 12 18C12 18 12 21 12 21C12 21 17 17 17 17C19.5 15.5 21 13 21 10.5C21 6.5 17.5 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8.5" cy="10.5" r="1.5" fill="currentColor"/><circle cx="12" cy="10.5" r="1.5" fill="currentColor"/><circle cx="15.5" cy="10.5" r="1.5" fill="currentColor"/></svg></div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-3 tracking-tight dark:text-white">Welcome to VoiceMemory</h1>
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

export default App
