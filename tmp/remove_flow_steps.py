from pathlib import Path
import xml.etree.ElementTree as E
import re,html
from PIL import Image,ImageDraw,ImageFont
p=Path(__file__).parent;t=E.parse(p/'flow_before_remove.drawio');root=t.find('.//root');cells={c.get('id'):c for c in root}
keep=[1,2,4,5,8,10]
for c in list(root):
 if c.get('edge')=='1' or c.get('id') in ['step3','step6','step7','step9']:root.remove(c)
for i,k in enumerate(keep):
 c=cells['step'+str(k)];v=c.get('value');v=re.sub(r'(<b>)\d+\s+',r'\g<1>'+str(i+1)+'  ',v);c.set('value',v)
 g=c.find('mxGeometry');g.set('x','45' if i<3 else '800');g.set('y',str(200+(i%3)*240));g.set('height','200')
for i in range(5):
 c=E.SubElement(root,'mxCell',id='newedge'+str(i),edge='1',parent='1',source='step'+str(keep[i]),target='step'+str(keep[i+1]),style='edgeStyle=orthogonalEdgeStyle;html=1;strokeColor=#436B83;strokeWidth=3;endArrow=block;exitX=0.5;exitY=1;entryX=0.5;entryY=0;')
 g=E.SubElement(c,'mxGeometry',relative='1',attrib={'as':'geometry'})
 if i==2:
  c.set('style','edgeStyle=orthogonalEdgeStyle;html=1;strokeColor=#436B83;strokeWidth=3;endArrow=block;exitX=1;exitY=0.5;entryX=0;entryY=0.5;');a=E.SubElement(g,'Array',attrib={'as':'points'});E.SubElement(a,'mxPoint',x='745',y='780');E.SubElement(a,'mxPoint',x='745',y='300')
for id,y in [('rules',960),('questions1',1150),('questions2',1150),('scope',1500)]:cells[id].find('mxGeometry').set('y',str(y))
t.find('.//mxGraphModel').set('pageHeight','1750')
dest=p/'flujo_caravanas_simplificado.drawio';t.write(dest,encoding='utf-8',xml_declaration=True)
assert len(t.findall('.//mxCell[@edge="1"]'))==5
assert all(t.find('.//mxCell[@id="step'+str(k)+'"]') is None for k in [3,6,7,9])
im=Image.new('RGB',(1800,2020),'#F4F7FA');dr=ImageDraw.Draw(im)
def f(n,b=False):return ImageFont.truetype('C:/Windows/Fonts/'+('arialbd.ttf' if b else 'arial.ttf'),n)
def text(x,y,s,w,n=23,b=False):
 for line in s.split('\n'):
  row=''
  for word in line.split():
   trial=(row+' '+word).strip()
   if dr.textlength(trial,font=f(n,b))>w and row:dr.text((x,y),row,font=f(n,b),fill='#263649');y+=n+8;row=word
   else:row=trial
  dr.text((x,y),row,font=f(n,b),fill='#263649');y+=n+8
 return y
text(55,30,'PROPUESTA PARA DISCUTIR CON PABLO',1650,36,True)
text(55,85,'Flujo simplificado · Actualizado 17/10/2026',1650,26)
text(55,130,'Confirmado: remito sin numeración y carga manual desde–hasta. Resto en propuesta.',1650,23)
for id in ['step'+str(k) for k in keep]+['rules','questions1','questions2','scope']:
 c=cells[id];g=c.find('mxGeometry');x=float(g.get('x'))*1.17;y=float(g.get('y'))*1.17;w=float(g.get('width'))*1.17;h=float(g.get('height'))*1.17
 fill='#FFF5E5' if id.startswith('questions') else '#EAF1F7' if id=='rules' else '#FFFFFF'
 dr.rounded_rectangle((x,y,x+w,y+h),radius=15,fill=fill,outline='#B8C8D6',width=2)
 value=c.get('value');parts=value.split('</b>',1);title=re.sub('<[^>]+>','',parts[0]);body=parts[1].replace('<br>','\n').strip()
 yy=text(x+20,y+17,html.unescape(title),w-40,25,True)
 yy=text(x+20,yy+8,html.unescape(re.sub('<[^>]+>','',body)),w-40,23)
 assert yy<y+h,(id,yy,y+h)
for x in [432,1316]:
 for y in [468,749]:
  dr.line((x,y,x,y+43),fill='#436B83',width=4);dr.polygon([(x,y+43),(x-8,y+30),(x+8,y+30)],fill='#436B83')
dr.line((813,913,872,913,872,351,936,351),fill='#436B83',width=4);dr.polygon([(936,351),(923,343),(923,359)],fill='#436B83')
im.save(p/'flujo_caravanas_simplificado.png')
print('6 pasos, 5 conexiones; PNG verificado sin texto fuera de cuadros.')
