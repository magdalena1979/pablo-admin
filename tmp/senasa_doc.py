from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from pathlib import Path

out=Path(__file__).parent
d=Document()
s=d.sections[0]; s.page_width=Inches(8.5); s.page_height=Inches(11)
s.top_margin=s.bottom_margin=Inches(.75)
s.left_margin=s.right_margin=Inches(.8)
for name in ['Normal','Title','Heading 1','Heading 2']:
 st=d.styles[name]; st.font.name='Arial'; st.font.color.rgb=RGBColor(0,0,0)
d.styles['Normal'].font.size=Pt(11)
d.styles['Normal'].paragraph_format.space_after=Pt(7)
d.styles['Title'].font.size=Pt(23)
d.styles['Heading 1'].font.size=Pt(15)
def p(t): d.add_paragraph(t)
def h(t): d.add_heading(t,1)
def link(label,url):
 para=d.add_paragraph(); hyp=OxmlElement('w:hyperlink'); hyp.set(qn('r:id'),para.part.relate_to(url,'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',is_external=True))
 r=OxmlElement('w:r'); pr=OxmlElement('w:rPr'); col=OxmlElement('w:color');col.set(qn('w:val'),'1155CC');pr.append(col);r.append(pr);txt=OxmlElement('w:t');txt.text=label;r.append(txt);hyp.append(r);para._p.append(hyp)

d.add_heading('SENASA e identificación de caravanas',0)
p('Proyecto Pablo · Guía de funcionamiento y criterios para el sistema · 16 de octubre de 2026')
p('Comprar una caravana, colocarla en un animal, declarar su aplicación y registrar un movimiento son hechos distintos. Esta guía explica el circuito oficial y lo relaciona con el alta en nuestro sistema. Las propuestas de producto requieren validación con Pablo; no describen funciones ya implementadas ni acreditan trámites realizados.')
h('Los sistemas y documentos')
p('RENSPA identifica la relación del productor con su actividad y predio. SIGSA es el sistema oficial para existencias, novedades, identificación y movimientos. SIGBIOTraza es la aplicación móvil que permite capturar identificadores y remitir información a SIGSA. El DT-e ampara el traslado de animales; la TRI detalla las identificaciones individuales de una tropa. [1, 2]')
h('Antes de identificar')
p('Los terneros pueden estar declarados como existencias antes de tener identificación individual. Para declarar dispositivos, debe existir un antecedente de esas existencias, como una novedad de nacimiento o un acta de vacunación antiaftosa. El manual contempla además la reinscripción anual para determinados RENSPA de zona libre sin vacunación. [2, 4]')
h('Compra y colocación')
p('El proveedor debe registrar en SIGSA la cantidad, el tipo y el rango de numeración de dispositivos adquiridos asociados al RENSPA del productor. Una compra no demuestra que los dispositivos ya estén colocados. Debe verificarse para qué productor y RENSPA compra Pablo. [3, art. 6]')
p('El régimen electrónico prevé identificar terneros y terneras al destete o antes del primer movimiento desde el 1 de enero de 2026. El esquema general combina tarjeta visual y dispositivo electrónico. SENASA contempla la continuidad de animales identificados con CUIG antes de 2026 y la incorporación voluntaria de otras categorías; no corresponde interpretar la regla como recaravaneo automático de todo el rodeo adulto. [2, 3]')

d.add_page_break()
h('Declaración de la aplicación en SIGSA')
p('Una vez colocados, la declaración debe realizarse dentro de diez días hábiles, mediante oficina local, autogestión o el circuito de SIGBIOTraza. Se vincula cada identificador con sexo, raza y fecha de nacimiento o mes y año. Las obligaciones de confección y archivo de planillas dependen de la modalidad; la resolución exceptúa su confección cuando se utiliza la app oficial. [3, art. 8]')
p('El recorrido del manual es Existencias → Dispositivos de identificación → Nueva declaración. Se selecciona RENSPA, fecha física de aplicación y antecedente de existencias. Luego se incorporan dispositivos y datos, se revisan y se confirma con Declarar. [4]')
p('Los datos pueden provenir de lotes enviados por SIGBIOTraza o de un archivo TXT. El formato documentado combina DISPOSITIVO-SEXO-RAZA-FECHA DE NACIMIENTO, separando animales con punto y coma. Los códigos y el formato deben validarse antes de preparar un exportador. Capturar o enviar lecturas no equivale por sí solo a confirmar la declaración. [4]')
h('Movimientos y recepción')
p('El origen gestiona el DT-e. Puede confeccionar una TRI con los identificadores de la tropa y asociarla al documento; en el circuito de terneros descrito por el manual es opcional. El destino confirma los animales efectivamente recibidos y sus dispositivos mediante la TRI o la lectura en destino. [5]')
p('El manual indica que los dispositivos electrónicos deben estar declarados como aplicados en el RENSPA de origen para permitir el cierre del DT-e. Las reglas de recepción contemplan tropas mixtas con identificaciones anteriores y requisitos particulares para establecimientos habilitados para Unión Europea. Un cambio interno de rodeo o potrero debe distinguirse de un traslado documentado oficialmente. [2, 5]')
h('Pérdidas y reemplazos')
p('Si se pierde el componente electrónico, la normativa contempla sustituir el binomio y registrar la reidentificación. SIGSA permite asociar identificación anterior con nueva cuando se conoce la anterior. La pérdida total tiene efectos sobre la condición de trazabilidad; no debe reconstruirse un vínculo por semejanza de números. En nuestro sistema, el animal debe conservar su UUID e historial aunque cambie de EID. [3, art. 11; 4]')
h('Actualización publicada el 16 de octubre de 2026')
p('La comunicación oficial sobre la Resolución 898/2026 amplía el circuito mediante entes sanitarios, habilitando comercialización y servicios de colocación y lectura. Los datos se remiten a SIGSA para verificación y confirmación del productor o autorizado. No sabemos si Pablo utiliza esta modalidad. [6]')

d.add_page_break()
h('Aplicación al proyecto Pablo')
p('Propuesta para validar: registrar por separado la disponibilidad de caravanas, la colocación confirmada, el estado de la declaración oficial y los movimientos documentados. Mantener evidencia y procedencia de cada dato. Una declaración cuyo estado se desconoce no debe etiquetarse automáticamente como pendiente o incumplida.')
p('Conservar fechas independientes de nacimiento, identificación, lectura, declaración, movimiento e ingreso al sistema. Admitir nacimiento conocido solo por mes y año, sin inventar un día. Mantener el UUID del animal separado de sus identificadores y conservar historial de reemplazos.')
p('Los 21 CSV de Gallagher revisados contienen 1.835 registros y 1.070 EID distintos normalizados, con lecturas entre abril y octubre de 2025. Aportan observaciones históricas, pero no contienen constancias de declaración SENASA. La nota Nueva etiqu. requiere aclaración: puede reflejar incorporación a Gallagher y no necesariamente colocación física. Estos registros preceden al régimen obligatorio de 2026. [7]')
h('Qué necesitamos confirmar con Pablo')
for t in ['Para qué productor y RENSPA compra las caravanas y qué factura, remito, planilla o archivo recibe.', 'Qué significa Nueva etiqu. en Gallagher y cómo registra fecha de colocación y vínculo visual con EID.', 'Quién realiza la declaración oficial, por qué modalidad y qué constancia o consulta conserva.', 'Cómo registra pérdidas y el vínculo entre identificador anterior y nuevo.']:
 d.add_paragraph(t,style='List Bullet')
h('Fuentes oficiales y archivos de referencia')
sources=[
('1 Descripción de SIGSA','https://www.argentina.gob.ar/senasa/mesa-de-ayuda-sistema-integrado-de-gestion-de-sanidad-animal-sigsa'),
('2 Sistema de identificación electrónica y preguntas frecuentes','https://www.argentina.gob.ar/senasa/sistema-de-identificacion-electronica-de-animales'),
('3 Resolución SENASA 841 de 2025','https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-841-2025-419696/texto'),
('4 Manual de declaración y reidentificación en SIGSA','https://www.argentina.gob.ar/sites/default/files/2026/01/declaracion_de_dispositivos_de_identificacion_electronicos_en_sigsa_.pdf'),
('5 Manual de dispositivos asociados al DT-e y TRI','https://www.argentina.gob.ar/sites/default/files/2026/01/declaracion_de_dispositivos_de_identificacion_electronicos_al_cierre_del_dt-e.pdf'),
('6 Comunicación oficial sobre Resolución 898 de 2026','https://www.argentina.gob.ar/noticias/se-amplia-la-libertad-para-comercializar-dispositivos-de-identificacion-electronica-animal'),
('7 CSV de Gallagher analizados en Drive','https://drive.google.com/drive/folders/1MwNFGhoj9VsOdVtLZPtX6DvoEILkWrv1')]
for label,url in sources:link(label,url)
d.save(out/'senasa_pablo.docx')
print(out/'senasa_pablo.docx')
