import json
from PIL import Image, ImageDraw
m=json.load(open('game/data/map.json')); g=Image.open('game/data/ground.png')
PAL=[(120,140,100),(126,180,84),(70,120,60),(150,170,100),(110,110,120),(210,200,170),(225,215,190),(70,130,200),(80,170,80),(190,90,70),(70,140,160),(150,150,150),(120,100,90),(190,160,110),(170,150,140),(200,195,180),(220,120,160),(120,110,100),(60,60,60),(180,180,160),(220,210,150),(50,100,50)]
p=[]
for c in PAL: p+=c
p+= [0]*(768-len(p))
g2=g.copy(); g2.putpalette(p); im=g2.convert('RGB'); im=im.resize((m['meta']['w']*2,m['meta']['h']*2))
d=ImageDraw.Draw(im)
for t in m['trees'][::1]: d.point((t[0]*2,t[1]*2),fill=(20,70,20))
for b in m['buildings']:
  d.polygon([(x*2,y*2) for x,y in b['poly']],fill=tuple(b.get('rc',[200,0,0])),outline=(255,0,0) if not b.get('approx') else (0,255,255))
s=m['spawn'];d.ellipse([s[0]*2-4,s[1]*2-4,s[0]*2+4,s[1]*2+4],fill=(255,0,255))
for po in m['pois']: d.ellipse([po['x']*2-3,po['y']*2-3,po['x']*2+3,po['y']*2+3],fill=(255,255,0))
im.save('data/map_preview2.png'); print(im.size)
