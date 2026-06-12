import json
log_path = r'C:\Users\mohds\.gemini\antigravity-ide\brain\c20ee634-4f8f-41e5-844f-8b22c2623fc6\.system_generated\logs\transcript.jsonl'
for l in open(log_path, 'r', encoding='utf-8'):
    try: data = json.loads(l)
    except: continue
    for c in data.get('tool_calls', []):
        if c.get('name') == 'write_to_file':
            target = c.get('args', {}).get('TargetFile', '').strip('"\'')
            if target.endswith('index.html'):
                print('Wrote index.html in step', data.get('step_index'))
                with open('index_backup.html', 'w', encoding='utf-8') as out:
                    content = c.get('args', {}).get('CodeContent', '')
                    if content.startswith('"') and content.endswith('"'):
                        content = json.loads(content)
                    out.write(content)
