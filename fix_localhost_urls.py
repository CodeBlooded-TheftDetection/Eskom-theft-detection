import pathlib
import re
root = pathlib.Path('.')
pattern = re.compile(r"const\s+BASE_URL\s*=\s*['\"]http://localhost:3000['\"];?")
count = 0
for path in root.rglob('*.*'):
    if path.suffix.lower() in {'.js', '.html'}:
        text = path.read_text(encoding='utf-8')
        new_text = pattern.sub("const BASE_URL = '';", text)
        new_text = new_text.replace('fetch("http://localhost:3000/api/auth/login"', 'fetch("/api/auth/login"')
        new_text = new_text.replace("fetch('http://localhost:3000/api/auth/login'", "fetch('/api/auth/login'")
        if new_text != text:
            path.write_text(new_text, encoding='utf-8')
            count += 1
print(f'Updated {count} files')
