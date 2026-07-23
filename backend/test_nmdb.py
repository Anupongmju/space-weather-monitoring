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
print(r.url)
print(r.text[:500])
