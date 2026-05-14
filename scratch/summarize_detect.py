import json
from pathlib import Path
detect_path = Path('graphify-out/.graphify_detect.json')
if not detect_path.exists():
    print("Detection file missing")
    exit(1)
d = json.loads(detect_path.read_text())
print(f"Corpus: {d.get('total_files', 0)} files")
for cat, files in d.get('files', {}).items():
    if files:
        print(f"  {cat}: {len(files)} files")
