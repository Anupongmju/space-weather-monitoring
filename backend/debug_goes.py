from fetchers.goes_fetcher import fetch_xray, fetch_proton, fetch_electron, fetch_goes_mag, fetch_goes_wind
import time

funcs = [("xray", fetch_xray), ("proton", fetch_proton), ("electron", fetch_electron), ("mag", fetch_goes_mag), ("wind", fetch_goes_wind)]

for name, f in funcs:
    print(f"Testing {name}...")
    t0 = time.time()
    try:
        f()
        print(f"{name} success in {time.time()-t0:.2f}s")
    except Exception as e:
        print(f"{name} failed: {e}")
        import traceback
        traceback.print_exc()

