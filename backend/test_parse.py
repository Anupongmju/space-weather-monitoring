from fetchers.cosmic_fetcher import fetch_neutron
import httpx
from datetime import datetime, timedelta, timezone

end = datetime.now(timezone.utc)
start = end - timedelta(hours=24)
fmt = lambda d: d.strftime('%Y-%m-%d %H:%M')

url = (
    f"https://www.nmdb.eu/nest/draw_graph.php"
    f"?stations[]=OULU&tabchoice=revori"
    f"&dtype=corr_for_efficiency&tresolution=60"
    f"&startdate={fmt(start)}&enddate={fmt(end)}&output=ascii"
)

r = httpx.get(url, timeout=60)
records = []
for line in r.text.split('\n'):
    if ';' not in line or line.startswith('#'): continue
    parts = line.strip().split(';')
    if len(parts) < 2: continue
    try:
        time_tag = parts[0].strip()
        count_rate = float(parts[1].strip())
        records.append((time_tag, count_rate))
    except Exception as e:
        print(f"Error parsing line: {line.strip()} -> {e}")

print(f"Parsed {len(records)} records")
if records:
    print("First record:", records[0])
    print("Last record:", records[-1])
