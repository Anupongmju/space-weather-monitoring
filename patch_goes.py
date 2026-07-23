import re

with open('frontend/src/services/goesService.js', 'r') as f:
    js = f.read()

js = js.replace('fetchAndSaveXray     = () => fetch(`${BASE}/fetch`, { method: \'POST\' }).then(r => r.json())', 'fetchAndSaveXray     = () => fetch(`${BASE}/fetch/xray`, { method: \'POST\' }).then(r => r.json())')
js = js.replace('fetchAndSaveProton   = () => fetch(`${BASE}/fetch`, { method: \'POST\' }).then(r => r.json())', 'fetchAndSaveProton   = () => fetch(`${BASE}/fetch/proton`, { method: \'POST\' }).then(r => r.json())')
js = js.replace('fetchAndSaveElectron = () => fetch(`${BASE}/fetch`, { method: \'POST\' }).then(r => r.json())', 'fetchAndSaveElectron = () => fetch(`${BASE}/fetch/electron`, { method: \'POST\' }).then(r => r.json())')
js = js.replace('fetchAndSaveGosMag   = () => fetch(`${BASE}/fetch`, { method: \'POST\' }).then(r => r.json())', 'fetchAndSaveGosMag   = () => fetch(`${BASE}/fetch/mag`, { method: \'POST\' }).then(r => r.json())')
js = js.replace('fetchAndSaveGoesWind = () => fetch(`${BASE}/fetch`, { method: \'POST\' }).then(r => r.json())', 'fetchAndSaveGoesWind = () => fetch(`${BASE}/fetch/wind`, { method: \'POST\' }).then(r => r.json())')

with open('frontend/src/services/goesService.js', 'w') as f:
    f.write(js)

print("goesService.js patched")
