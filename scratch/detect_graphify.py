import json, os
from graphify.detect import detect
from pathlib import Path

def filter_files(detect_result, ignore_folder):
    new_files = {}
    total_files = 0
    total_words = 0
    for category, file_list in detect_result.get('files', {}).items():
        filtered = [f for f in file_list if not f.startswith(ignore_folder)]
        new_files[category] = filtered
        total_files += len(filtered)
        # Word count is harder to re-calc without re-reading, but we can approximate or just leave it.
    detect_result['files'] = new_files
    detect_result['total_files'] = total_files
    return detect_result

result = detect(Path('.'))
result = filter_files(result, 'my-skills')
with open('graphify-out/.graphify_detect.json', 'w') as f:
    json.dump(result, f)
print("Detection complete")
