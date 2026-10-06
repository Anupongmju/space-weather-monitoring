import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { loadKpIndex, KpRecord } from '../../../services/geomagService';
import { useWidgetTheme } from './useWidgetTheme';

export default function KpWidget() {
  const [data, setData] = useState<KpRecord[]>([]);
  const [latestRecord, setLatestRecord] = useState<KpRecord | null>(null);
  const { isLight, containerStyle, axisLabelColor, splitLine, tooltip, emptyTextColor } = useWidgetTheme();

  useEffect(() => {
    // Fetch last 32 records (4 days of 3-hour Kp data)
    loadKpIndex(32)
      .then(d => {
        if (Array.isArray(d) && d.length > 0) {
          setData(d);
          setLatestRecord(d[d.length - 1]);
        }
      })
      .catch(err => {
        console.error('KpWidget load error:', err);
        // Fallback to NOAA SWPC direct if backend has network issue
        fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json')
          .then(r => r.json())
          .then(raw => {
            if (Array.isArray(raw) && raw.length > 1) {
              const rows: KpRecord[] = [];
              const start = Array.isArray(raw[0]) ? 1 : 0;
              for (let i = start; i < raw.length; i++) {
                const item = raw[i];
                if (Array.isArray(item)) {
                  rows.push({
                    time_tag: item[0],
                    kp: parseFloat(item[1]),
                    a_running: parseFloat(item[2]),
                    station_count: parseInt(item[3])
                  });
                } else if (item && typeof item === 'object') {
                  rows.push({
                    time_tag: item.time_tag,
                    kp: parseFloat(item.Kp),
                    a_running: parseFloat(item.a_running),
                    station_count: parseInt(item.station_count)
                  });
                }
              }
              const slice = rows.slice(-32);
              setData(slice);
              if (slice.length > 0) setLatestRecord(slice[slice.length - 1]);
            }
          })
          .catch(() => {});
      });
  }, []);

  const getKpColor = (kp: number | null) => {
    if (kp === null || isNaN(kp)) return '#64748B';
    if (kp >= 7) return '#EF4444'; // G3-G5 Strong Storm
    if (kp >= 6) return '#EA580C'; // G2 Moderate Storm
    if (kp >= 5) return '#F97316'; // G1 Minor Storm
    if (kp >= 4) return '#EAB308'; // Active
    return isLight ? '#16A34A' : '#22C55E'; // Quiet / Normal
  };

  const getKpLevelDesc = (kp: number | null) => {
    if (kp === null || isNaN(kp)) return 'NO DATA';
    if (kp >= 8) return 'EXTREME (G4/G5)';
    if (kp >= 7) return 'STRONG (G3)';
    if (kp >= 6) return 'MODERATE (G2)';
    if (kp >= 5) return 'MINOR (G1)';
    if (kp >= 4) return 'ACTIVE';
    if (kp >= 3) return 'UNSETTLED';
    return 'QUIET';
  };

  const latestKp = latestRecord?.kp ?? null;
  const latestColor = getKpColor(latestKp);

  // Format dates e.g. "09/08 21:00"
  const formatTime = (iso: string) => {
    if (!iso) return '';
    const parts = iso.split('T');
    if (parts.length < 2) return iso;
    const md = parts[0].slice(5); // MM-DD
    const hm = parts[1].slice(0, 5); // HH:MM
    return `${md} ${hm}`;
  };

  const option = {
    grid: { top: 12, right: 12, bottom: 22, left: 30 },
    xAxis: {
      type: 'category',
      data: data.map(d => formatTime(d.time_tag)),
      splitLine,
      axisLine: { lineStyle: { color: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' } },
      axisLabel: {
        color: axisLabelColor,
        fontSize: 10,
        interval: Math.max(1, Math.floor(data.length / 5))
      }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 9,
      interval: 3,
      splitLine,
      axisLabel: { color: axisLabelColor, fontSize: 11 }
    },
    series: [
      {
        name: 'Planetary K-index',
        type: 'bar',
        barWidth: '60%',
        data: data.map(d => ({
          value: d.kp,
          itemStyle: {
            color: getKpColor(d.kp),
            borderRadius: [2, 2, 0, 0]
          }
        })),
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            {
              yAxis: 5,
              lineStyle: {
                color: '#EF4444',
                type: 'dashed',
                width: 1.2,
                opacity: 0.8
              },
              label: {
                formatter: 'G1 Storm (Kp 5)',
                position: 'insideEndTop',
                color: '#EF4444',
                fontSize: 9,
                fontFamily: 'monospace'
              }
            }
          ]
        }
      }
    ],
    tooltip: {
      ...tooltip,
      formatter: (params: any) => {
        if (!params || !params[0]) return '';
        const p = params[0];
        const rec = data[p.dataIndex];
        const val = rec?.kp ?? null;
        const col = getKpColor(val);
        const desc = getKpLevelDesc(val);
        return `
          <div style="font-family: var(--font-mono); font-size: 12px; line-height: 1.5;">
            <strong style="color: ${isLight ? '#0F172A' : '#F8FAFC'};">${rec?.time_tag || p.name}</strong><br/>
            Planetary Kp: <span style="color:${col}; font-weight: bold; font-size: 13px;">${val !== null ? val.toFixed(2) : '—'}</span><br/>
            Status: <span style="color:${col}; font-weight: 600;">${desc}</span><br/>
            ${rec?.a_running !== null && rec?.a_running !== undefined ? `<span style="color: #94A3B8;">A-index: ${rec.a_running.toFixed(0)}</span><br/>` : ''}
            ${rec?.station_count ? `<span style="color: #64748B;">Stations: ${rec.station_count}</span>` : ''}
          </div>
        `;
      }
    }
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 13, color: isLight ? '#2E5B8A' : 'var(--text-secondary, #94A3B8)', fontFamily: 'var(--font-mono)', letterSpacing: 1, fontWeight: isLight ? 600 : 400 }}>
            // PLANETARY K-INDEX
          </span>
          <span style={{
            fontSize: 11,
            color: latestColor,
            fontFamily: 'var(--font-mono)',
            letterSpacing: 0.8,
            background: `${latestColor}18`,
            padding: '1px 6px',
            borderRadius: '3px',
            border: `1px solid ${latestColor}40`,
            fontWeight: 700
          }}>
            {getKpLevelDesc(latestKp)}
          </span>
        </div>
        <div style={{
          fontSize: 18,
          fontWeight: 700,
          fontFamily: "'Orbitron', monospace",
          color: latestColor,
          display: 'flex',
          alignItems: 'baseline',
          gap: 4,
          flexShrink: 0
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted, #94A3B8)', fontFamily: 'var(--font-mono)' }}>Kp</span>
          {latestKp !== null ? latestKp.toFixed(2) : '—'}
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, marginTop: 16 }}>
        {data.length > 0 ? (
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: emptyTextColor, fontSize: 13, fontFamily: 'var(--font-mono)' }}>
            LOADING K-INDEX DATA...
          </div>
        )}
      </div>
    </div>
  );
}
