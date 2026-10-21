"""Compare every stored mesh, and optional live renderer capture, to the source export."""
import argparse
import hashlib
import json
import math
import struct
import zipfile
from collections import defaultdict
from itertools import product
from pathlib import Path


def verify(source, project, rendered=None):
    export=json.loads(Path(source).read_text())
    with zipfile.ZipFile(project) as archive:
        assert archive.testzip() is None
        doc=json.loads(archive.read('project.json'))
        nodes={n['nodeId']:n for n in doc['states'][0]['nodes']}
        assets={a['id']:a for a in doc['assets']}
        max_error=0; checked=0
        def walk(id, offset=(0,0,0)):
            nonlocal checked,max_error
            n=nodes[id];d=n['definition'];origin=tuple(offset[i]+d[k] for i,k in enumerate(('x','elevation','z')))
            if n.get('importedMesh'):
                ref=n['importedMesh'];asset=assets[ref['meshAssetId']];blob=archive.read(asset['path'])
                assert hashlib.sha256(blob).hexdigest()==asset['sha256']
                size,normals=struct.unpack_from('<II',blob,8)
                values=struct.unpack_from('<'+'d'*(size+normals),blob,16)
                expected=export['meshes'][n['objectId']]
                assert size==len(expected['positions'])
                assert normals==len(expected.get('normals') or [])
                for i in range(0,size,3):
                    x,y,z=expected['positions'][i:i+3]
                    max_error=max(max_error,*(abs(values[i+a]+origin[a]-v) for a,v in enumerate((x,z,-y))))
                checked+=1
            for child in n.get('groupedShapeNodeIds',[]):walk(child,origin)
        for id in doc['states'][0]['rootNodeIds']:walk(id)
        assert checked==len(export['meshes']),(checked,len(export['meshes']))
        assert max_error<.001,max_error
        report={'storedMeshesChecked':checked,'maximumStoredVertexErrorMm':max_error,'nodes':len(nodes)}
    if rendered:
        actual=json.loads(Path(rendered).read_text());max_live=0
        for m in actual:
            expected=export['meshes'][m['id']]['positions'];values=m['positions']
            assert len(expected)==len(values),(m['id'],len(expected),len(values))
            # Layerling may reorder triangles when preparing a mesh. Compare both
            # vertex sets spatially, rather than relying on triangle storage order.
            source_points=[(expected[i],expected[i+2],-expected[i+1]) for i in range(0,len(expected),3)]
            actual_points=[tuple(values[i:i+3]) for i in range(0,len(values),3)]
            def distance(a,b):
                cells=defaultdict(list)
                def cell(p):return tuple(math.floor(v/.002) for v in p)
                for point in set(b):cells[cell(point)].append(point)
                maximum=0
                for point in set(a):
                    key=cell(point)
                    candidates=[q for delta in product((-1,0,1),repeat=3) for q in cells.get(tuple(key[i]+delta[i] for i in range(3)),())]
                    if not candidates:raise AssertionError((m['id'],'unmatched rendered vertex',point))
                    maximum=max(maximum,min(math.dist(point,q) for q in candidates))
                return maximum
            max_live=max(max_live,distance(source_points,actual_points),distance(actual_points,source_points))
        assert max_live<.002,max_live
        report.update(renderedSurfacesChecked=len(actual),maximumRenderedVertexErrorMm=max_live)
    return report


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('project');p.add_argument('--rendered');args=p.parse_args()
    report=verify(args.source,args.project,args.rendered)
    print(json.dumps(report,indent=2))
