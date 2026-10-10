"""Verify fixtures against the original code extracted directly from the supplied DOCX."""
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET
import json
import numpy as np

root = Path(__file__).resolve().parents[1]
source = Path('/Users/rudrapratapsingh/Downloads/supply-chain-ai-3-prototypes.docx')
with ZipFile(source) as doc:
    tree = ET.fromstring(doc.read('word/document.xml'))
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
text = '\n'.join(''.join(t.text or '' for t in p.findall('.//w:t', ns)) for p in tree.findall('.//w:p', ns))
code = text.split('Project 1: Harvest-to-Market Routing Agent', 1)[1]
code = code[code.index('import numpy as np, pandas as pd'):code.index('Step 2: Build the plain logic')]
reference = {}
exec(compile(code, str(source), 'exec'), reference)
actual = json.loads((root / 'data/world.json').read_text())
assert reference['lots'].to_dict('records') == actual['lots']
for market in reference['prices'].columns:
    np.testing.assert_array_equal(reference['prices'][market].to_numpy(), actual['prices'][market])
assert reference['weather'].to_dict('records') == actual['weather']
assert reference['storage'].to_dict('records') == actual['storage']
print('PASS: independent DOCX reference equals fixtures exactly: all lots, prices, weather and storage.')
