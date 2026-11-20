from pathlib import Path
import xml.etree.ElementTree as E
import html
p=Path(__file__).parent
replacements={
'Borrador del 16/10/2026 · Ninguna decisión del circuito está validada':'Actualizado 17/10/2026 · Remito sin numeración y carga por rango confirmados; resto en propuesta',
'Subir el documento. Revisar proveedor, número, fecha, destinatario, cantidad y EID. Confirmar que el formato real permite leerlos.':'Confirmado por Pablo: el remito dice caravanas, sin numeración. Subirlo y registrar sus datos. Ingresar manualmente el rango desde–hasta, no una por una.',
'Relacionar EID con remito y destinatario propuesto. Todavía no crear animales. Guardar el origen documental y detectar duplicados.':'Propuesta: vincular rango manual, remito y cliente. No crear animales. Pendiente: confirmar si el rango es EID o caravana visual antes del cruce automático.',
'Normalizar EID y buscar animal existente, dispositivo registrado y remito. El destinatario de compra no prueba ubicación actual.':'Cruzar el EID del CSV con animales existentes. El vínculo al rango de compra requiere saber si es EID o visual y su correspondencia. No inferir la ubicación actual.',
'¿El remito detalla EID individuales o rangos? ¿Incluye su vínculo visual?':'¿El rango manual es EID o visual? ¿De dónde se obtiene y cómo se vincula con el EID?',
'Estado: propuesta de trabajo, sujeta a revisión y aprobación de Pablo.':'Confirmado: remito sin numeración; carga manual desde–hasta. Pendiente: tipo de identificador. Resto en propuesta.'
}
src=(p/'propuesta_caravanas.py').read_text(encoding='utf-8').split('\nd=Document();')[0]
for old,new in replacements.items():
 assert old in src,old
 src=src.replace(old,new)
exec(compile(src,str(p/'propuesta_caravanas.py'),'exec'),{'__file__':str(p/'propuesta_caravanas.py')})
t=E.parse(p/'drive_current.drawio');root=t.getroot()
cells={c.get('id'):c for c in root.findall('.//mxCell')}
def setv(id,title,body):cells[id].set('value','<b>'+html.escape(title)+'</b><br><br>'+html.escape(body).replace('\n','<br>'))
setv('title','PROPUESTA PARA DISCUTIR CON PABLO','Alta de caravanas e historial desde Gallagher\nActualizado 17/10/2026 · Confirmado: remito sin numeración y carga manual desde–hasta. Resto en propuesta.')
setv('step2','2  Remito y carga manual del rango',replacements['Subir el documento. Revisar proveedor, número, fecha, destinatario, cantidad y EID. Confirmar que el formato real permite leerlos.'])
setv('step3','3  Registro del rango propuesto',replacements['Relacionar EID con remito y destinatario propuesto. Todavía no crear animales. Guardar el origen documental y detectar duplicados.'])
setv('step6','6  Cruce por cada EID',replacements['Normalizar EID y buscar animal existente, dispositivo registrado y remito. El destinatario de compra no prueba ubicación actual.'])
v=cells['questions1'].get('value');v=v.replace('¿EID individuales o rangos y vínculo visual?','¿El rango manual es EID o visual? ¿De dónde se obtiene y cómo se vincula con el EID?');cells['questions1'].set('value',v)
setv('scope','Alcance inicial sugerido','Revisar remito + carga manual desde–hasta + CSV con un caso real. Confirmar el tipo de identificador antes de cruzar el rango. Resto sujeto a revisión con Pablo.')
dest=p/'propuesta_flujo_caravanas_pablo_actualizado.drawio';t.write(dest,encoding='utf-8',xml_declaration=True)
check=E.parse(dest)
assert len(check.findall('.//mxCell'))==len(cells)
assert len(check.findall('.//mxCell[@edge="1"]'))==9
print('PNG actualizado y Draw.io validado; estructura y conexiones conservadas.')
