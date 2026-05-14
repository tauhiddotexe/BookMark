import json
from pathlib import Path

# Load new AST
ast = json.loads(Path('graphify-out/.graphify_ast.json').read_text())

# Load existing graph to get semantic nodes/edges
existing_path = Path('graphify-out/graph.json')
if existing_path.exists():
    g = json.loads(existing_path.read_text())
    # Extract nodes that are NOT from AST (semantic nodes)
    # Note: extraction_type might be in metadata
    sem_nodes = [n for n in g.get('nodes', []) if n.get('metadata', {}).get('extraction_type') != 'ast']
    # We also need edges that are not AST edges. 
    # AST edges are usually imports, calls, etc.
    sem_edges = [e for e in g.get('links', []) if e.get('metadata', {}).get('extraction_type') != 'ast']
    # Note: graph.json uses 'links' instead of 'edges' sometimes depending on format.
    # Actually, graphify's graph.json format: nodes, links.
else:
    sem_nodes, sem_edges = [], []

# Merge
seen_ids = {n['id'] for n in ast['nodes']}
merged_nodes = list(ast['nodes'])
for n in sem_nodes:
    if n['id'] not in seen_ids:
        merged_nodes.append(n)
        seen_ids.add(n['id'])

# Edges
# Convert 'links' to 'edges' format if needed for .graphify_extract.json
merged_edges = ast['edges'] + sem_edges

merged = {
    'nodes': merged_nodes,
    'edges': merged_edges,
    'hyperedges': [], # We'll skip hyperedges for now or load from graph if available
    'input_tokens': 0,
    'output_tokens': 0,
}

with open('graphify-out/.graphify_extract.json', 'w') as f:
    json.dump(merged, f, indent=2)

print(f'Merged: {len(merged_nodes)} nodes ({len(ast["nodes"])} AST + {len(sem_nodes)} semantic)')
