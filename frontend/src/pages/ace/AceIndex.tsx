import { useNavigate } from "react-router-dom";
import { useState } from "react";;
import { Wind,Magnet,Zap,RadioTower,ArrowRight } from "lucide-react";
import { fetchAllACE } from '../../services/aceService'
import StatusBadge from "../../components/ui/StatusBadge"


const cards =[
    {path:'/ace/swepam',icon:Wind, color:'#3498DB',label:'SWEPAM',sub:'Solar Wind Electrons,Protons & Alpha Moniter',
        desc:'Solar wind bulk speed, proton density, and ion temperature at L1'
    },
    {path:'/ace/mag',icon:Magnet, color:'#3b82f6',label:'MAG',sub:'Magnetometer',
        desc:'Bx,By,Bz,Bt magnatic field components'
    },
    {path:'/ace/epam',icon:Zap, color:'#a855f7',label:'EMAP',sub:'Electron, Protin & Alpha Moniter',
        desc:'Energetic particle fluxes multi-energy bands'
    },
    {path:'/ace/sis',icon:RadioTower, color:'#22c55e',label:'SIS',sub:'Solar Isotope Spactrometer',
        desc:'>10 MeV and >30 MeV proton flux'
    },
]
export default function AceIndex(){
    const navigate = useNavigate()
    const [loading,setLoading]= useState(false)
    const [status,setStatus] = useState(null);
    const [hovered,setHovered] = useState(null)
    const [btnHover,setBtnHover] = useState(false)

    const handleFetchAll = async () => {
        setLoading(true)
        setStatus(null)
        try{
            await fetchAllACE()
            setStatus({ok:true,msg:'All ACE data fetched and saved successfully'})
        }
        catch(e){
            setStatus({ok:false,msg:e.message})
        }
        finally{
            setLoading(false)
        }

    }
    return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{
        marginBottom: 28,
        padding: '28px 28px 24px',
        background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(249,115,22,0.02))',
        border: '1px solid rgba(249,115,22,0.2)',
        borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 28 }}>🛰</span>
            <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 900, color: '#F8F8FF', margin: 0 }}>
              ACE <span style={{ color: '#3498DB' }}>SATELLITE</span>
            </h1>
          </div>
          <p style={{ color: '#A0A0B8', fontSize: 13, fontFamily: "'Rajdhani', sans-serif", margin: 0 }}>
            Advanced Composition Explorer · L1 Lagrange Point · NOAA/SWPC
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <StatusBadge status="normal" label="Online" />
          <button
            onClick={handleFetchAll}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            disabled={loading}
            style={{
              padding: '8px 18px',
              background: btnHover ? 'rgba(52,152,219,0.25)' : 'rgba(52,152,219,0.12)',
              border: '1px solid rgba(52,152,219,0.5)',
              borderRadius: 8, color: '#3498DB',
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 13, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Fetching...' : '⬇ Fetch All ACE Data'}
          </button>
        </div>
      </div>

      {/* Status message */}
      {status && (
        <div style={{
          marginBottom: 20, padding: '12px 16px',
          background: status.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${status.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: 8, color: status.ok ? '#22C55E' : '#EF4444',
          fontFamily: 'var(--font-mono)', fontSize: 12,
        }}>
          {status.ok ? '✓' : '✗'} {status.msg}
        </div>
      )}

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {cards.map(card => {
          const Icon = card.icon
          const isHov = hovered === card.path
          return (
            <div
              key={card.path}
              onClick={() => navigate(card.path)}
              onMouseEnter={() => setHovered(card.path)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: isHov ? '#1C1C28' : '#16161F',
                border: `1px solid ${isHov ? card.color + '55' : 'rgba(249,115,22,0.15)'}`,
                borderRadius: 12, padding: '20px',
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: isHov ? `0 0 20px ${card.color}18` : '0 4px 24px rgba(0,0,0,0.4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: card.color + '18',
                  border: `1px solid ${card.color}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} color={card.color} />
                </div>
                <ArrowRight size={16} color={isHov ? card.color : '#606075'} style={{ transition: 'all 0.2s' }} />
              </div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 14, fontWeight: 700, color: card.color, marginBottom: 4 }}>
                {card.label}
              </div>
              <div style={{ fontSize: 12, color: '#A0A0B8', marginBottom: 8, fontWeight: 600 }}>
                {card.sub}
              </div>
              <div style={{ fontSize: 11, color: '#606075', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
                {card.desc}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
    

