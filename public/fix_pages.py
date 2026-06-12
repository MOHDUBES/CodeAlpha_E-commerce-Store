import os, re

files = [f for f in os.listdir('.') if f.endswith('.html') and f not in ('index.html','cart.html','wishlist.html')]
theme_script = """  <script>
    if (localStorage.getItem('sv_design_v') !== '3') {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('sv_design_v', '3');
    }
    const _t = localStorage.getItem('theme') || 'dark';
    if (_t !== 'dark') document.documentElement.setAttribute('data-theme', 'light');
  </script>"""

for fname in files:
    with open(fname, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Update CSS version using simple string replace
    for old_v in ['style.css"', 'style.css?v=1"', 'style.css?v=2"', 'style.css?v=3"',
                  'style.css?v=4"', 'style.css?v=5"', 'style.css?v=6"', 'style.css?v=7"',
                  'style.css?v=8"', 'style.css?v=10"', 'style.css?v=20"', 'style.css?v=30"',
                  'style.css?v=31"']:
        content = content.replace('/css/' + old_v, '/css/style.css?v=40"')
    
    # Update JS version
    for old_v in ['main.js"', 'main.js?v=1"', 'main.js?v=2"', 'main.js?v=3"',
                  'main.js?v=4"', 'main.js?v=5"', 'main.js?v=6"', 'main.js?v=7"',
                  'main.js?v=8"', 'main.js?v=10"', 'main.js?v=12"', 'main.js?v=14"']:
        content = content.replace('/js/' + old_v, '/js/main.js?v=15"')
    
    # Add theme script if not there
    if 'sv_design_v' not in content and 'style.css' in content:
        content = content.replace('</head>', theme_script + '\n</head>', 1)
    
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Updated: {fname}')

print('Done!')
