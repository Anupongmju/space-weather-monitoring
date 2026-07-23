import httpx
from datetime import datetime, timedelta, timezone

end = datetime.now(timezone.utc)
start = end - timedelta(hours=24)

params = {
    'stations[]': 'OULU',
    'tabchoice': 'revori',
    'dtype': 'corr_for_efficiency',
    'tresolution': '60',
    'date_choice': 'bydate',
    'startdate': start.strftime('%Y-%m-%d %H:%M'),
    'enddate': end.strftime('%Y-%m-%d %H:%M'),
    'output': 'ascii'
}

print(params)
r = httpx.get("https://www.nmdb.eu/nest/draw_graph.php", params=params)
print(r.url)
print(r.text[:200])
