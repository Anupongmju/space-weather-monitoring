from fetchers.ace_fetcher import fetch_all_ace
try:
    fetch_all_ace()
    print("Success")
except Exception as e:
    import traceback
    traceback.print_exc()
