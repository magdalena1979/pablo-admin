from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import textwrap

out=Path(__file__).parent
W,H=2400,3400
im=Image.new('RGB',(W,H),'#F4F7FA'); dr=ImageDraw.Draw(im)
fonts=Path('C:/Windows/Fonts')
def font(n,b=False): return ImageFont.truetype(str(fonts/('arialbd.ttf' if b else 'arial.ttf')),n)
def txt(x,y,t,size=30,color='#263649',bold=False,width=95):
 f=font(size,bold); yy=y
 for line in t.split('\n'):
  words=line.split(); current=''
  for word in words:
   trial=(current+' '+word).strip()
   if dr.textlength(trial,font=f)>width and current:
    dr.text((x,yy),current,font=f,fill=color);yy+=size+10;current=word
   else:current=trial
  dr.text((x,yy),current,font=f,fill=color);yy+=size+10
 return yy
def box(x,y,w,h,title,body,fill='#FFFFFF',edge='#CAD5DF'):
 dr.rounded_rectangle((x,y,x+w,y+h),radius=22,fill=fill,outline=edge,width=3)
 yy=txt(x+28,y+22,title,34,bold=True,width=w-56)
 yy=txt(x+28,yy+12,body,29,width=w-56)
 assert yy<y+h-8,(title,yy,y+h)
def arrow(x1,y1,x2,y2,color='#436B83'):
 dr.line((x1,y1,x2,y2),fill=color,width=6)
 import math
 a=math.atan2(y2-y1,x2-x1)
 pts=[(x2,y2),(x2-20*math.cos(a-.5),y2-20*math.sin(a-.5)),(x2-20*math.cos(a+.5),y2-20*math.sin(a+.5))]
 dr.polygon(pts,fill=color)

txt(85,60,'PROPUESTA PARA DISCUTIR CON PABLO',48,bold=True,width=2200)
txt(85,130,'Alta de caravanas e historial desde Gallagher',43,width=2200)
txt(85,200,'Borrador del 16/10/2026 · Ninguna decisión del circuito está validada',30,color='#8D5613',width=2200)
left,right,bw=85,1275,1040
ys=[300,650,1000,1350,1700]
leftboxes=[
('1  Alta previa propuesta','Pablo registra cliente / razón social y sus establecimientos. Definir cómo se vinculan CUIT, campo y RENSPA.'),
('2  Recepción del remito','Subir el documento. Revisar proveedor, número, fecha, destinatario, cantidad y EID. Confirmar que el formato real permite leerlos.'),
('3  Dispositivos disponibles','Relacionar EID con remito y destinatario propuesto. Todavía no crear animales. Guardar el origen documental y detectar duplicados.'),
('4  Trabajo a campo y exportación','Pablo trabaja con Gallagher y exporta las sesiones CSV a una carpeta de Drive. Confirmar cómo identifica cliente y campo en cada sesión.'),
('5  Archivos para revisar','El sistema consulta la carpeta autorizada y prepara el análisis. Propuesta inicial: botón Revisar Drive. No importa automáticamente.')]
rightboxes=[
('6  Cruce por cada EID','Normalizar EID y buscar animal existente, dispositivo registrado y remito. El destinatario de compra no prueba ubicación actual.'),
('7  Revisión de excepciones','EID desconocido, otro campo o cliente, etiqueta incompatible y reemplazo: revisión humana. Duplicados y archivos vacíos se informan.'),
('8  Vista previa y confirmación','Mostrar cliente y campo propuestos, altas, lecturas, trabajos y conflictos. Confirmar contexto y datos antes de escribir en la base.'),
('9  Alta o vínculo e historial','Crear o vincular animal con UUID. Conservar EID y caravana visual, fecha de lectura, archivo, fila, remito y decisiones del usuario.'),
('10  Seguimiento y documentos','Vincular factura al remito sin duplicar stock. Movimientos y declaración SENASA se registran con confirmación o respaldo separados.')]
for y,(t,b) in zip(ys,leftboxes):box(left,y,bw,290,t,b)
for y,(t,b) in zip(ys,rightboxes):box(right,y,bw,290,t,b)
for x in (left+bw/2,right+bw/2):
 for y in ys[:-1]:arrow(x,y+290,x,y+350)
dr.line((left+bw,1845,1190,1845,1190,445,right,445),fill='#436B83',width=6);arrow(1210,445,right,445)
box(85,2080,2230,260,'Reglas propuestas para proteger la trazabilidad','Compra ≠ colocación ≠ lectura ≠ movimiento ≠ declaración SENASA.\nConservar la identidad del animal si cambia de caravana. No deducir fechas, traslados ni aplicaciones sanitarias desde el nombre del archivo.',fill='#EAF1F7')
box(85,2400,1090,600,'Preguntas sobre la operación real','¿Cómo se relacionan razón social, cliente, establecimiento y RENSPA?\n¿El remito detalla EID individuales o rangos? ¿Incluye su vínculo visual?\n¿Pablo compra para un destino concreto o distribuye stock entre campos?\n¿Una sesión Gallagher puede mezclar campos o clientes?',fill='#FFF5E5',edge='#E2BA78')
box(1225,2400,1090,600,'Preguntas sobre eventos y responsabilidades','¿Qué significa Nueva etiqu. y cómo acredita la colocación?\n¿Cómo registra animales comprados ya identificados y los reemplazos?\n¿Quién revisa importaciones y confirma movimientos y SENASA?\n¿Qué cuenta y carpeta de Drive se usarían y quién tendría acceso?',fill='#FFF5E5',edge='#E2BA78')
txt(85,3070,'Alcance inicial sugerido',35,bold=True,width=2200)
txt(85,3130,'Validar primero remito + CSV con un caso real. Reutilizar el importador existente; después conectar Drive. No incluye automatizar declaraciones ante SENASA.',31,width=2200)
txt(85,3290,'Estado: propuesta de trabajo, sujeta a revisión y aprobación de Pablo.',27,color='#617285',width=2200)
png=out/'flujo_propuesto_caravanas_pablo.png';im.save(png)

d=Document();s=d.sections[0];s.page_width=Inches(8.5);s.page_height=Inches(11)
s.top_margin=s.bottom_margin=Inches(.7);s.left_margin=s.right_margin=Inches(.8)
for name in ['Normal','Title','Heading 1']:
 st=d.styles[name];st.font.name='Arial';st.font.color.rgb=RGBColor(0,0,0)
d.styles['Normal'].font.size=Pt(11);d.styles['Normal'].paragraph_format.space_after=Pt(7)
d.styles['Title'].font.size=Pt(23);d.styles['Heading 1'].font.size=Pt(15)
def p(t):d.add_paragraph(t)
def h(t):d.add_heading(t,1)
def bullet(t):d.add_paragraph(t,style='List Bullet')
d.add_heading('Propuesta de alta de caravanas e historial ganadero',0)
p('Proyecto Pablo · Borrador para conversar con Pablo · 16 de octubre de 2026')
p('Estado del documento: ninguna decisión funcional está validada. Tanto el circuito como las responsabilidades y el alcance que siguen son propuestas. El objetivo es revisar un caso real con Pablo antes de implementar.')
h('Objetivo y punto de partida')
p('Proponemos vincular los EID de las caravanas con la documentación de entrega y utilizar las sesiones de Gallagher para construir el historial individual. Como paso previo sugerido, Pablo ingresaría al sistema y registraría las razones sociales de sus clientes y los establecimientos relacionados. Esta secuencia también debe discutirse con él.')
p('La razón social permitiría identificar al destinatario de facturas y remitos. Un establecimiento es el campo físico y no necesariamente coincide uno a uno con una razón social. Debemos definir con Pablo cómo se vinculan cliente, CUIT, establecimiento y RENSPA; no fijar esa relación por suposición.')
h('Estado actual revisado')
p('El repositorio local contiene clientes, establecimientos, animales con UUID, jornadas, eventos e importaciones Gallagher con vista previa y confirmación. Falta el circuito específico de dispositivos entregados y su documentación, así como una integración de Drive dentro de la aplicación. No se verificó el esquema activo de Supabase.')
h('Etapa 1 Alta previa y recepción de caravanas')
p('Pablo daría de alta los clientes o razones sociales y sus campos. Luego se cargaría el remito, revisando proveedor, número, fecha, destinatario, cantidad y EID. La propuesta parte de que el remito contiene los EID; aún necesitamos revisar un ejemplar y sus adjuntos para validar formato, rangos, integridad y vínculo con la identificación visual.')
p('Tras la revisión, los dispositivos quedarían asociados al remito y al destinatario inicial. Su carga no crearía animales ni confirmaría colocación. La factura podría vincularse posteriormente al remito sin volver a ingresar stock. Falta definir si una factura reúne varios remitos o si existen entregas y facturaciones parciales.')

d.add_page_break()
h('Etapa 2 Trabajo a campo y exportación a Drive')
p('Pablo utilizaría Gallagher y exportaría las sesiones a una carpeta de Drive acordada. Proponemos inicialmente una consulta manual desde la aplicación mediante Revisar archivos nuevos, con detección y preparación de datos sin escritura automática de registros ganaderos. La cuenta, permisos y organización de carpetas siguen pendientes.')
p('La conexión de Google Drive utilizada en esta conversación no implica que la aplicación ya tenga esa integración. Debe implementarse mediante autorización y acceso limitado al alcance acordado. El archivo original, su identificador de Drive, versión o hash, fecha de captura y resultado del procesamiento deberían quedar trazados.')
h('Etapa 3 Cruce y revisión por EID')
for t in [
'Animal existente: proponer incorporar observaciones conservando su UUID.',
'Dispositivo registrado sin animal: proponer alta individual, mostrando remito, cliente y campo sugeridos.',
'EID desconocido: dejar para revisión. Puede corresponder a una compra de hacienda ya identificada o a un histórico sin remito.',
'EID asociado a otro campo o cliente: revisar procedencia y contexto sin duplicar el animal ni cambiar ubicación o titularidad automáticamente.',
'Conflicto de caravana visual o posible reemplazo: no sobrescribir; exigir resolución explícita.',
'Archivo o evento repetido: evitar duplicados. Archivo vacío: informar sin crear eventos.'
]:bullet(t)
p('El cruce se realiza por fila. Un archivo puede contener varias procedencias; no se asigna todo por mayoría de coincidencias. El destinatario inicial de una caravana no demuestra propietario ni ubicación actual del animal. La revisión no debe revelar datos de otros clientes a usuarios sin autorización.')
h('Etapa 4 Confirmación e historial')
p('La vista previa mostraría cliente y establecimiento propuestos, animales nuevos y existentes, observaciones, trabajos detectados y conflictos. Solo la confirmación escribiría los registros. Cada dato conservaría origen, archivo, fila, fecha y decisión del usuario.')
p('Primera lectura, colocación física, nacimiento, ingreso al sistema, movimiento y declaración oficial son hechos diferentes. Nueva etiqu. no acreditaría automáticamente colocación. Una lectura no generaría un traslado ni consumiría automáticamente un dispositivo disponible. Los trabajos sanitarios exigirían interpretar sus códigos con Pablo.')
p('Los animales históricos podrían incorporarse con procedencia documental desconocida y revisión explícita. Un reemplazo conservaría el UUID y relacionaría identificador anterior y nuevo cuando exista evidencia. El estado SENASA desconocido no se presentaría como declaración pendiente o incumplida.')

d.add_page_break()
h('Preguntas para discutir antes de implementar')
questions=[
('Clientes y establecimientos','¿Quién se registra como cliente y razón social? ¿Una razón social administra varios campos o RENSPA? ¿Puede haber varios productores en un mismo campo? Recomendación: distinguir estas relaciones antes de fijar el modelo.'),
('Documentación de la entrega','¿Cómo aparecen los EID en el remito: lista o rangos? ¿Son consecutivos? ¿Qué adjuntos y correspondencia visual entrega la veterinaria? Recomendación: revisar un remito completo con su factura.'),
('Asignación de dispositivos','¿Las caravanas se compran para un destino definido o Pablo distribuye stock? ¿Cómo maneja devoluciones y dispositivos defectuosos? Recomendación: conservar asignaciones y cambios con historial.'),
('Contexto de Gallagher','¿Cada sesión corresponde a un campo? ¿Puede mezclar clientes? ¿Qué representa Nueva etiqu.? ¿Cómo se registran las aplicaciones y los códigos sanitarios? Recomendación: validar el significado de campos con una sesión real.'),
('Excepciones e historia','¿Cómo ingresan animales ya identificados? ¿Hay históricos sin remito? ¿Cómo se prueba un reemplazo? Recomendación: admitir revisión de excepciones sin inventar documentos o vínculos.'),
('Responsables y accesos','¿Quién carga remitos, revisa importaciones y confirma movimientos y trámites SENASA? ¿Qué cuenta y carpeta de Drive usarían? Recomendación: definir responsables y acceso por establecimiento.'),
('Facturas y remitos','¿Una factura puede cubrir varios remitos o una entrega facturarse parcialmente? ¿Quién debe ver costos? Recomendación: no asumir una relación uno a uno ni duplicar la recepción al cargar la factura.')]
for title,body in questions:
 p(title);p(body)
h('Orden de implementación sugerido')
p('Primero revisar con Pablo una entrega completa y la sesión donde utilizó algunas caravanas. Luego definir el vínculo cliente y campo, registrar dispositivos y probar el cruce mediante CSV manual. Después conectar Drive al mismo importador. La automatización de importaciones o declaraciones SENASA queda fuera del alcance inicial propuesto.')
p('Impacto previsto: reutilizar clientes, establecimientos, animales, jornadas e importaciones; extender dispositivos y documentación, historial de identificadores y captura desde Drive. Revisar identidad entre campos, reglas de duplicados y permisos antes de escribir migraciones.')

d.add_page_break()
h('Gráfico del circuito propuesto')
p('El diagrama resume la propuesta y sus preguntas. No representa un circuito aprobado ni funciones ya implementadas.')
d.add_picture(str(png),width=Inches(6.8))
d.save(out/'propuesta_circuito_caravanas_pablo.docx')
print(png);print(out/'propuesta_circuito_caravanas_pablo.docx')
