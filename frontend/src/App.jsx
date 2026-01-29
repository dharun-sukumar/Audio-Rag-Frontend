import { useState, useRef, useEffect } from 'react'
import './App.css'
import { auth, googleProvider } from './firebase'
import { signInWithPopup, signOut, onAuthStateChanged, getIdToken } from 'firebase/auth'

const API_BASE_URL = 'http://139.59.19.169:8000'

const SCREENS = {
  MAIN: 'main',
  RECORD: 'record',
  UPLOAD: 'upload',
  REVIEW: 'review', // New Review Sheet
  WORKSPACE: 'workspace', // Transcript + Chat
  PROCESSING: 'processing',
  LOGIN: 'login', // Login screen
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
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [savedRecordingDuration, setSavedRecordingDuration] = useState(0)
  const [activeTab, setActiveTab] = useState('chat') 
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [library, setLibrary] = useState([])
  const [recordingName, setRecordingName] = useState('') // Name for current session
  
  // Authentication state
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [imageError, setImageError] = useState(new Set())
  const [authToken, setAuthToken] = useState(null)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [showFullToken, setShowFullToken] = useState(false)
  
  // Highlighting state for source verification
  const [highlightedTimestamp, setHighlightedTimestamp] = useState(null)
  
  const [currentTranscript, setCurrentTranscript] = useState([
    { speaker: 'Speaker 1', timestamp: '0:00', text: 'Welcome to the strategy session. We are here to talk about the Q3 expansion.' },
    { speaker: 'Speaker 2', timestamp: '0:15', text: 'The focus should be on European markets specifically.' },
    { speaker: 'Speaker 1', timestamp: '0:42', text: 'Agreed. Let’s look at the budget allocation for Berlin and Paris.' }
  ])
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)
  const fileInputRef = useRef(null)
  const chatEndRef = useRef(null)
  const audioPlayerRef = useRef(null)

  // Audio playback state
  const [audioUrl, setAudioUrl] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [copied, setCopied] = useState(false)

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
      // Reset image error when user changes
      setImageError(new Set())
      // Close login modal if user signs in
      if (user) {
        setShowLoginModal(false)
        // Fetch auth token
        try {
          const token = await getIdToken(user)
          setAuthToken(token)
        } catch (error) {
          console.error('Error getting auth token:', error)
          setAuthToken(null)
        }
        // Debug: Log user info to verify photoURL is available
        console.log('User signed in:', {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          providerData: user.providerData
        })
      } else {
        setAuthToken(null)
      }
    })

    return () => unsubscribe()
  }, [])

  // Refresh token periodically (tokens expire after 1 hour)
  useEffect(() => {
    if (!user) return

    const refreshToken = async () => {
      try {
        const token = await getIdToken(user, true) // Force refresh
        setAuthToken(token)
      } catch (error) {
        console.error('Error refreshing auth token:', error)
      }
    }

    // Refresh token every 50 minutes (tokens expire after 1 hour)
    const interval = setInterval(refreshToken, 50 * 60 * 1000)
    
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
    } catch (error) {
      console.error('Sign out error:', error)
      setErrorMessage('Failed to sign out.')
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


  // --- ACTIONS ---

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('audio/')) {
      // Check authentication first
      if (!requireAuth('upload')) {
        e.target.value = '' // Reset file input
        return
      }
      setSelectedFile(file)
      setCurrentScreen(SCREENS.UPLOAD)
    }
  }

  const startRecording = async () => {
    setErrorMessage('')
    
    // Check authentication first
    if (!requireAuth('record')) {
      return
    }
    
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Your browser does not support audio recording. Please use Chrome, Firefox, or Safari.')
      return
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Determine best supported mime type
      const types = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav']
      const supportedType = types.find(type => MediaRecorder.isTypeSupported(type)) || ''
      
      const mediaRecorder = new MediaRecorder(stream, supportedType ? { mimeType: supportedType } : {})
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm'
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        const extension = mimeType.split('/')[1]?.split(';')[0] || 'webm'
        const file = new File([audioBlob], `recording_${Date.now()}.${extension}`, { 
          type: mimeType 
        })
        
        setSelectedFile(file)
        setRecordingName(`Recording ${new Date().toLocaleDateString()}`)
        setCurrentScreen(SCREENS.REVIEW)
        
        stream.getTracks().forEach(t => t.stop())
      }

      // Record in 1-second chunks for better reliability
      mediaRecorder.start(1000)
      setIsRecording(true)
    } catch (err) {
      console.error('Recording error:', err.name, err.message)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone access was denied. Please allow microphone access in your browser settings and try again.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No microphone found. Please connect a microphone and try again.')
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setErrorMessage('Your microphone is busy or unavailable. Please close other apps using it.')
      } else if (err.name === 'OverconstrainedError') {
        setErrorMessage('Could not find a suitable microphone.')
      } else if (err.name === 'SecurityError') {
        setErrorMessage('Microphone access is blocked. Please ensure you are on HTTPS or localhost.')
      } else {
        setErrorMessage(`Recording failed: ${err.message || 'Unknown error'}. Please try again.`)
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Save the duration BEFORE stopping, because setIsRecording(false) will reset recordingTime
      setSavedRecordingDuration(recordingTime)
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null // Prevent triggering the save logic
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
    }
    setIsRecording(false)
    setSavedRecordingDuration(0)
    setCurrentScreen(SCREENS.MAIN)
  }

  const uploadAndProcess = async () => {
    setProcessStatus(PROCESS_STATUS.UPLOADING)
    setCurrentScreen(SCREENS.PROCESSING)
    setErrorMessage('')
    
    try {
      // Step 1: Generate pre-signed URL
      const res = await fetch(`${API_BASE_URL}/generate-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filename: selectedFile.name, 
          mime: selectedFile.type 
        })
      })
      
      if (!res.ok) throw new Error('Failed to generate upload URL')
      const { upload_url, object_key } = await res.json()

      // Step 2: Upload to S3
      const uploadRes = await fetch(upload_url, { 
        method: 'PUT', 
        body: selectedFile, 
        headers: { 'Content-Type': selectedFile.type } 
      })
      
      if (!uploadRes.ok) throw new Error('S3 upload failed')
      
      // Step 3: Trigger processing
      setProcessStatus(PROCESS_STATUS.TRANSCRIBING)
      const procRes = await fetch(`${API_BASE_URL}/process-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_key: object_key })
      })
      
      if (!procRes.ok) throw new Error('Processing failed')
      
      // Response is a string
      const processMsg = await procRes.json()
      console.log('Processing:', processMsg)

      setProcessStatus(PROCESS_STATUS.INDEXING)
      await new Promise(r => setTimeout(r, 1000))
      
      setProcessStatus(PROCESS_STATUS.READY)
      setTimeout(() => setCurrentScreen(SCREENS.MAIN), 800)
    } catch (err) {
      setProcessStatus(PROCESS_STATUS.FAILED)
      setErrorMessage(err.message || 'Failed to process audio.')
    }
  }

  const askQuestion = async () => {
    if (!inputQuery.trim()) return
    const userMsg = { role: 'user', content: inputQuery }
    setMessages(prev => [...prev, userMsg])
    const currentQuery = inputQuery
    setInputQuery('')
    setIsThinking(true)
    setErrorMessage('')

    try {
      const res = await fetch(`${API_BASE_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentQuery })
      })
      
      if (!res.ok) throw new Error('Failed to get answer')
      
      // Response is {"answer": "..."}
      const data = await res.json()
      const answer = data.answer || data
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: answer,
        sources: [] 
      }])
    } catch (err) {
      setErrorMessage('Error getting response.')
    } finally {
      setIsThinking(false)
    }
  }

  // --- UI COMPONENTS ---

  const Sidebar = () => (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar - Fixed on desktop, drawer on mobile */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen
        ${sidebarOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full lg:w-20 lg:translate-x-0'} 
        bg-[#f9f9f9] dark:bg-[#171717] border-r border-slate-200 dark:border-white/10 
        transition-all duration-300 ease-out z-[70] flex flex-col flex-shrink-0
      `}>
        <div className="p-4 lg:p-3 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'lg:justify-center'} mb-6 px-2`}>
            <div className={`flex items-center gap-3 ${!sidebarOpen && 'lg:hidden'}`}>
              <div className="w-10 h-10 bg-gradient-to-br from-[#10a37f] to-[#0d8a6a] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#10a37f]/30 flex-shrink-0">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3C7.5 3 4 6.5 4 10.5C4 14.5 7.5 18 12 18C12 18 12 21 12 21C12 21 17 17 17 17C19.5 15.5 21 13 21 10.5C21 6.5 17.5 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="10.5" r="1.5" fill="currentColor"/>
                  <circle cx="15.5" cy="10.5" r="1.5" fill="currentColor"/>
                </svg>
              </div>
              <span className="font-bold text-lg tracking-tight dark:text-white">VoiceMemory</span>
            </div>
            {/* Collapsed Logo */}
            <div className={`hidden ${!sidebarOpen && 'lg:flex'} items-center justify-center`}>
              <div className="w-10 h-10 bg-gradient-to-br from-[#10a37f] to-[#0d8a6a] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#10a37f]/30">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3C7.5 3 4 6.5 4 10.5C4 14.5 7.5 18 12 18C12 18 12 21 12 21C12 21 17 17 17 17C19.5 15.5 21 13 21 10.5C21 6.5 17.5 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="10.5" r="1.5" fill="currentColor"/>
                  <circle cx="15.5" cy="10.5" r="1.5" fill="currentColor"/>
                </svg>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Actions */}
          <div className="space-y-2 mb-6">
            <button 
              onClick={() => { setMessages([]); if(window.innerWidth < 1024) setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all text-sm font-semibold active:scale-[0.98] ${!sidebarOpen && 'lg:justify-center lg:px-0'}`}
              title="New Chat"
            >
              <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span className={`${!sidebarOpen && 'lg:hidden'}`}>New Chat</span>
            </button>

            <button 
              onClick={() => { 
                if (requireAuth('record')) {
                  setCurrentScreen(SCREENS.RECORD)
                  if(window.innerWidth < 1024) setSidebarOpen(false)
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 bg-[#10a37f] text-white rounded-xl hover:bg-[#1a7f64] transition-all text-sm font-semibold shadow-md active:scale-[0.98] ${!sidebarOpen && 'lg:justify-center lg:px-0'}`}
              title="Record Audio"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
              <span className={`${!sidebarOpen && 'lg:hidden'}`}>Record</span>
            </button>
            
            <button 
              onClick={() => { 
                if (requireAuth('upload')) {
                  fileInputRef.current.click()
                  if(window.innerWidth < 1024) setSidebarOpen(false)
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all text-sm font-semibold active:scale-[0.98] ${!sidebarOpen && 'lg:justify-center lg:px-0'}`}
              title="Upload File"
            >
              <svg className="w-5 h-5 text-[#10a37f] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <span className={`${!sidebarOpen && 'lg:hidden'}`}>Upload</span>
            </button>
            <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} className="hidden" />
          </div>
          
          {/* Status Card - Hidden when collapsed */}
          <div className={`flex-1 overflow-y-auto custom-scrollbar ${!sidebarOpen && 'lg:hidden'}`}>
            <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
              <p className="text-[10px] font-bold text-[#10a37f] uppercase tracking-widest mb-2">Status</p>
              <h4 className="text-sm font-bold mb-1 dark:text-white">Global Memory</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                AI answers grounded in all recordings.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active</span>
              </div>
            </div>
          </div>

          {/* Collapsed Status Indicator */}
          <div className={`hidden ${!sidebarOpen && 'lg:flex'} flex-1 items-start justify-center pt-4`}>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" title="System Active"></div>
          </div>

          {/* User Profile */}
          <div className={`mt-auto pt-4 border-t border-slate-200 dark:border-white/10 ${!sidebarOpen && 'lg:border-0'}`}>
            {user ? (
              <div className="space-y-2">
                <div className={`flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors ${!sidebarOpen && 'lg:justify-center'}`}>
                  {user.photoURL && !imageError.has('profile') ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || user.email || 'User'} 
                      className="w-9 h-9 rounded-full flex-shrink-0 object-cover border-2 border-slate-200 dark:border-white/10"
                      onError={(e) => {
                        console.error('Profile image failed to load:', user.photoURL)
                        setImageError(prev => new Set(prev).add('profile'))
                      }}
                      onLoad={() => {
                        console.log('Profile image loaded successfully:', user.photoURL)
                        setImageError(prev => {
                          const newSet = new Set(prev)
                          newSet.delete('profile')
                          return newSet
                        })
                      }}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-xs text-white font-bold flex-shrink-0 border-2 border-slate-200 dark:border-white/10">
                      {getUserInitials(user)}
                    </div>
                  )}
                  <div className={`flex-1 min-w-0 ${!sidebarOpen && 'lg:hidden'}`}>
                    <span className="block text-sm font-semibold dark:text-white truncate">
                      {user.displayName || user.email || 'User'}
                    </span>
                    <span className="text-[10px] text-[#10a37f] font-semibold">Pro Plan</span>
                  </div>
                </div>
                {sidebarOpen && (
                  <>
                    {/* Auth Token Section */}
                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Auth Token
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setShowFullToken(!showFullToken)}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                            title={showFullToken ? "Hide full token" : "Show full token"}
                          >
                            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {showFullToken ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              )}
                            </svg>
                          </button>
                          <button
                            onClick={copyToken}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                            title="Copy token"
                          >
                            {tokenCopied ? (
                              <svg className="w-3.5 h-3.5 text-[#10a37f]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                      {authToken ? (
                        <div className="relative">
                          <code 
                            className="block text-[10px] font-mono text-slate-600 dark:text-slate-300 break-all p-2 bg-white dark:bg-[#0d0d0d] rounded border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors max-h-32 overflow-y-auto"
                            onClick={copyToken}
                            title="Click to copy"
                          >
                            {showFullToken ? authToken : `${authToken.substring(0, 40)}...`}
                          </code>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 italic p-2">
                          Loading token...
                        </div>
                      )}
                    </div>
                    
                    {/* Sign Out Button */}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign Out</span>
                    </button>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors ${!sidebarOpen && 'lg:justify-center'}`}
              >
                <div className="w-9 h-9 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className={`flex-1 min-w-0 ${!sidebarOpen && 'lg:hidden'}`}>
                  <span className="block text-sm font-semibold dark:text-white">Sign In</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Click to login</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )

  const MainHeader = () => (
    <header className="h-14 lg:h-16 border-b border-slate-200 dark:border-white/10 px-4 lg:px-6 flex items-center justify-between bg-white/80 dark:bg-[#0d0d0d]/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="flex items-center gap-3">
        {/* Sidebar Toggle */}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-500"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          )}
        </button>
        
        <div className="hidden lg:flex items-center gap-3">
          <div className="h-5 w-px bg-slate-200 dark:bg-white/10" />
          <h1 className="text-sm font-semibold text-slate-600 dark:text-slate-300">AI Assistant</h1>
        </div>
        
        {/* Mobile Brand */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-2 h-2 bg-[#10a37f] rounded-full animate-pulse"></div>
          <span className="font-bold text-base dark:text-white">VoiceMemory</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Status Badge - Desktop */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#10a37f]/10 rounded-full">
          <div className="w-2 h-2 bg-[#10a37f] rounded-full animate-pulse"></div>
          <span className="text-xs font-semibold text-[#10a37f]">Memory Active</span>
        </div>
        
        {/* Quick Record - Mobile */}
        <button 
          onClick={() => {
            if (requireAuth('record')) {
              setCurrentScreen(SCREENS.RECORD)
            }
          }}
          className="lg:hidden p-2 bg-[#10a37f] text-white rounded-lg active:scale-95 transition-transform"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
        </button>
        
        {/* Share */}
        <button 
          onClick={copyUrl}
          className={`p-2 rounded-lg transition-all ${copied ? 'bg-[#10a37f]/10 text-[#10a37f]' : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400'}`}
          title="Copy link"
        >
          {copied ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
          )}
        </button>
      </div>
    </header>
  )


  // --- SCREENS ---

  // Login Modal Component
  const LoginModal = () => {
    if (!showLoginModal) return null

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowLoginModal(false)}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-md bg-white dark:bg-[#171717] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-8 animate-fade-in">
          {/* Close Button */}
          <button
            onClick={() => setShowLoginModal(false)}
            className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Logo */}
          <div className="w-16 h-16 bg-gradient-to-br from-[#10a37f] to-[#0d8a6a] rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-[#10a37f]/30">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
              <path d="M12 3C7.5 3 4 6.5 4 10.5C4 14.5 7.5 18 12 18C12 18 12 21 12 21C12 21 17 17 17 17C19.5 15.5 21 13 21 10.5C21 6.5 17.5 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor"/>
              <circle cx="12" cy="10.5" r="1.5" fill="currentColor"/>
              <circle cx="15.5" cy="10.5" r="1.5" fill="currentColor"/>
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold mb-2 text-center dark:text-white">Sign In Required</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
            Please sign in to record audio, upload files, and access your profile
          </p>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-500 text-sm font-medium text-center">{errorMessage}</p>
            </div>
          )}

          {/* Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-[#1a1a1a] border-2 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-xl hover:border-[#10a37f] hover:bg-[#10a37f]/5 dark:hover:bg-[#10a37f]/10 transition-all font-semibold shadow-lg active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
      </div>
    )
  }

  if (currentScreen === SCREENS.REVIEW) {
    return (
      <>
        <LoginModal />
        <div className="h-screen flex bg-white dark:bg-[#0d0d0d] items-end md:items-center justify-center relative overflow-hidden">
        {/* Hidden Audio Element */}
        {audioUrl && (
          <audio 
            ref={audioPlayerRef} 
            src={audioUrl} 
            onEnded={() => setIsPlaying(false)}
          />
        )}
        
        {/* Immersive Background */}
        <div className="absolute inset-0 bg-[#10a37f]/5 pointer-events-none" />
        
        <div className="w-full max-w-lg bg-white dark:bg-[#171717] rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 md:p-10 shadow-2xl border-t md:border border-slate-200 dark:border-white/10 animate-fade-in z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-1 bg-slate-200 dark:bg-white/10 rounded-full mx-auto mb-8 md:hidden" />
            <h2 className="text-2xl font-bold tracking-tight mb-2">Review Recording</h2>
            <p className="text-sm text-slate-500">Ready to index this into your global memory?</p>
          </div>

          <div className="space-y-6">
            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Session Name</label>
              <input 
                type="text" 
                value={recordingName}
                onChange={(e) => setRecordingName(e.target.value)}
                className="w-full bg-transparent text-lg font-bold focus:outline-none dark:text-white px-1"
                placeholder="Give it a name..."
              />
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#10a37f]/10 text-[#10a37f] rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="text-xs font-bold dark:text-white uppercase tracking-tighter">Audio Clip</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">{formatTime(savedRecordingDuration)} Duration</p>
                </div>
              </div>
              <button 
                onClick={togglePlayback}
                className="p-3 text-white bg-[#10a37f] hover:bg-[#1a7f64] rounded-xl transition-colors active:scale-95"
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-4">
              <button 
                onClick={uploadAndProcess} 
                className="w-full py-4 bg-[#10a37f] text-white font-bold rounded-2xl shadow-lg shadow-[#10a37f]/20 hover:bg-[#1a7f64] transition-all active:scale-[0.98]"
              >
                Transcribe & Index
              </button>
              <button 
                onClick={() => { setSelectedFile(null); setSavedRecordingDuration(0); setIsPlaying(false); setCurrentScreen(SCREENS.MAIN); }}
                className="w-full py-4 text-slate-500 dark:text-white/40 font-bold text-sm hover:text-red-500 transition-colors"
              >
                Discard Recording
              </button>
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
        <LoginModal />
        <div className="h-screen flex bg-white dark:bg-[#0d0d0d] overflow-hidden">
          <Sidebar />
        
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <MainHeader />
          
          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto px-4 lg:px-8 custom-scrollbar">
            <div className="max-w-3xl mx-auto py-8 lg:py-12 pb-32 lg:pb-24">
              {/* Empty State */}
              {messages.length === 0 && (
                <div className="text-center py-16 lg:py-24 px-4">
                  <div className="w-20 h-20 lg:w-24 lg:h-24 bg-[#10a37f]/10 rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto mb-8 text-3xl lg:text-4xl">🎙️</div>
                  <h3 className="text-2xl lg:text-3xl font-bold mb-3 dark:text-white">How can I help you today?</h3>
                  <p className="text-sm lg:text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-10">
                    Ask me anything about your recorded conversations. I can summarize, find details, or cross-reference facts.
                  </p>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-w-xl mx-auto">
                    <button onClick={() => setInputQuery("Summarize our last roadmap discussion")} className="p-4 text-sm font-medium bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:border-[#10a37f] hover:bg-[#10a37f]/5 transition-all text-left active:scale-[0.98]">
                      "Summarize our last roadmap discussion"
                    </button>
                    <button onClick={() => setInputQuery("What were the action items for the marketing team?")} className="p-4 text-sm font-medium bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:border-[#10a37f] hover:bg-[#10a37f]/5 transition-all text-left active:scale-[0.98]">
                      "What were the action items?"
                    </button>
                  </div>
                </div>
              )}
              
              {/* Messages */}
              <div className="space-y-6">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 lg:gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-lg bg-[#10a37f] text-white flex items-center justify-center flex-shrink-0 mt-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </div>
                    )}
                    <div className={`max-w-[85%] lg:max-w-[75%] rounded-2xl ${msg.role === 'user' ? 'bg-[#10a37f] text-white px-4 py-2.5 rounded-br-sm' : 'text-slate-800 dark:text-white/90'}`}>
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-white/20">
                          {msg.sources.map(s => (
                            <span key={s} className="text-[10px] font-semibold bg-white/20 px-2 py-1 rounded">Ref: {s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="hidden lg:flex w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center flex-shrink-0 text-xs font-bold mt-1 dark:text-white border border-slate-200 dark:border-white/10 overflow-hidden">
                        {user?.photoURL && !imageError.has('chat') ? (
                          <img 
                            src={user.photoURL} 
                            alt={user.displayName || user.email || 'User'} 
                            className="w-full h-full rounded-full object-cover"
                            onError={(e) => {
                              console.error('Chat avatar image failed to load:', user.photoURL)
                              setImageError(prev => new Set(prev).add('chat'))
                            }}
                            onLoad={() => {
                              setImageError(prev => {
                                const newSet = new Set(prev)
                                newSet.delete('chat')
                                return newSet
                              })
                            }}
                          />
                        ) : (
                          getUserInitials(user)
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Thinking */}
                {isThinking && (
                  <div className="flex gap-3 lg:gap-4">
                    <div className="w-8 h-8 rounded-lg bg-[#10a37f] text-white flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div className="flex items-center gap-1.5 py-3">
                      <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce [animation-delay:0.15s]"></div>
                      <div className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full animate-bounce [animation-delay:0.3s]"></div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Mobile Bottom Bar */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#0d0d0d]/90 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 px-4 py-2 flex justify-around items-center z-50 pb-safe">
            <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center gap-0.5 p-2 text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              <span className="text-[9px] font-semibold uppercase">Menu</span>
            </button>
            <button 
              onClick={() => {
                if (requireAuth('record')) {
                  setCurrentScreen(SCREENS.RECORD)
                }
              }}
              className="w-14 h-14 bg-[#10a37f] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#10a37f]/30 -mt-6 active:scale-95 transition-transform"
            >
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
            </button>
            <button onClick={() => setMessages([])} className="flex flex-col items-center gap-0.5 p-2 text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span className="text-[9px] font-semibold uppercase">New</span>
            </button>
          </div>

          {/* Chat Input */}
          <div className="px-4 lg:px-8 pb-20 lg:pb-6 pt-2 bg-gradient-to-t from-white dark:from-[#0d0d0d] via-white/95 dark:via-[#0d0d0d]/95 to-transparent">
            <div className="max-w-3xl mx-auto">
              <div className="relative">
                <textarea 
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), askQuestion())}
                  placeholder="Ask about your audio..."
                  className="w-full pl-4 pr-12 py-3.5 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-lg focus:ring-2 focus:ring-[#10a37f]/30 focus:border-[#10a37f]/50 transition-all resize-none text-[15px] placeholder-slate-400 dark:text-white"
                  rows="1"
                />
                <button 
                  onClick={askQuestion}
                  disabled={!inputQuery.trim() || isThinking}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#10a37f] text-white rounded-xl disabled:opacity-30 transition-all active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                </button>
              </div>
              <p className="hidden lg:block text-center text-xs text-slate-400 mt-3">
                Responses are grounded in your audio transcripts
              </p>
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
        <LoginModal />
        <div className="h-screen flex bg-[#0d0d0d] text-white overflow-hidden">
        <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
          <button onClick={cancelRecording} className="absolute top-8 left-8 p-3 hover:bg-white/10 rounded-2xl transition-all active:scale-90">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          
          <div className="text-center mb-16">
            <span className="text-[10px] font-bold text-[#10a37f] uppercase tracking-[0.3em] mb-4 block">Capturing Voice</span>
            <h2 className="text-2xl font-bold tracking-tight">Audio Intake Studio</h2>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-8 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl max-w-md text-center">
              <p className="text-red-400 text-sm font-medium">{errorMessage}</p>
              <button 
                onClick={() => setErrorMessage('')} 
                className="mt-2 text-xs text-red-400/70 hover:text-red-400 underline"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 mb-12 h-20">
            {[...Array(32)].map((_, i) => (
              <div key={i} className={`wave-bar ${isRecording ? '' : 'opacity-20 animate-none !h-1'}`}></div>
            ))}
          </div>

          <div className="text-8xl font-light mb-16 tabular-nums tracking-tighter text-white animate-pulse">
            {formatTime(recordingTime)}
          </div>

          <div className="flex flex-col items-center gap-8">
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center transition-all shadow-2xl active:scale-95 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-[#10a37f] hover:bg-[#1a7f64] shadow-[#10a37f]/20'}`}
            >
              {isRecording ? (
                <div className="w-8 h-8 bg-white rounded-lg"></div>
              ) : (
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
              )}
            </button>
            <p className="text-slate-400 text-sm font-bold tracking-widest uppercase">{isRecording ? 'Recording Live...' : 'Tap to Start'}</p>
          </div>
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
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-14 lg:h-16 flex items-center px-4 lg:px-6 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0d0d0d]/80 backdrop-blur-xl">
            <button onClick={() => setCurrentScreen(SCREENS.MAIN)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="ml-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Upload Audio</span>
          </header>
          
          {/* Content */}
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-sm bg-white dark:bg-[#171717] p-8 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl text-center">
              <div className="w-16 h-16 bg-[#10a37f]/10 text-[#10a37f] rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
              </div>
              <h3 className="text-lg font-bold mb-1 dark:text-white truncate">{selectedFile?.name}</h3>
              <p className="text-sm text-slate-500 mb-8">{(selectedFile?.size / 1024 / 1024).toFixed(2)} MB</p>
              
              <div className="space-y-2">
                <button 
                  onClick={uploadAndProcess} 
                  className="w-full py-3 bg-[#10a37f] text-white font-semibold rounded-xl transition-all active:scale-[0.98]"
                >
                  Process Audio
                </button>
                <button 
                  onClick={() => setCurrentScreen(SCREENS.MAIN)} 
                  className="w-full py-3 text-slate-500 font-medium text-sm hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
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

  if (currentScreen === SCREENS.PROCESSING) {
    return (
      <>
        <LoginModal />
        <div className="h-screen flex bg-white dark:bg-[#0d0d0d] items-center justify-center p-6 overflow-hidden">
          <div className="text-center max-w-xs animate-fade-in">
          <div className="relative w-24 h-24 mx-auto mb-10">
            <div className="absolute inset-0 border-4 border-[#10a37f]/10 rounded-[2rem]"></div>
            <div className="absolute inset-0 border-t-4 border-[#10a37f] rounded-[2rem] animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
               <svg className="w-8 h-8 text-[#10a37f] animate-pulse" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-3 tracking-tight dark:text-white">Expanding Intelligence</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em] mb-8">
            {processStatus === PROCESS_STATUS.UPLOADING && 'Uploading to cloud...'}
            {processStatus === PROCESS_STATUS.TRANSCRIBING && 'Analyzing voice patterns...'}
            {processStatus === PROCESS_STATUS.INDEXING && 'Grounding global memory...'}
            {processStatus === PROCESS_STATUS.READY && 'Ready!'}
          </p>
            <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-[#10a37f] transition-all duration-500" style={{ width: processStatus === PROCESS_STATUS.UPLOADING ? '30%' : processStatus === PROCESS_STATUS.TRANSCRIBING ? '60%' : '90%' }}></div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (currentScreen === SCREENS.LOGIN || authLoading) {
    return (
      <div className="h-screen flex bg-white dark:bg-[#0d0d0d] items-center justify-center p-6 overflow-hidden relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#10a37f]/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="text-center max-w-md w-full z-10 animate-fade-in">
          {authLoading ? (
            <div className="space-y-6">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 border-4 border-[#10a37f]/10 rounded-[2rem]"></div>
                <div className="absolute inset-0 border-t-4 border-[#10a37f] rounded-[2rem] animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#10a37f]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3C7.5 3 4 6.5 4 10.5C4 14.5 7.5 18 12 18C12 18 12 21 12 21C12 21 17 17 17 17C19.5 15.5 21 13 21 10.5C21 6.5 17.5 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor"/>
                    <circle cx="12" cy="10.5" r="1.5" fill="currentColor"/>
                    <circle cx="15.5" cy="10.5" r="1.5" fill="currentColor"/>
                  </svg>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
            </div>
          ) : (
            <>
              {/* Logo */}
              <div className="w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-[#10a37f] to-[#0d8a6a] rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto mb-8 text-white shadow-lg shadow-[#10a37f]/30">
                <svg className="w-10 h-10 lg:w-12 lg:h-12" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3C7.5 3 4 6.5 4 10.5C4 14.5 7.5 18 12 18C12 18 12 21 12 21C12 21 17 17 17 17C19.5 15.5 21 13 21 10.5C21 6.5 17.5 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="10.5" r="1.5" fill="currentColor"/>
                  <circle cx="15.5" cy="10.5" r="1.5" fill="currentColor"/>
                </svg>
              </div>

              {/* Title */}
              <h1 className="text-3xl lg:text-4xl font-bold mb-3 tracking-tight dark:text-white">
                Welcome to VoiceMemory
              </h1>
              <p className="text-base text-slate-500 dark:text-slate-400 mb-10 max-w-sm mx-auto">
                Sign in to access your audio recordings and AI-powered insights
              </p>

              {/* Error Message */}
              {errorMessage && (
                <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                  <p className="text-red-500 text-sm font-medium">{errorMessage}</p>
                </div>
              )}

              {/* Sign In Button */}
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-[#171717] border-2 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl hover:border-[#10a37f] hover:bg-[#10a37f]/5 dark:hover:bg-[#10a37f]/10 transition-all font-semibold shadow-lg active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Footer */}
              <p className="mt-8 text-xs text-slate-400 dark:text-slate-500">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  return null
}

export default App
