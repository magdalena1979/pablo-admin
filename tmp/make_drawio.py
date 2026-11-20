import ast, html
from pathlib import Path
import xml.etree.ElementTree as E
p=Path(__file__).parent
tree=ast.parse((p/'propuesta_caravanas.py').read_text(encoding='utf-8'))
data={}
for n in tree.body:
 if isinstance(n,ast.Assign) and isinstance(n.targets[0],ast.Name) and n.targets[0].id in ['leftboxes','rightboxes']:
  data[n.targets[0].id]=ast.literal_eval(n.value)
mx=E.Element('mxfile',host='app.diagrams.net',type='device')
dia=E.SubElement(mx,'diagram',id='propuesta-pablo',name='Propuesta para Pablo')
model=E.SubElement(dia,'mxGraphModel',dx='1400',dy='1800',grid='1',gridSize='10',page='1',pageWidth='1500',pageHeight='2100',pageScale='1')
root=E.SubElement(model,'root');E.SubElement(root,'mxCell',id='0');E.SubElement(root,'mxCell',id='1',parent='0')
def node(i,x,y,w,h,title,body='',fill='#FFFFFF',text=False):
 value='<b>'+html.escape(title)+'</b>'
 if body:value+='<br><br>'+html.escape(body).replace('\n','<br>')
 style=f'rounded=1;whiteSpace=wrap;html=1;fillColor={fill};strokeColor=#B8C8D6;fontColor=#263649;fontFamily=Arial;fontSize=18;align=left;verticalAlign=top;spacing=18;'
 if text:style+='strokeColor=none;fillColor=none;'
 c=E.SubElement(root,'mxCell',id=i,value=value,style=style,vertex='1',parent='1');E.SubElement(c,'mxGeometry',x=str(x),y=str(y),width=str(w),height=str(h),attrib={'as':'geometry'})
node('title',45,25,1400,150,'PROPUESTA PARA DISCUTIR CON PABLO','Alta de caravanas e historial desde Gallagher\nBorrador del 16/10/2026 · Ninguna decisión está validada',text=True)
for j,(title,body) in enumerate(data['leftboxes']+data['rightboxes']):
 x=45 if j<5 else 800;y=200+(j%5)*220
 node('step'+str(j+1),x,y,650,180,title,body)
for j in range(1,10):
 c=E.SubElement(root,'mxCell',id='edge'+str(j),edge='1',parent='1',source='step'+str(j),target='step'+str(j+1),style='edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#436B83;strokeWidth=3;endArrow=block;exitX=0.5;exitY=1;entryX=0.5;entryY=0;')
 g=E.SubElement(c,'mxGeometry',relative='1',attrib={'as':'geometry'})
 if j==5:
  c.set('style','edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#436B83;strokeWidth=3;endArrow=block;exitX=1;exitY=0.5;entryX=0;entryY=0.5;')
  arr=E.SubElement(g,'Array',attrib={'as':'points'})
  E.SubElement(arr,'mxPoint',x='745',y='1170');E.SubElement(arr,'mxPoint',x='745',y='290')
node('rules',45,1350,1405,150,'Reglas propuestas','Compra ≠ colocación ≠ lectura ≠ movimiento ≠ declaración SENASA.\nConservar UUID e historial ante reemplazos. No inferir fechas ni traslados desde nombres de archivos.','#EAF1F7')
node('questions1',45,1540,680,300,'Preguntas sobre la operación','¿Cómo vincular razón social, cliente, campo y RENSPA?\n¿EID individuales o rangos y vínculo visual?\n¿Compra para un destino o distribuye stock?\n¿Una sesión puede mezclar campos o clientes?','#FFF5E5')
node('questions2',770,1540,680,300,'Preguntas sobre eventos y responsables','¿Qué significa Nueva etiqu. y cómo acredita colocación?\n¿Cómo registra animales comprados y reemplazos?\n¿Quién confirma importaciones, movimientos y SENASA?\n¿Qué cuenta, carpeta y permisos de Drive usarían?','#FFF5E5')
node('scope',45,1880,1405,150,'Alcance inicial sugerido','Validar remito + CSV con un caso real; después conectar Drive.\nNo incluye automatizar declaraciones SENASA. Todo sujeto a revisión con Pablo.',text=True)
dest=p/'propuesta_flujo_caravanas_pablo.drawio'
E.ElementTree(mx).write(dest,encoding='utf-8',xml_declaration=True)
check=E.parse(dest);cells=check.findall('.//mxCell');ids={c.get('id') for c in cells}
assert len(ids)==len(cells)
assert len([c for c in cells if c.get('edge')=='1'])==9
for c in cells:
 if c.get('edge')=='1':assert c.get('source') in ids and c.get('target') in ids
print('Archivo drawio XML validado: 10 pasos editables, 9 conexiones y notas.')
