import glob, re

files = glob.glob("frontend/src/pages/**/*.jsx", recursive=True)

for file in files:
    with open(file, 'r') as f:
        content = f.read()
    
    if 'useAutoFetch(' in content:
        # Check if useEffect is imported
        if 'useEffect' not in content:
            content = content.replace("import { useState", "import { useState, useEffect")
            content = content.replace("import { useRef", "import { useRef, useEffect")
            # If react import is something else, we'll try to find it
            
        # Extract the dependencies of useAutoFetch to use in our useEffect
        # useAutoFetch(async () => { ... }, 60000, [limit])
        match = re.search(r'useAutoFetch\(.*?,\s*\d+,\s*(\[.*?\])\)', content, re.DOTALL)
        deps = "[]"
        if match:
            deps = match.group(1)
            
        # Check if we already have useEffect(() => { load()
        if 'useEffect(() => {\n    load()\n  },' not in content and 'useEffect(() => { load() },' not in content:
            # We want to insert it right before useAutoFetch
            replacement = f"useEffect(() => {{\n    load()\n  }}, {deps})\n\n  useAutoFetch("
            content = content.replace("useAutoFetch(", replacement, 1)
            
            with open(file, 'w') as f:
                f.write(content)
            print(f"Patched {file}")

