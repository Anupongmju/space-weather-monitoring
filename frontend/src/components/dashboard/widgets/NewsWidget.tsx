import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getNews } from '../../../services/newsService';

export default function NewsWidget() {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const data = await getNews();
        if (Array.isArray(data)) {
          setNewsList(data);
        }
      } catch (err) {
        console.error('Failed to load news for widget:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  useEffect(() => {
    if (isHovered || newsList.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % newsList.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isHovered, newsList]);

  const goToSlide = (index) => setCurrentIndex(index);
  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % newsList.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + newsList.length) % newsList.length);

  if (loading) {
    return (
      <div style={{
        background: '#050A14',
        backdropFilter: 'blur(8px)',
        borderRadius: '0px',
        marginBottom: '20px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(52, 152, 219, 0.18)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '286px'
      }}>
        <div style={{ padding: '16px 20px 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', background: '#3498DB', borderRadius: '50%' }}></span>
          <h3 style={{
            margin: 0,
            fontSize: '11px',
            fontWeight: '700',
            fontFamily: "'Orbitron', monospace",
            color: '#ffffff',
            letterSpacing: '2px',
            textTransform: 'uppercase'
          }}>LAST NEWS</h3>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
          fontFamily: 'var(--font-mono)',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '11px',
          letterSpacing: '1px'
        }}>
          // FETCHING NEWS DATA...
        </div>
      </div>
    );
  }

  if (newsList.length === 0) {
    return (
      <div style={{
        background: '#050A14',
        backdropFilter: 'blur(8px)',
        borderRadius: '0px',
        marginBottom: '20px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(52, 152, 219, 0.18)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '286px'
      }}>
        <div style={{ padding: '16px 20px 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', background: '#3498DB', borderRadius: '50%' }}></span>
          <h3 style={{
            margin: 0,
            fontSize: '11px',
            fontWeight: '700',
            fontFamily: "'Orbitron', monospace",
            color: '#ffffff',
            letterSpacing: '2px',
            textTransform: 'uppercase'
          }}>LAST NEWS</h3>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
          fontFamily: 'var(--font-mono)',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '11px',
          letterSpacing: '1px'
        }}>
          // NO ACTIVE COSMIC REPORTS AVAILABLE
        </div>
      </div>
    );
  }

  const currentNews = newsList[currentIndex];
  const newsTitle = currentNews.title || '';
  
  const getNewsExcerpt = (contentString) => {
    if (!contentString) return '';
    try {
      if (contentString.trim().startsWith('[')) {
        const parsed = JSON.parse(contentString);
        if (Array.isArray(parsed)) {
          const textBlock = parsed.find(b => b.type === 'text' && b.value);
          return textBlock ? textBlock.value : '';
        }
      }
    } catch (e) {
      // ignore
    }
    return contentString;
  };

  const newsSummary = getNewsExcerpt(currentNews.content || currentNews.summary || '');
  const newsImage = currentNews.image_url || currentNews.image || 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?q=80&w=800&auto=format&fit=crop';
  
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };
  const newsDate = currentNews.published_at ? formatDate(currentNews.published_at) : (currentNews.date || '');

  return (
    <div style={{
      background: '#050A14',
      backdropFilter: 'blur(8px)',
      borderRadius: '0px',
      marginBottom: '20px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
      border: '1px solid rgba(52, 152, 219, 0.18)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: '2px solid #3498DB', borderLeft: '2px solid #3498DB', pointerEvents: 'none', zIndex: 10 }} />
      <div style={{ position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderTop: '2px solid #3498DB', borderRight: '2px solid #3498DB', pointerEvents: 'none', zIndex: 10 }} />
      <div style={{ position: 'absolute', bottom: -1, left: -1, width: 10, height: 10, borderBottom: '2px solid #3498DB', borderLeft: '2px solid #3498DB', pointerEvents: 'none', zIndex: 10 }} />
      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: '2px solid #3498DB', borderRight: '2px solid #3498DB', pointerEvents: 'none', zIndex: 10 }} />
      {/* Header */}
      <div style={{ padding: '16px 20px 0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', background: '#3498DB', borderRadius: '50%' }}></span>
          <h3 style={{
            margin: 0,
            fontSize: '11px',
            fontWeight: '700',
            fontFamily: "'Orbitron', monospace",
            color: '#ffffff',
            letterSpacing: '2px',
            textTransform: 'uppercase'
          }}>LAST NEWS</h3>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#606075', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {currentIndex + 1} / {newsList.length}
        </span>
      </div>

      {/* Slider */}
      <div
        style={{ position: 'relative', width: '100%', height: '230px', backgroundColor: '#000', marginTop: '12px' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Link 
          to={`/news/${currentNews.id}`} 
          style={{ display: 'block', width: '100%', height: '100%', textDecoration: 'none', color: 'inherit', cursor: 'pointer', position: 'relative' }}
        >
          <div style={{
            width: '100%',
            height: '100%',
            backgroundImage: `url(${newsImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'background-image 0.5s ease-in-out'
          }}>
            <div style={{
              position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 55%, transparent 100%)'
            }} />
          </div>

          {/* Text Overlay */}
          <div style={{ position: 'absolute', bottom: '36px', left: '0', padding: '0 20px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#3498DB', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>
              // {newsDate}
            </div>
            <h4 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '14px', fontWeight: '600', lineHeight: '1.4' }}>
              {newsTitle}
            </h4>
            <p style={{ margin: 0, color: '#94A3B8', fontSize: '11px', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {newsSummary}
            </p>
          </div>
        </Link>

        {/* Nav Buttons */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            prevSlide();
          }} 
          style={{
            position: 'absolute', top: '40%', left: '12px', transform: 'translateY(-50%)',
            background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', color: 'white',
            width: '28px', height: '28px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
            fontFamily: 'var(--font-mono)', fontSize: '11px', backdropFilter: 'blur(4px)'
          }}
        >
          ‹
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            nextSlide();
          }} 
          style={{
            position: 'absolute', top: '40%', right: '12px', transform: 'translateY(-50%)',
            background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', color: 'white',
            width: '28px', height: '28px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
            fontFamily: 'var(--font-mono)', fontSize: '11px', backdropFilter: 'blur(4px)'
          }}
        >
          ›
        </button>

        {/* Dot indicators — replaced with dash-style like ILRS */}
        <div style={{ position: 'absolute', bottom: '14px', left: '20px', display: 'flex', gap: '4px', zIndex: 10 }}>
          {newsList.map((_, idx) => (
            <div
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                goToSlide(idx);
              }}
              style={{
                width: idx === currentIndex ? '20px' : '6px',
                height: '2px',
                background: idx === currentIndex ? '#3498DB' : 'rgba(255,255,255,0.3)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
