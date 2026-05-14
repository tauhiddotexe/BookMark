import json
from pathlib import Path
from graphify.build import build_from_json
from graphify.analyze import suggest_questions
from graphify.report import generate

extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text())
detection  = json.loads(Path('graphify-out/.graphify_detect.json').read_text())
analysis   = json.loads(Path('graphify-out/.graphify_analysis.json').read_text())

G = build_from_json(extraction)
communities = {int(k): v for k, v in analysis['communities'].items()}
cohesion = {int(k): v for k, v in analysis['cohesion'].items()}

labels = {
    0: "Core Services and Data Fetching",
    1: "Account and Authentication API",
    2: "Admin Models and Views",
    3: "Scraping and Data Ingestion",
    4: "Frontend UI and Social Login",
    5: "Context and Compression Utils",
    6: "Prompt Engineering and Generation",
    7: "Reddit and Social Media Deduplication",
    8: "Document and Metadata Management",
}
# Fill the rest with default names
for cid in communities:
    if cid not in labels:
        labels[cid] = f"Community {cid}"

questions = suggest_questions(G, communities, labels)
report = generate(G, communities, cohesion, labels, analysis['gods'], analysis['surprises'], detection, {'input':0, 'output':0}, '.', suggested_questions=questions)

with open('graphify-out/GRAPH_REPORT.md', 'w', encoding='utf-8') as f:
    f.write(report)
with open('graphify-out/.graphify_labels.json', 'w', encoding='utf-8') as f:
    json.dump({str(k): v for k, v in labels.items()}, f)

print("Report updated with community labels")
