import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getNewsById } from '../services/newsService'
import OrbitBackground from '../components/space/OrbitBackground'

export default function NewsDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [news, setNews] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true)
        const data = await getNewsById(id)
        setNews(data)
      } catch (err) {
        setError(err.message || 'Failed to load news article')
      } finally {
        setLoading(false)
      }
    }
    fetchArticle()
  }, [id])

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderContent = (contentString) => {
    if (!contentString) return null
    try {
      if (contentString.trim().startsWith('[')) {
        const parsed = JSON.parse(contentString)
        if (Array.isArray(parsed)) {
          return parsed.map((block) => {
            if (block.type === 'text') {
              if (block.subtype === 'h2') {
                return (
                  <h2
                    key={block.id}
                    style={{
                      color: '#ffffff',
                      fontSize: '22px',
                      fontWeight: '600',
                      fontFamily: 'var(--font-sans)',
                      margin: '36px 0 16px 0',
                      lineHeight: '1.4'
                    }}
                  >
                    {block.value}
                  </h2>
                )
              } else if (block.subtype === 'h3') {
                return (
                  <h3
                    key={block.id}
                    style={{
                      color: '#3498DB',
                      fontSize: '18px',
                      fontWeight: '600',
                      fontFamily: 'var(--font-mono)',
                      margin: '28px 0 12px 0',
                      lineHeight: '1.4'
                    }}
                  >
                    {block.value}
                  </h3>
                )
              } else {
                return (
                  <p
                    key={block.id}
                    style={{
                      color: 'rgba(255,255,255,0.85)',
                      fontSize: '15px',
                      lineHeight: '1.8',
                      whiteSpace: 'pre-line',
                      fontFamily: 'var(--font-sans)',
                      letterSpacing: '0.2px',
                      margin: '0 0 24px 0'
                    }}
                  >
                    {block.value}
                  </p>
                )
              }
            } else if (block.type === 'image' && block.value) {
              return (
                <div
                  key={block.id}
                  style={{
                    width: '100%',
                    maxHeight: '600px',
                    overflow: 'hidden',
                    borderRadius: '8px',
                    margin: '32px 0',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.2)'
                  }}
                >
                  <img
                    src={block.value}
                    alt="Article visual"
                    style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }}
                  />
                </div>
              )
            }
            return null
          })
        }
      }
    } catch (e) {
      console.warn('Failed to parse blocks JSON, falling back to plain text', e)
    }

    return (
      <div style={{
        color: 'rgba(255,255,255,0.85)',
        fontSize: '15px',
        lineHeight: '1.8',
        whiteSpace: 'pre-line',
        fontFamily: 'var(--font-sans)',
        letterSpacing: '0.2px'
      }}>
        {contentString}
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ position: 'relative', minHeight: 'calc(100vh - 120px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.6 }}>
          <OrbitBackground />
        </div>
        <div style={{ position: 'relative', zIndex: 1, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.5)', fontSize: '14px', letterSpacing: '1px' }}>
          // ESTABLISHING CONNECTION... FETCHING ARTICLE DATA...
        </div>
      </div>
    )
  }

  if (error || !news) {
    return (
      <div style={{ position: 'relative', minHeight: 'calc(100vh - 120px)', padding: '40px 20px', boxSizing: 'border-box' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.6 }}>
          <OrbitBackground />
        </div>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '40px auto', textAlign: 'center' }}>
          <div style={{ padding: '30px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', color: '#EF4444', fontFamily: 'var(--font-mono)', fontSize: '14px', marginBottom: '24px' }}>
            COSMIC ERROR: {error || 'Article not found in database archives'}
          </div>
          <Link to="/news" style={{ textDecoration: 'none', fontFamily: 'var(--font-mono)', color: '#3498DB', fontSize: '12px', border: '1px solid #3498DB', padding: '10px 20px', borderRadius: '6px' }}>
            RETURN TO ARCHIVES
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', minHeight: 'calc(100vh - 120px)', padding: '40px 20px', boxSizing: 'border-box' }}>
      {/* Background celestial orbit */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.6 }}>
        <OrbitBackground />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '950px', margin: '0 auto', textAlign: 'left' }}>
        
        {/* Back Button */}
        <button
          onClick={() => navigate('/news')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#3498DB',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            cursor: 'pointer',
            letterSpacing: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 0 20px 0',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          ‹ BACK TO ARCHIVES
        </button>

        {/* Article Container (Glass Card Style) */}
        <div style={{
          background: 'rgba(10, 15, 30, 0.65)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '40px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
          boxSizing: 'border-box',
          width: '100%'
        }}>
          {/* Meta Information */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            <span>By {news.author || 'Admin'}</span>
            <span style={{ width: '4px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%' }}></span>
            <span>{formatDate(news.published_at)}</span>
          </div>

          {/* Title */}
          <h1 style={{
            margin: '0 0 24px',
            fontSize: '32px',
            fontWeight: '700',
            lineHeight: '1.3',
            color: '#ffffff',
            letterSpacing: '-0.5px'
          }}>
            {news.title}
          </h1>

          {/* Divider */}
          <div style={{ height: '1px', background: 'linear-gradient(to right, #3498DB, transparent)', marginBottom: '32px' }} />

          {/* Content Area */}
          <div>
            {/* Main Banner Image */}
            {news.image_url && (
              <div style={{
                width: '100%',
                maxHeight: '450px',
                overflow: 'hidden',
                borderRadius: '8px',
                marginBottom: '32px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
              }}>
                <img
                  src={news.image_url}
                  alt={news.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}

            {/* Rich block content layout */}
            <div>
              {renderContent(news.content)}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
