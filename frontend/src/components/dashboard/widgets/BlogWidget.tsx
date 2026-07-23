import React from 'react';

const BLOG_POSTS = [
  {
    id: 1,
    tag: 'GUIDE',
    title: "Understanding the Kp Index: A Beginner's Guide",
    date: '3 hours ago',
    author: 'Dr. Sarah Jenkins',
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 2,
    tag: 'IMPACT',
    title: 'How Solar Flares Impact GPS and Aviation',
    date: 'Yesterday',
    author: 'Mark Thompson',
    image: 'https://images.unsplash.com/photo-1454789548928-9efd52dc4031?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 3,
    tag: 'EVENT',
    title: 'Aurora Chasers: Best Spots for the Upcoming G3 Storm',
    date: '2 days ago',
    author: 'Aurora Hunters Comm.',
    image: 'https://images.unsplash.com/photo-1454789548928-9efd52dc4031?q=80&w=200&auto=format&fit=crop'
  }
];

export default function BlogWidget() {
  return (
    <div style={{
      background: '#050A14',
      backdropFilter: 'blur(8px)',
      borderRadius: '0px',
      marginBottom: '20px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
      border: '1px solid rgba(52, 152, 219, 0.18)',
      padding: '20px',
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: '2px solid #3498DB', borderLeft: '2px solid #3498DB', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderTop: '2px solid #3498DB', borderRight: '2px solid #3498DB', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -1, left: -1, width: 10, height: 10, borderBottom: '2px solid #3498DB', borderLeft: '2px solid #3498DB', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: '2px solid #3498DB', borderRight: '2px solid #3498DB', pointerEvents: 'none' }} />
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', background: '#3498DB', borderRadius: '50%' }}></span>
          <h3 style={{
            margin: 0, fontSize: '11px', fontWeight: '700',
            fontFamily: "'Orbitron', monospace", color: '#ffffff',
            letterSpacing: '2px', textTransform: 'uppercase'
          }}>COMMUNITY BLOG</h3>
        </div>
        {/* <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#3498DB', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>
          VIEW ALL →
        </span> */}
      </div>

      {/* Post list — ILRS card style with thin borders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {BLOG_POSTS.map((post, idx) => (
          <div
            key={post.id}
            style={{
              display: 'flex',
              gap: '14px',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: idx < BLOG_POSTS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.75'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            {/* Thumbnail — square with sharp border */}
            <div style={{
              width: '56px', height: '56px', flexShrink: 0, overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.12)'
            }}>
              <img src={post.image} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Tag + date row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#3498DB', letterSpacing: '1px' }}>
                  // {post.tag}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#606075', letterSpacing: '0.5px' }}>
                  {post.date}
                </span>
              </div>
              <h4 style={{
                margin: '0 0 4px 0', fontSize: '12px', color: '#E2E8F0',
                fontWeight: '600', lineHeight: '1.45',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
              }}>
                {post.title}
              </h4>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#606075' }}>
                {post.author}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
