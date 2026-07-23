import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNews } from '../services/newsService'
import OrbitBackground from '../components/space/OrbitBackground'

export default function News() {
  const [newsList, setNewsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const data = await getNews()
        setNewsList(data)
      } catch (err) {
        setError(err.message || 'Failed to load news articles')
      } finally {
        setLoading(false)
      }
    }
    fetchNews()
  }, [])

  const handleArticleClick = (news) => {
    navigate(`/news/${news.id}`)
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getNewsExcerpt = (contentString) => {
    if (!contentString) return ''
    try {
      if (contentString.trim().startsWith('[')) {
        const parsed = JSON.parse(contentString)
        if (Array.isArray(parsed)) {
          const textBlock = parsed.find(b => b.type === 'text' && b.value)
          return textBlock ? textBlock.value : ''
        }
      }
    } catch (e) {
      // ignore
    }
    return contentString
  }

  return (
    <div style={{ position: 'relative', minHeight: 'calc(100vh - 120px)', padding: '40px 20px', boxSizing: 'border-box' }}>
      {/* Background celestial orbit */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.6 }}>
        <OrbitBackground />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '0 auto', textAlign: 'left' }}>
        {/* Header section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
          <span style={{ width: '10px', height: '10px', background: '#3498DB', borderRadius: '50%', boxShadow: '0 0 10px #3498DB' }}></span>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700', letterSpacing: '2px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: '#ffffff' }}>
            NEWS SPACE WEATHER
          </h1>
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.5)', fontSize: '14px', letterSpacing: '1px' }}>
            // ESTABLISHING CONNECTION... FETCHING NEWS DATA...
          </div>
        )}

        {error && (
          <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#EF4444', fontFamily: 'var(--font-mono)', fontSize: '13px', marginBottom: '24px' }}>
            SYSTEM ERROR: {error}
          </div>
        )}

        {!loading && !error && newsList.length === 0 && (
          <div style={{ padding: '60px 40px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
            // NO ACTIVE COSMIC REPORTS AVAILABLE IN THE DATABASE
          </div>
        )}

        {!loading && !error && newsList.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
            {newsList.map((news) => (
              <article
                key={news.id}
                onClick={() => handleArticleClick(news)}
                style={{
                  background: 'rgba(10, 15, 30, 0.65)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(52, 152, 219, 0.4)'
                  e.currentTarget.style.boxShadow = '0 10px 40px rgba(52, 152, 219, 0.1)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {/* News Banner Image */}
                {news.image_url && (
                  <div style={{ width: '100%', maxHeight: '400px', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <img
                      src={news.image_url}
                      alt={news.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}

                {/* News Content */}
                <div style={{ padding: '30px', boxSizing: 'border-box' }}>
                  {/* Meta tag */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      <span>By {news.author || 'Admin'}</span>
                      <span style={{ width: '4px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%' }}></span>
                      <span>{formatDate(news.published_at)}</span>
                    </div>
                  </div>

                  <h2 style={{ margin: '0 0 16px', fontSize: '24px', fontWeight: '600', color: '#ffffff', letterSpacing: '-0.5px', lineHeight: '1.3' }}>
                    {news.title}
                  </h2>

                  {/* Excerpt of the content */}
                  <p style={{
                    margin: 0,
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    fontFamily: 'var(--font-sans)',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {getNewsExcerpt(news.content)}
                  </p>

                  {/* Read More Callout */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: '#3498DB',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      Read Full Story ›
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


