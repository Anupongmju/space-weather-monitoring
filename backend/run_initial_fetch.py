from database import init_db
from fetchers.stereo_fetcher import fetch_stereo_particles
from fetchers.solar1_fetcher import fetch_solar1_rtsw
from fetchers.crater_fetcher import fetch_crater_doserates

print("Initializing DB...")
init_db()

print("Fetching STEREO particles...")
res_stereo = fetch_stereo_particles()
print(f"STEREO fetched: {res_stereo} rows")

print("Fetching Solar-1 RTSW...")
res_solar1 = fetch_solar1_rtsw()
print(f"Solar-1 fetched: {res_solar1} rows")

print("Fetching CRaTER doserates...")
res_crater = fetch_crater_doserates()
print(f"CRaTER fetched: {res_crater} rows")
