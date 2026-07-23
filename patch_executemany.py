import re

def patch_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Add import
    if 'from psycopg2.extras import execute_values' not in content:
        content = content.replace('from database import get_conn', 'from database import get_conn\nfrom psycopg2.extras import execute_values')
    
    # Replace cur.executemany( ... VALUES (%s,%s...) ... ) with execute_values(cur, ... VALUES %s ...)
    def replacer(match):
        query = match.group(1)
        records = match.group(2)
        # Replace VALUES (%s,%s...) with VALUES %s
        query = re.sub(r'VALUES\s*\([%s,\s]+\)', 'VALUES %s', query, flags=re.IGNORECASE)
        return f"execute_values(cur, {query}, {records})"
        
    content = re.sub(r'cur\.executemany\(\s*("""[\s\S]*?"""),\s*([a-zA-Z0-9_]+)\s*\)', replacer, content)
    
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"Patched {filepath}")

patch_file('backend/fetchers/cosmic_fetcher.py')
patch_file('backend/fetchers/maw_fetcher.py')
