import { useState, useEffect } from 'react'
import { getNews, createNews, deleteNews, updateNews, uploadImageToImgBB } from '../services/newsService'
import OrbitBackground from '../components/space/OrbitBackground'

export default function NewsAdmin() {
  const [passcode, setPasscode] = useState('')
  const [isAuth, setIsAuth] = useState(false)
  const [authError, setAuthError] = useState('')

  // Form states
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [author, setAuthor] = useState('Admin')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState('')

interface ContentBlock {
  id: string;
  type: string;
  value: string;
  uploading?: boolean;
  subtype?: 'p' | 'h2' | 'h3';
}

  const [blocks, setBlocks] = useState<ContentBlock[]>([
    { id: 'initial-1', type: 'text', value: '', uploading: false, subtype: 'p' }
  ])

  const addBlock = (type: string) => {
    const newBlock: ContentBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      value: '',
      uploading: false,
      subtype: type === 'text' ? 'p' : undefined
    }
    setBlocks([...blocks, newBlock])
  }

  const updateBlockSubtype = (id, subtype: 'p' | 'h2' | 'h3') => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, subtype } : b))
  }

  const removeBlock = (id) => {
    setBlocks(blocks.filter(b => b.id !== id))
  }

  const updateBlockValue = (id, val) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, value: val } : b))
  }

  const moveBlock = (index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= blocks.length) return
    const newBlocks = [...blocks]
    const temp = newBlocks[index]
    newBlocks[index] = newBlocks[newIndex]
    newBlocks[newIndex] = temp
    setBlocks(newBlocks)
  }

  const handleBlockImageUpload = async (id, file) => {
    if (!file) return
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, uploading: true } : b))
    try {
      const url = await uploadImageToImgBB(file)
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, value: url, uploading: false } : b))
    } catch (err) {
      alert(`Image upload failed: ${err.message}`)
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, uploading: false } : b))
    }
  }

  const handleEditClick = (article) => {
    setEditingId(article.id)
    setTitle(article.title)
    setAuthor(article.author || 'Admin')
    setExistingImageUrl(article.image_url || '')
    setImagePreview(article.image_url || '')
    setImageFile(null)
    
    // Parse content blocks
    try {
      if (article.content && article.content.trim().startsWith('[')) {
        const parsed = JSON.parse(article.content)
        if (Array.isArray(parsed)) {
          setBlocks(parsed)
          return
        }
      }
      // Fallback if content was plain text
      setBlocks([
        { id: Math.random().toString(36).substr(2, 9), type: 'text', value: article.content, subtype: 'p' }
      ])
    } catch (e) {
      setBlocks([
        { id: Math.random().toString(36).substr(2, 9), type: 'text', value: article.content, subtype: 'p' }
      ])
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setTitle('')
    setAuthor('Admin')
    setExistingImageUrl('')
    setImagePreview('')
    setImageFile(null)
    setBlocks([
      { id: Math.random().toString(36).substr(2, 9), type: 'text', value: '', subtype: 'p' }
    ])
  }
  
  // Data states
  const [newsList, setNewsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitError, setSubmitError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    const savedPass = localStorage.getItem('news_admin_passcode')
    if (savedPass) {
      setIsAuth(true)
      loadAdminData()
    } else {
      setLoading(false)
    }
  }, [])

  const loadAdminData = async () => {
    try {
      const data = await getNews()
      setNewsList(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (e) => {
    e.preventDefault()
    if (!passcode) return
    
    // We will save it. The backend will verify it on the actual requests
    localStorage.setItem('news_admin_passcode', passcode)
    setIsAuth(true)
    setLoading(true)
    loadAdminData()
  }

  const handleLogout = () => {
    localStorage.removeItem('news_admin_passcode')
    setIsAuth(false)
    setPasscode('')
    setAuthError('')
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    setSuccessMsg('')

    // Validate that we have blocks with some content
    const activeBlocks = blocks.filter(b => b.type === 'image' || b.value.trim() !== '')
    if (!title || activeBlocks.length === 0) {
      setSubmitError('Title and Article content blocks are required.')
      return
    }

    // Check if any image blocks are currently uploading
    const isUploading = blocks.some(b => b.uploading)
    if (isUploading) {
      setSubmitError('Please wait for all image block uploads to finish.')
      return
    }

    const savedPass = localStorage.getItem('news_admin_passcode')

    try {
      let finalImageUrl = editingId ? existingImageUrl : null
      
      // If there is a file, upload it to ImgBB first
      if (imageFile) {
        setUploadingImage(true)
        try {
          finalImageUrl = await uploadImageToImgBB(imageFile)
        } catch (err) {
          setSubmitError(`Cover image upload failed: ${err.message}`)
          setUploadingImage(false)
          return
        }
        setUploadingImage(false)
      }

      const article = {
        title,
        content: JSON.stringify(activeBlocks),
        author,
        image_url: finalImageUrl
      }

      if (editingId) {
        await updateNews(editingId, article, savedPass)
        setSuccessMsg('News article updated successfully!')
      } else {
        await createNews(article, savedPass)
        setSuccessMsg('News article published successfully!')
      }

      setTitle('')
      setBlocks([
        { id: Math.random().toString(36).substr(2, 9), type: 'text', value: '', subtype: 'p' }
      ])
      setImageFile(null)
      setImagePreview('')
      setEditingId(null)
      setExistingImageUrl('')
      
      // Reload list
      loadAdminData()
    } catch (err) {
      setSubmitError(err.message || 'Failed to publish article')
      if (err.message.includes('Unauthorized') || err.message.includes('401')) {
        handleLogout()
        setAuthError('Session expired or incorrect passcode. Please log in again.')
      }
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this cosmic report?')) return
    
    const savedPass = localStorage.getItem('news_admin_passcode')
    try {
      await deleteNews(id, savedPass)
      setSuccessMsg('Article deleted successfully.')
      loadAdminData()
    } catch (err) {
      alert(`Deletion failed: ${err.message}`)
      if (err.message.includes('Unauthorized') || err.message.includes('401')) {
        handleLogout()
        setAuthError('Session expired or incorrect passcode. Please log in again.')
      }
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // --- Lock Screen UI ---
  if (!isAuth) {
    return (
      <div style={{ position: 'relative', minHeight: 'calc(100vh - 120px)', display: 'flex', justifyContent: 'center', alignItems: 'center', boxSizing: 'border-box' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.6 }}>
          <OrbitBackground />
        </div>
        
        <div style={{ position: 'relative', zIndex: 1, background: 'rgba(10, 15, 30, 0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '40px', width: '380px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.6)' }}>
          <span style={{ width: '8px', height: '8px', background: '#3498DB', borderRadius: '50%', display: 'inline-block', marginBottom: '16px', boxShadow: '0 0 8px #3498DB' }}></span>
          <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontFamily: 'var(--font-mono)', letterSpacing: '1px', textTransform: 'uppercase' }}>Secure Admin Terminal</h2>
          <p style={{ margin: '0 0 24px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Authorization required</p>

          {authError && (
            <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#EF4444', fontSize: '11px', fontFamily: 'var(--font-mono)', marginBottom: '16px', textAlign: 'left' }}>
              ACCESS DENIED: {authError}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="password"
              placeholder="ENTER PASSCODE"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                padding: '12px',
                color: '#ffffff',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px',
                letterSpacing: '3px',
                outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = '#3498DB'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
            />
            <button
              type="submit"
              style={{
                background: '#3498DB',
                border: 'none',
                borderRadius: '6px',
                padding: '12px',
                color: '#000000',
                fontWeight: '700',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                letterSpacing: '1px',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              AUTHENTICATE
            </button>
          </form>
        </div>
      </div>
    )
  }

  // --- Main Admin Panel UI ---
  return (
    <div style={{ position: 'relative', minHeight: 'calc(100vh - 120px)', padding: '40px 20px', boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.4 }}>
        <OrbitBackground />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1100px', margin: '0 auto', textAlign: 'left' }}>
        {/* Header section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ width: '10px', height: '10px', background: '#3498DB', borderRadius: '50%', boxShadow: '0 0 10px #3498DB' }}></span>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', letterSpacing: '2px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#ffffff' }}>
              Admin News Console
            </h1>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              padding: '6px 12px',
              color: 'rgba(255,255,255,0.6)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              cursor: 'pointer',
              letterSpacing: '1px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#EF4444'
              e.currentTarget.style.borderColor = '#EF4444'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
            }}
          >
            DISCONNECT
          </button>
        </div>

        {successMsg && (
          <div style={{ padding: '12px 20px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '6px', color: '#22c55e', fontSize: '13px', fontFamily: 'var(--font-mono)', marginBottom: '24px' }}>
            SUCCESS: {successMsg}
          </div>
        )}

        {submitError && (
          <div style={{ padding: '12px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#EF4444', fontSize: '13px', fontFamily: 'var(--font-mono)', marginBottom: '24px' }}>
            ERROR: {submitError}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '40px', alignItems: 'start' }}>
          
          {/* Left panel: Composer Form */}
          <section style={{ background: 'rgba(10, 15, 30, 0.65)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: '15px', fontFamily: 'var(--font-mono)', letterSpacing: '1px', color: '#3498DB', textTransform: 'uppercase' }}>
              // {editingId ? `EDIT REPORT (ID: ${editingId})` : 'COMPOSE REPORT'}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Article Title</label>
                <input
                  type="text"
                  placeholder="e.g. Geomagnetic Storm Warning (G3 Class)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    color: '#ffffff',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = '#3498DB'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Author Name</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                    onFocus={e => e.target.style.borderColor = '#3498DB'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Media Banner (ImgBB Upload)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.5)',
                      padding: '8px 0',
                    }}
                  />
                </div>
              </div>

              {imagePreview && (
                <div style={{ width: '100%', maxHeight: '160px', overflow: 'hidden', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(''); setExistingImageUrl(''); }}
                    style={{
                      position: 'absolute', top: '8px', right: '8px',
                      background: '#EF4444', color: '#ffffff', border: 'none',
                      borderRadius: '50%', width: '24px', height: '24px',
                      cursor: 'pointer', fontWeight: 'bold', fontSize: '12px',
                      display: 'flex', justifyContent: 'center', alignItems: 'center',
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Cosmic Layout Builder */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#3498DB', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold' }}>
                  // COSMIC LAYOUT BUILDER
                </label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '12px' }}>
                  {blocks.map((block, idx) => (
                    <div
                      key={block.id}
                      style={{
                        position: 'relative',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '8px',
                        padding: '16px',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Block Controls Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px dashed rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                          BLOCK #{idx + 1}: <span style={{ color: '#3498DB' }}>{block.type === 'text' ? 'Text Paragraph' : 'Image Block'}</span>
                        </span>
                        
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => moveBlock(idx, -1)}
                            disabled={idx === 0}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: idx === 0 ? 'rgba(255,255,255,0.2)' : '#ffffff',
                              borderRadius: '4px',
                              width: '24px',
                              height: '24px',
                              cursor: idx === 0 ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              fontSize: '10px'
                            }}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBlock(idx, 1)}
                            disabled={idx === blocks.length - 1}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(255,255,255,0.1)',
                              color: idx === blocks.length - 1 ? 'rgba(255,255,255,0.2)' : '#ffffff',
                              borderRadius: '4px',
                              width: '24px',
                              height: '24px',
                              cursor: idx === blocks.length - 1 ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              fontSize: '10px'
                            }}
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={() => removeBlock(block.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: '#EF4444',
                              borderRadius: '4px',
                              width: '24px',
                              height: '24px',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#EF4444'; e.currentTarget.style.color = '#ffffff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#EF4444'; }}
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      {/* Block Contents */}
                      {block.type === 'text' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                            {[
                              { value: 'p', label: 'Paragraph (ปกติ)' },
                              { value: 'h2', label: 'Heading 2 (หัวข้อย่อยหลัก)' },
                              { value: 'h3', label: 'Heading 3 (หัวข้อย่อยรอง)' }
                            ].map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateBlockSubtype(block.id, opt.value as any)}
                                style={{
                                  background: (block.subtype || 'p') === opt.value ? '#3498DB' : 'rgba(255,255,255,0.03)',
                                  color: (block.subtype || 'p') === opt.value ? '#000000' : 'rgba(255,255,255,0.6)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '4px',
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  fontFamily: 'var(--font-mono)',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s'
                                }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          <textarea
                            placeholder={(block.subtype === 'h2' || block.subtype === 'h3') ? "Write subheading text here..." : "Write paragraph text here..."}
                            rows={block.subtype === 'p' ? 4 : 2}
                            value={block.value}
                            onChange={(e) => updateBlockValue(block.id, e.target.value)}
                            style={{
                              width: '100%',
                              background: 'rgba(0, 0, 0, 0.2)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: '4px',
                              padding: '10px',
                              outline: 'none',
                              resize: 'vertical',
                              lineHeight: '1.5',
                              boxSizing: 'border-box',
                              fontFamily: block.subtype === 'h3' ? 'var(--font-mono)' : 'var(--font-sans)',
                              fontSize: block.subtype === 'h2' ? '18px' : block.subtype === 'h3' ? '15px' : '13px',
                              fontWeight: (block.subtype === 'h2' || block.subtype === 'h3') ? 'bold' : 'normal',
                              color: block.subtype === 'h3' ? '#3498DB' : '#ffffff'
                            }}
                            onFocus={e => e.target.style.borderColor = '#3498DB'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                          />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {block.uploading ? (
                            <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
                              // UPLOADING IMAGE TO IMGBB SERVICE...
                            </div>
                          ) : block.value ? (
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                              <div style={{ width: '80px', height: '80px', overflow: 'hidden', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.1)', flexShrink: 0 }}>
                                <img src={block.value} alt="Inline block" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                              <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>IMAGE URL:</div>
                                <input
                                  type="text"
                                  readOnly
                                  value={block.value}
                                  style={{
                                    width: '100%',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    color: '#3498DB',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '10px',
                                    padding: '6px',
                                    borderRadius: '4px',
                                    boxSizing: 'border-box',
                                    outline: 'none'
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', border: '1px dashed rgba(255, 255, 255, 0.15)', borderRadius: '4px', background: 'rgba(0,0,0,0.1)' }}>
                              <input
                                type="file"
                                accept="image/*"
                                id={`file-upload-${block.id}`}
                                style={{ display: 'none' }}
                                onChange={(e) => handleBlockImageUpload(block.id, e.target.files[0])}
                              />
                              <label
                                htmlFor={`file-upload-${block.id}`}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid #3498DB',
                                  padding: '8px 16px',
                                  borderRadius: '4px',
                                  color: '#3498DB',
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#3498DB'; e.currentTarget.style.color = '#000000'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#3498DB'; }}
                              >
                                SELECT IMAGE TO UPLOAD
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Control buttons */}
                <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => addBlock('text')}
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      padding: '10px',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#ffffff'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; }}
                  >
                    + ADD TEXT PARAGRAPH
                  </button>
                  <button
                    type="button"
                    onClick={() => addBlock('image')}
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      padding: '10px',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#ffffff'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; }}
                  >
                    + ADD IMAGE BLOCK
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={uploadingImage}
                  style={{
                    flex: editingId ? 1 : 'none',
                    width: editingId ? 'auto' : '100%',
                    background: '#3498DB',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '14px',
                    color: '#000000',
                    fontWeight: '700',
                    fontFamily: 'var(--font-mono)',
                    cursor: uploadingImage ? 'not-allowed' : 'pointer',
                    letterSpacing: '1px',
                    transition: 'opacity 0.2s',
                    opacity: uploadingImage ? 0.6 : 1
                  }}
                >
                  {uploadingImage 
                    ? 'UPLOADING BANNER TO IMGBB...' 
                    : editingId 
                      ? 'UPDATE COSMIC REPORT' 
                      : 'PUBLISH COSMIC REPORT'}
                </button>
                
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '6px',
                      padding: '14px',
                      color: 'rgba(255,255,255,0.8)',
                      fontFamily: 'var(--font-mono)',
                      cursor: 'pointer',
                      letterSpacing: '1px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                      e.currentTarget.style.borderColor = '#ffffff'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                    }}
                  >
                    CANCEL EDIT
                  </button>
                )}
              </div>

            </form>
          </section>

          {/* Right panel: Published List */}
          <section style={{ background: 'rgba(10, 15, 30, 0.65)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', boxSizing: 'border-box' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: '15px', fontFamily: 'var(--font-mono)', letterSpacing: '1px', color: '#3498DB', textTransform: 'uppercase' }}>
              // PUBLISHED REPORTS ({newsList.length})
            </h2>

            {loading && (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                LOADING ARCHIVES...
              </div>
            )}

            {!loading && newsList.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', fontSize: '11px', border: '1px dashed rgba(255,255,255,0.06)', padding: '20px', borderRadius: '6px' }}>
                NO REPORTS PUBLISHED
              </div>
            )}

            {!loading && newsList.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
                {newsList.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      paddingBottom: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <h3 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: '500', color: '#ffffff', lineHeight: '1.4' }}>{item.title}</h3>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span>{formatDate(item.published_at)}</span>
                          <span>•</span>
                          <span>{item.author || 'Admin'}</span>
                        </div>
                        {item.canva_url && (
                          <span style={{ color: '#3498DB', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', wordBreak: 'break-all' }}>
                            [Canva] {item.canva_url}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button
                        onClick={() => handleEditClick(item)}
                        style={{
                          background: 'rgba(52,152,219,0.1)',
                          border: '1px solid rgba(52,152,219,0.2)',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          color: '#3498DB',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#3498DB'; e.currentTarget.style.color = '#000000'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,152,219,0.1)'; e.currentTarget.style.color = '#3498DB'; }}
                      >
                        EDIT
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          color: '#EF4444',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#EF4444'; e.currentTarget.style.color = '#ffffff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#EF4444'; }}
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  )
}
