import { useState, useRef, useEffect } from 'react'
import './App.css'

const API_BASE_URL = 'http://localhost:8000'

// Screen states
const SCREENS = {
  HOME: 'home',
  UPLOAD: 'upload',
  RECORD: 'record',
  PROCESSING: 'processing',
  CHAT: 'chat'
}

// Processing states
const PROCESS_STATUS = {
  IDLE: 'idle',
  PREPARING: 'preparing',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed'
}

function App() {
  // Navigation state
  const [currentScreen, setCurrentScreen] = useState(SCREENS.HOME)
  
  // Audio state
  const [selectedFile, setSelectedFile] = useState(null)
  const [processStatus, setProcessStatus] = useState(PROCESS_STATUS.IDLE)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentAudioKey, setCurrentAudioKey] = useState(null)
  const [chunksIndexed, setChunksIndexed] = useState(0)
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)
  const fileInputRef = useRef(null)
  
  // Chat state
  const [messages, setMessages] = useState([])
  const [inputQuery, setInputQuery] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  
  // Error state
  const [errorMessage, setErrorMessage] = useState('')

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      setRecordingTime(0)
    }
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [isRecording])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioFile = new File([audioBlob], `recording_${Date.now()}.webm`, { type: 'audio/webm' })
        setSelectedFile(audioFile)
        stream.getTracks().forEach(track => track.stop())
        setCurrentScreen(SCREENS.UPLOAD)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setErrorMessage('')
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setErrorMessage('Microphone access denied. Please enable it in your browser settings.')
      } else {
        setErrorMessage('Could not access your microphone. Please check your device settings.')
      }
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('audio/')) {
        setErrorMessage('Please select a valid audio file.')
        return
      }
      setSelectedFile(file)
      setCurrentScreen(SCREENS.UPLOAD)
      setErrorMessage('')
    }
  }

  const uploadAndProcess = async () => {
    if (!selectedFile) return

    setProcessStatus(PROCESS_STATUS.PREPARING)
    setCurrentScreen(SCREENS.PROCESSING)
    setErrorMessage('')

    try {
      // Step 1: Generate upload URL
      const uploadUrlResponse = await fetch(`${API_BASE_URL}/generate-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.name,
          mime: selectedFile.type
        })
      })

      if (!uploadUrlResponse.ok) {
        throw new Error('prepare')
      }

      const { upload_url, object_key } = await uploadUrlResponse.json()

      // Step 2: Upload to S3
      setProcessStatus(PROCESS_STATUS.UPLOADING)
      setUploadProgress(0)

      const xhr = new XMLHttpRequest()
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100)
          setUploadProgress(percent)
        }
      }

      xhr.onload = async () => {
        if (xhr.status === 200) {
          // Step 3: Trigger processing
          setProcessStatus(PROCESS_STATUS.PROCESSING)
          
          try {
            const processResponse = await fetch(`${API_BASE_URL}/process-audio`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio_key: object_key })
            })

            if (!processResponse.ok) {
              throw new Error('process')
            }

            const result = await processResponse.json()
            setCurrentAudioKey(object_key)
            setChunksIndexed(result.chunks || 0)
            setProcessStatus(PROCESS_STATUS.READY)
            
            // Auto-navigate to chat after brief delay
            setTimeout(() => {
              setCurrentScreen(SCREENS.CHAT)
            }, 1500)
            
          } catch (err) {
            setProcessStatus(PROCESS_STATUS.FAILED)
            setErrorMessage('Transcription failed. Your audio might be too long or in an unsupported format.')
          }
        } else {
          throw new Error('upload')
        }
      }

      xhr.onerror = () => {
        setProcessStatus(PROCESS_STATUS.FAILED)
        setErrorMessage('Upload failed. Please check your connection and try again.')
      }

      xhr.open('PUT', upload_url)
      xhr.setRequestHeader('Content-Type', selectedFile.type)
      xhr.send(selectedFile)

    } catch (err) {
      setProcessStatus(PROCESS_STATUS.FAILED)
      if (err.message === 'prepare') {
        setErrorMessage('Could not prepare the upload. Please try again.')
      } else {
        setErrorMessage('Something went wrong. Please try again.')
      }
    }
  }

  const askQuestion = async () => {
    if (!inputQuery.trim()) return

    const userMessage = { role: 'user', content: inputQuery }
    setMessages(prev => [...prev, userMessage])
    setInputQuery('')
    setIsThinking(true)
    setErrorMessage('')

    try {
      const response = await fetch(`${API_BASE_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage.content })
      })

      if (!response.ok) {
        throw new Error('ask')
      }

      const result = await response.json()
      const assistantMessage = { 
        role: 'assistant', 
        content: typeof result === 'string' ? result : result.answer || JSON.stringify(result)
      }
      setMessages(prev => [...prev, assistantMessage])
      
    } catch (err) {
      setErrorMessage('Could not generate an answer from your audio yet. Please try again.')
      setMessages(prev => prev.slice(0, -1)) // Remove user message on failure
    } finally {
      setIsThinking(false)
    }
  }

  const resetApp = () => {
    setCurrentScreen(SCREENS.HOME)
    setSelectedFile(null)
    setProcessStatus(PROCESS_STATUS.IDLE)
    setUploadProgress(0)
    setCurrentAudioKey(null)
    setChunksIndexed(0)
    setMessages([])
    setInputQuery('')
    setErrorMessage('')
  }

  // HOME SCREEN
  if (currentScreen === SCREENS.HOME) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8">
          
          <div className="text-center">
            <div className="text-6xl mb-4">🎙️</div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Voice Memory
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base">
              Record or upload audio, then ask questions about what was said
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setCurrentScreen(SCREENS.RECORD)}
              className="w-full py-5 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-2xl transition-colors shadow-lg text-lg flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
              Record Audio
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-5 px-6 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-2xl transition-colors shadow-lg text-lg border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Audio
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {errorMessage && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-800 dark:text-red-300">{errorMessage}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // RECORD SCREEN
  if (currentScreen === SCREENS.RECORD) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
        
        <div className="p-4 flex items-center justify-between">
          <button
            onClick={() => {
              if (isRecording) stopRecording()
              setCurrentScreen(SCREENS.HOME)
            }}
            className="p-2 text-gray-700 dark:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isRecording ? 'Recording' : 'Ready to Record'}
          </h2>
          <div className="w-6"></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
          
          <div className={`mb-12 text-6xl ${isRecording ? 'animate-pulse' : ''}`}>
            {isRecording ? '🔴' : '🎙️'}
          </div>

          {isRecording && (
            <div className="mb-8">
              <div className="text-5xl font-mono font-bold text-gray-900 dark:text-white">
                {formatTime(recordingTime)}
              </div>
            </div>
          )}

          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-24 h-24 rounded-full shadow-2xl transition-all ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700 active:scale-95'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
            }`}
          >
            {isRecording ? (
              <svg className="w-12 h-12 mx-auto text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            ) : (
              <svg className="w-12 h-12 mx-auto text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            )}
          </button>

          <p className="mt-6 text-gray-600 dark:text-gray-400 text-sm">
            {isRecording ? 'Tap to stop' : 'Tap to start recording'}
          </p>
        </div>

        {errorMessage && (
          <div className="fixed bottom-4 left-4 right-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-800 dark:text-red-300">{errorMessage}</p>
          </div>
        )}
      </div>
    )
  }

  // UPLOAD SCREEN
  if (currentScreen === SCREENS.UPLOAD) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
        
        <div className="p-4 flex items-center justify-between">
          <button
            onClick={() => {
              setSelectedFile(null)
              setCurrentScreen(SCREENS.HOME)
            }}
            className="p-2 text-gray-700 dark:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review Audio</h2>
          <div className="w-6"></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
          
          {selectedFile && (
            <div className="w-full max-w-md space-y-6">
              
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                <div className="text-center mb-4">
                  <div className="text-5xl mb-3">🎵</div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg truncate">
                    {selectedFile.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                {selectedFile.type.startsWith('audio/') && (
                  <audio
                    src={URL.createObjectURL(selectedFile)}
                    controls
                    className="w-full mt-4"
                  />
                )}
              </div>

              <button
                onClick={uploadAndProcess}
                className="w-full py-5 px-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-2xl transition-colors shadow-lg text-lg"
              >
                Continue
              </button>

              <button
                onClick={() => {
                  setSelectedFile(null)
                  setCurrentScreen(SCREENS.HOME)
                }}
                className="w-full py-3 text-gray-600 dark:text-gray-400 text-sm"
              >
                Choose different file
              </button>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="fixed bottom-4 left-4 right-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-800 dark:text-red-300">{errorMessage}</p>
          </div>
        )}
      </div>
    )
  }

  // PROCESSING SCREEN
  if (currentScreen === SCREENS.PROCESSING) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg text-center space-y-6">
            
            {processStatus === PROCESS_STATUS.PREPARING && (
              <>
                <div className="text-5xl animate-bounce">📦</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Preparing upload...
                </h3>
              </>
            )}

            {processStatus === PROCESS_STATUS.UPLOADING && (
              <>
                <div className="text-5xl">☁️</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Uploading your audio
                </h3>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
                  {uploadProgress}%
                </p>
              </>
            )}

            {processStatus === PROCESS_STATUS.PROCESSING && (
              <>
                <div className="text-5xl animate-pulse">🎯</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Your audio is being transcribed
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This usually takes a moment. Feel free to wait or come back later.
                </p>
              </>
            )}

            {processStatus === PROCESS_STATUS.READY && (
              <>
                <div className="text-5xl">✅</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Ready!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {chunksIndexed} segments indexed
                </p>
              </>
            )}

            {processStatus === PROCESS_STATUS.FAILED && (
              <>
                <div className="text-5xl">❌</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Something went wrong
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {errorMessage || 'Please try again'}
                </p>
                <button
                  onClick={resetApp}
                  className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Start Over
                </button>
              </>
            )}
          </div>

          {processStatus === PROCESS_STATUS.PROCESSING && (
            <button
              onClick={resetApp}
              className="w-full mt-4 py-3 text-gray-600 dark:text-gray-400 text-sm"
            >
              Cancel and start over
            </button>
          )}
        </div>
      </div>
    )
  }

  // CHAT SCREEN
  if (currentScreen === SCREENS.CHAT) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={resetApp}
              className="p-2 text-gray-700 dark:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Ask Questions
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {chunksIndexed} segments ready
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Your audio is ready
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ask any question about what was said
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                }`}
              >
                <p className="text-sm md:text-base whitespace-pre-wrap break-words">
                  {msg.content}
                </p>
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start">
              <div className="max-w-[85%] md:max-w-[70%] bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error bar */}
        {errorMessage && (
          <div className="px-4 pb-2">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-xs text-red-800 dark:text-red-300">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 sticky bottom-0">
          <div className="flex gap-2 items-end">
            <textarea
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  askQuestion()
                }
              }}
              placeholder="Ask a question..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm md:text-base"
              rows="1"
              style={{ maxHeight: '120px' }}
            />
            <button
              onClick={askQuestion}
              disabled={!inputQuery.trim() || isThinking}
              className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-2xl transition-colors flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default App
