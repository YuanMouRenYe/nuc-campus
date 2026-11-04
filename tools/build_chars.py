"""Build character atlas from CC0 'Top down player sprite sheet (Julia)' by ArlanTR (OpenGameArt).
Crops frames to 32x36 and creates palette-swapped student variants (derivatives of CC0 art)."""
from PIL import Image
import os, json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J=os.path.join(ROOT,'assets_src/julia/Sprite-Sheets-Julia/Julia_walk_%s_64x64.png')
FW,FH=32,36; OX,OY=15,13
dirs=['Foward','Up','Left','Rigth']
HAIR=[(95,53,32),(136,70,37),(66,33,16)]
SKIN=[(152,85,44),(123,70,38),(109,57,24),(105,50,17)]
SHIRT=[(204,173,27),(173,120,20),(226,210,41)]
PANTS=[(56,73,111),(32,45,74)]
def shade(c,k): return tuple(max(0,min(255,int(v*k))) for v in c)
V=[ # hair, skin, shirt, pants
 dict(name='player',hair=(38,34,40),skin=(236,184,142),shirt=(52,104,178),pants=(48,52,64)),
 dict(name='julia',hair=None,skin=None,shirt=None,pants=None),
 dict(name='s1',hair=(30,28,32),skin=(240,196,160),shirt=(214,82,70),pants=(56,73,111)),
 dict(name='s2',hair=(62,40,30),skin=(226,176,136),shirt=(240,240,232),pants=(40,44,56)),
 dict(name='s3',hair=(28,26,30),skin=(232,186,150),shirt=(96,160,96),pants=(70,62,54)),
 dict(name='s4',hair=(44,36,36),skin=(244,200,166),shirt=(232,160,190),pants=(56,73,111)),
 dict(name='s5',hair=(26,24,28),skin=(222,170,128),shirt=(70,70,80),pants=(120,100,80)),
 dict(name='s6',hair=(90,60,40),skin=(236,190,150),shirt=(230,200,90),pants=(40,60,100)),
]
def mk(base3, newbase):
  # map 3 shades proportional to brightness of first
  if newbase is None: return {}
  b=sum(base3[0])/3 or 1
  return {c: shade(newbase, (sum(c)/3)/b) for c in base3}
sheet=Image.new('RGBA',(FW*4,FH*4*len(V)),(0,0,0,0))
for vi,v in enumerate(V):
  m={}
  m.update(mk(HAIR,v['hair'])); m.update(mk(SKIN,v['skin'])); m.update(mk(SHIRT,v['shirt'])); m.update(mk(PANTS,v['pants']))
  for di,d in enumerate(dirs):
    im=Image.open(J%d).convert('RGBA')
    for i in range(4):
      f=im.crop((i*64+OX,OY,i*64+OX+FW,OY+FH))
      px=f.load()
      for y in range(FH):
        for x in range(FW):
          p=px[x,y]
          if p[3] and p[:3] in m: px[x,y]=m[p[:3]]+(p[3],)
      sheet.paste(f,(i*FW,(vi*4+di)*FH))
out=os.path.join(ROOT,'game/assets/chars/students.png'); sheet.save(out)
json.dump(dict(fw=FW,fh=FH,dirs=['down','up','left','right'],frames=4,variants=[v['name'] for v in V],footX=16,footY=34),open(out.replace('.png','.json'),'w'))
prev=Image.new('RGBA',sheet.size,(150,190,120,255)); prev.alpha_composite(sheet); prev.resize((sheet.width*3,sheet.height*3),Image.NEAREST).save(os.path.join(ROOT,'assets_src/students_prev.png'))
print(sheet.size)
