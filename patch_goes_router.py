with open('backend/routers/goes.py', 'r') as f:
    py = f.read()

py = py.replace(
    '@router.post("/fetch")\ndef fetch_all(): return fetch_all_goes()',
    '''@router.post("/fetch")
def fetch_all(): return fetch_all_goes()

from fetchers.goes_fetcher import fetch_xray, fetch_proton, fetch_electron, fetch_goes_mag, fetch_goes_wind

@router.post("/fetch/xray")
def route_fetch_xray(): return fetch_xray()

@router.post("/fetch/proton")
def route_fetch_proton(): return fetch_proton()

@router.post("/fetch/electron")
def route_fetch_electron(): return fetch_electron()

@router.post("/fetch/mag")
def route_fetch_mag(): return fetch_goes_mag()

@router.post("/fetch/wind")
def route_fetch_wind(): return fetch_goes_wind()
'''
)

with open('backend/routers/goes.py', 'w') as f:
    f.write(py)

print("goes.py router patched")
