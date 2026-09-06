"""Integrity/source checks on the upstream-built ZIP; does NOT validate the native runtime."""
from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parent.parent
source=root/'repository/apps/demo/bundles/TheNightWindow'
built=source.with_suffix('.softn')
served=root/'repository/apps/softn-web/public/demos/TheNightWindow.softn'
manifest=json.loads((source/'manifest.json').read_text())
with zipfile.ZipFile(built) as z:
    assert z.testzip() is None
    assert len(z.namelist())==len(set(z.namelist()))
    expected=set(['manifest.json','permission.json']+manifest['files']['ui']+manifest['files']['logic']+manifest['files']['assets'])
    assert set(z.namelist())==expected, (set(z.namelist())-expected,expected-set(z.namelist()))
    for name in expected:
        if name=='manifest.json':
            assert json.loads(z.read(name))==manifest
        else:
            assert z.read(name)==(source/name).read_bytes(), name
    count=len(expected)
assert served.read_bytes()==built.read_bytes()
result={'kind':'Upstream-built archive integrity, not native validation','crc':'passed','sourceParity':'passed','servedParity':'passed','entries':count,'bytes':built.stat().st_size,'sha256':hashlib.sha256(built.read_bytes()).hexdigest()}
(root/'verification/bundle-results.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
