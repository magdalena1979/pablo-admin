from pathlib import Path
import re,json
rows=[]
for p in sorted(Path('src/features').rglob('*Page.tsx')):
 s=p.read_text(encoding='utf-8-sig')
 rows.append({'page':p.as_posix(),'exports':re.findall(r'export function\s+(\w+)',s),'headings':re.findall(r'<h[12][^>]*>([^<{]+)',s)[:5],'tables':s.count('<table'),'dialogs':s.count('dialog-backdrop')})
print(json.dumps(rows,ensure_ascii=False,indent=2))
