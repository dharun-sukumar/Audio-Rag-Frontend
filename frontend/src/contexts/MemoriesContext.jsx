import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { api } from '../api'
import { useAuth } from './AuthContext'

const MemoriesContext = createContext(null)

export function MemoriesProvider({ children }) {
    const { user, authToken, requireAuth } = useAuth()

    const [memories, setMemories] = useState([])
    const [memoryPagination, setMemoryPagination] = useState({ total: 0, page: 1, page_size: 20, total_pages: 0 })
    const [memoriesLoading, setMemoriesLoading] = useState(true)
    const [tags, setTags] = useState([])
    const [calendarActivity, setCalendarActivity] = useState({})

    // Detail/Edit State
    const [selectedMemory, setSelectedMemory] = useState(null)
    const [selectedMemoryTranscript, setSelectedMemoryTranscript] = useState(null)
    const [loadingTranscript, setLoadingTranscript] = useState(false)
    const [loadingMemory, setLoadingMemory] = useState(false)
    const [editingMemory, setEditingMemory] = useState(false)
    const [audioUrl, setAudioUrl] = useState(null)

    // Filter state
    const [memorySearchQuery, setMemorySearchQuery] = useState('')
    const [memoryMediaTypeFilter, setMemoryMediaTypeFilter] = useState(null)
    const [memoryMoodFilter, setMemoryMoodFilter] = useState(null)
    const [selectedFilterTags, setSelectedFilterTags] = useState([])

    const createTag = useCallback(async (name, color) => {
        try {
            const newTag = await api.createTag(name, color)
            setTags(prev => [...prev, newTag])
            return newTag
        } catch (err) {
            console.error('Failed to create tag:', err)
            throw err
        }
    }, [])

    const deleteTag = useCallback(async (tagId) => {
        try {
            await api.deleteTag(tagId)
            setTags(prev => prev.filter(t => t.id !== tagId))
        } catch (err) {
            console.error('Failed to delete tag:', err)
            throw err
        }
    }, [])

    const updateMemoryMetadata = useCallback(async (memoryId, data) => {
        try {
            const updatedMemory = await api.updateMemory(memoryId, data)
            setMemories(prev => prev.map(m => m.id === memoryId ? { ...m, ...updatedMemory } : m))
            if (selectedMemory?.id === memoryId) {
                setSelectedMemory(prev => ({ ...prev, ...updatedMemory }))
            }
            return updatedMemory
        } catch (err) {
            console.error('Failed to update memory metadata:', err)
            throw err
        }
    }, [selectedMemory])

    const createTextMemory = useCallback(async (content, metadata) => {
        setLoadingMemory(true)
        try {
            const newMemory = await api.createTextMemory(content, metadata)
            setMemories(prev => [newMemory, ...prev])
            return newMemory
        } catch (err) {
            console.error('Failed to create text memory:', err)
            throw err
        } finally {
            setLoadingMemory(false)
        }
    }, [])

    const toggleTag = useCallback(async (memoryId, tagId) => {
        const memory = memories.find(m => m.id === memoryId)
        if (!memory) return

        const currentTags = memory.tags || []
        const hasTag = currentTags.some(t => t.id === tagId)

        let newTagIds
        if (hasTag) {
            newTagIds = currentTags.filter(t => t.id !== tagId).map(t => t.id)
        } else {
            newTagIds = [...currentTags.map(t => t.id), tagId]
        }

        return updateMemoryMetadata(memoryId, { tag_ids: newTagIds })
    }, [memories, updateMemoryMetadata])

    const fetchMemories = useCallback(async (filters = {}) => {
        setMemoriesLoading(true)
        try {
            const params = {
                page: filters.page || 1,
                page_size: filters.page_size || 20,
                search: filters.search || memorySearchQuery || undefined,
                media_type: filters.media_type || memoryMediaTypeFilter || undefined,
                mood: filters.mood || memoryMoodFilter || undefined,
                tag_ids: filters.tag_ids || (selectedFilterTags.length > 0 ? selectedFilterTags.map(t => t.id) : undefined)
            }

            const data = await api.listMemories(params)
            setMemories(data.items || [])
            setMemoryPagination({
                total: data.total,
                page: data.page,
                page_size: data.page_size,
                total_pages: data.total_pages
            })
        } catch (err) {
            console.error('Failed to fetch memories:', err)
        } finally {
            setMemoriesLoading(false)
        }
    }, [memorySearchQuery, memoryMediaTypeFilter, memoryMoodFilter, selectedFilterTags])

    const fetchTags = useCallback(async () => {
        try {
            const data = await api.listTags()
            setTags(data || [])
        } catch (err) {
            console.error('Failed to fetch tags:', err)
        }
    }, [])

    const fetchCalendarData = useCallback(async (date, forceRefresh = false) => {
        try {
            const year = date.getFullYear()
            const month = date.getMonth() + 1
            const data = await api.getCalendarActivity(year, month)
            setCalendarActivity(prev => ({ ...prev, [`${year}-${month}`]: data }))
        } catch (err) {
            console.error('Failed to fetch calendar activity:', err)
        }
    }, [])

    const viewMemoryDetail = useCallback(async (memory) => {
        setSelectedMemory(memory)
        setLoadingMemory(true)
        setLoadingTranscript(false)
        setSelectedMemoryTranscript(null)
        setAudioUrl(null)

        try {
            const fullMemory = await api.getMemory(memory.id)
            setSelectedMemory(fullMemory)

            if (fullMemory.media_type === 'audio' || fullMemory.media_type === 'video') {
                try {
                    const signedUrlResponse = await api.getMemoryAudioUrl(fullMemory.id)
                    const url = typeof signedUrlResponse === 'string'
                        ? signedUrlResponse
                        : (signedUrlResponse?.url || signedUrlResponse?.signed_url)
                    setAudioUrl(url)
                } catch (err) {
                    console.error('Failed to get signed URL:', err)
                    setAudioUrl(api.getMemoryAudio(fullMemory.id))
                }

                if (fullMemory.status === 'completed') {
                    setLoadingTranscript(true)
                    try {
                        const transcript = await api.getMemoryTranscript(fullMemory.id)
                        setSelectedMemoryTranscript(transcript)
                    } catch (err) {
                        console.error('Failed to load transcript:', err)
                    } finally {
                        setLoadingTranscript(false)
                    }
                }
            } else if (fullMemory.media_type === 'text' && fullMemory.status === 'completed') {
                setLoadingTranscript(true)
                try {
                    const textContent = await api.getMemoryTextContent(fullMemory.id)
                    setSelectedMemoryTranscript(textContent)
                } catch (err) {
                    console.error('Failed to load text content:', err)
                } finally {
                    setLoadingTranscript(false)
                }
            }
        } catch (err) {
            console.error('Failed to load memory details:', err)
        } finally {
            setLoadingMemory(false)
        }
    }, [])

    const deleteMemory = useCallback(async (memoryId) => {
        const memoryToDelete = memories.find(m => m.id === memoryId)
        setMemories(prev => prev.filter(m => m.id !== memoryId))

        try {
            await api.deleteMemory(memoryId)
            fetchMemories()
        } catch (err) {
            console.error('Failed to delete memory:', err)
            if (memoryToDelete) {
                setMemories(prev => [...prev, memoryToDelete].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
            }
            throw err
        }
    }, [memories, fetchMemories])

    // Initial fetch
    useEffect(() => {
        if (!authToken) return
        fetchMemories()
        fetchTags()
    }, [authToken, fetchMemories, fetchTags])

    const value = {
        memories,
        memoryPagination,
        memoriesLoading,
        tags,
        calendarActivity,
        selectedMemory,
        setSelectedMemory,
        selectedMemoryTranscript,
        loadingTranscript,
        loadingMemory,
        editingMemory,
        setEditingMemory,
        audioUrl,
        memorySearchQuery,
        setMemorySearchQuery,
        memoryMediaTypeFilter,
        setMemoryMediaTypeFilter,
        memoryMoodFilter,
        setMemoryMoodFilter,
        selectedFilterTags,
        setSelectedFilterTags,
        fetchMemories,
        fetchTags,
        fetchCalendarData,
        viewMemoryDetail,
        deleteMemory,
        createTag,
        deleteTag,
        updateMemoryMetadata,
        createTextMemory,
        toggleTag
    }

    return <MemoriesContext.Provider value={value}>{children}</MemoriesContext.Provider>
}

export function useMemories() {
    const ctx = useContext(MemoriesContext)
    if (!ctx) throw new Error('useMemories must be used within MemoriesProvider')
    return ctx
}
