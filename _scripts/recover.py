import json
import re

log_path = r'C:\Users\mohds\.gemini\antigravity-ide\brain\c20ee634-4f8f-41e5-844f-8b22c2623fc6\.system_generated\logs\transcript.jsonl'
files_to_recover = ['checkout.html', 'product.html', 'wishlist.html']
contents = {f: None for f in files_to_recover}

for l in open(log_path, 'r', encoding='utf-8'):
    try:
        data = json.loads(l)
    except:
        continue
    for c in data.get('tool_calls', []):
        if c.get('name') == 'write_to_file':
            target = c.get('args', {}).get('TargetFile', '').strip('"\'')
            content = c.get('args', {}).get('CodeContent', '')
            
            for f in files_to_recover:
                if target.endswith(f):
                    contents[f] = content

for f, c in contents.items():
    if c:
        try:
            if c.startswith('"') and c.endswith('"'):
                c = json.loads(c)
        except:
            pass
        with open(r'c:\Users\mohds\Desktop\ecommerce\public\\' + f, 'w', encoding='utf-8') as out:
            out.write(c)
        print('Recovered', f)
