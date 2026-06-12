import os

files_to_fix = [
    'public/login.html',
    'public/register.html',
    'public/cart.html',
    'public/checkout.html',
    'public/product.html',
    'public/index.html'
]

replacements = {
    '#090a0f': 'var(--bg-base)',
    '#151722': 'var(--bg-surface)',
    '#0f111a': 'var(--bg-raised)',
    '#11141d': 'var(--bg-surface)',
    '#1e2436': 'var(--border)',
    '#1e293b': 'var(--border)',
    'color: #fff': 'color: var(--text)',
    'color:#fff': 'color:var(--text)',
    '#8b9bb4': 'var(--text-2)',
    'rgba(255, 255, 255, 0.05)': 'var(--border)',
    'rgba(255, 255, 255, 0.08)': 'var(--border)',
    'rgba(255,255,255,0.05)': 'var(--border)',
    'rgba(255,255,255,0.1)': 'var(--border)',
    'background: #000': 'background: var(--bg-surface)',
    'background: #fff': 'background: var(--bg-raised)',
    'color: #000': 'color: var(--text)',
    'color: #333': 'color: var(--text)',
    '#f8f9fa': 'var(--bg-hover)',
    '#f0f0f0': 'var(--bg-hover)',
    'radial-gradient(circle at top, #141624 0%, var(--bg-base) 60%)': 'var(--bg-base)',
    'radial-gradient(circle at top, #141624 0%, #090a0f 60%)': 'var(--bg-base)',
    '#0b0d13': 'var(--bg-raised)',
}

for filepath in files_to_fix:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        for old, new in replacements.items():
            content = content.replace(old, new)
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Fixed {filepath}')
