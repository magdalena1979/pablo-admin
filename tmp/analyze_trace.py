import json,csv,io,base64,collections
files=json.load(open('tmp/trace-csv-input.json',encoding='utf-8'))
allrows=[]; report=[]; values=collections.defaultdict(collections.Counter)
for f in files:
 text=base64.b64decode(f['b64']).decode('utf-8-sig')
 reader=csv.DictReader(io.StringIO(text)); rows=list(reader)
 for row in rows:
  for k,v in row.items():
   if v: values[k][v]+=1
  row['_file']=f['name'];row['_url']=f['url'];row['_eid']=''.join(row.get('ID electrónico',row.get('Electronic ID','')).split());allrows.append(row)
 report.append({'file':f['name'],'rows':len(rows),'headers':reader.fieldnames})
by=collections.defaultdict(list)
for r in allrows: by[r['_eid']].append(r)
repeated={k:v for k,v in by.items() if len(v)>1}
examples=sorted(repeated.items(),key=lambda kv:len(kv[1]),reverse=True)[:4]
print(json.dumps({'files':report,'total':len(allrows),'unique':len(by),'repeated':len(repeated),'date_range':sorted(set(r.get('Fecha',r.get('Date','')) for r in allrows)), 'values':{k:v.most_common(18) for k,v in values.items() if k not in ['ID electrónico','Número de etiqueta','Fecha','Time','Notas']},'examples':[{ 'eid':eid,'history':sorted(rows,key=lambda r:(r.get('Fecha',''),r.get('Time','')))} for eid,rows in examples], 'sanIgnacio':[{ 'eid':eid,'history':sorted(by[eid],key=lambda r:(r.get('Fecha',''),r.get('Time','')))} for eid in ['032010006501857','032010006501862']]},ensure_ascii=False,indent=2))
