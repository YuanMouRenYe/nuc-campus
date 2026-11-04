// Ported from the user's own project campus-walk v0.3.28 (art.js, MIT License, "Campus Walk contributors").
// Kept verbatim except: label() uses the Ark Pixel font. Used for 主楼 facade, 彭德怀 statue, 中北大学 gate stone, 德怀楼 facade.
(function(root){
function label(g,text,x,y,size=12,color='#405d43'){g.font=`${size}px "ArkPixel", "PingFang SC", "Microsoft YaHei", sans-serif`;g.fillStyle=color;g.textAlign='center';g.fillText(text,x,y);}
function rect(g,x,y,w,h,color){g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),w,h);}
function poly(g,points,color){g.fillStyle=color;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();}
function statue(g,position){const{x,y}=position;rect(g,x-60,y+7,126,13,'#78886955');rect(g,x-57,y-5,114,10,'#d8d6be');rect(g,x-52,y-15,104,10,'#eee6cf');rect(g,x-37,y-48,74,34,'#956854');rect(g,x-40,y-52,80,7,'#b98b68');rect(g,x-32,y-42,64,22,'#aa785c');label(g,'彭德怀',x,y-26,10,'#ead7ad');
// Original silhouette: uniformed rider, raised foreleg, dark bronze and red base checked against school photo.
const bronze='#55574b',lit='#777b65';rect(g,x-36,y-91,64,23,bronze);rect(g,x-30,y-96,50,10,lit);poly(g,[[x+17,y-89],[x+26,y-119],[x+40,y-124],[x+49,y-114],[x+44,y-103],[x+32,y-103],[x+29,y-80]],bronze);rect(g,x+37,y-126,4,8,bronze);rect(g,x+43,y-122,3,6,bronze);rect(g,x+42,y-113,2,2,'#d0b894');poly(g,[[x-33,y-80],[x-43,y-68],[x-43,y-54],[x-37,y-54],[x-36,y-68],[x-21,y-75]],bronze);rect(g,x-13,y-70,6,18,bronze);rect(g,x+19,y-72,6,20,bronze);poly(g,[[x+27,y-73],[x+40,y-64],[x+47,y-65],[x+47,y-70],[x+36,y-71],[x+31,y-82]],bronze);poly(g,[[x-35,y-90],[x-47,y-94],[x-52,y-83],[x-50,y-63],[x-46,y-60],[x-46,y-80]],bronze);
rect(g,x-10,y-125,20,29,bronze);rect(g,x-6,y-141,14,15,bronze);rect(g,x-9,y-143,21,5,bronze);rect(g,x-7,y-122,10,17,lit);poly(g,[[x+5,y-120],[x+20,y-113],[x+29,y-114],[x+29,y-109],[x+17,y-108],[x+2,y-113]],bronze);rect(g,x-6,y-98,8,27,bronze);rect(g,x-2,y-74,12,5,bronze);}
function dehuaiGate(g,position){g.save();g.translate(position.x-720,position.y-1000);rect(g,532,965,384,12,'#8d927955');rect(g,528,964,384,8,'#c5c6af');rect(g,538,955,364,9,'#dedec6');rect(g,548,946,344,9,'#eae6cf');poly(g,[[552,946],[554,917],[568,904],[851,904],[876,912],[887,946]],'#babcae');poly(g,[[559,916],[575,908],[846,908],[870,915],[880,941],[558,941]],'#d3d1bf');for(let i=0;i<30;i++){const x=563+i*10;poly(g,[[x,942],[x+7,930],[x+2,926],[x+11,913]],i%2?'#9ea89a':'#e6e1ce');}label(g,'中 北 大 学',720,935,23,'#a34e43');g.restore();}


function mainBuilding(g,o){const{x,y,w,h}=o;
rect(g,x+10,y+12,w,h,'#6e805a44');rect(g,x,y+20,w,h-20,'#ddd9c4');rect(g,x+w-12,y+20,12,h-20,'#b0b4a4');
rect(g,x+95,y-15,110,38,'#79918b');rect(g,x+90,y-22,120,8,'#76867d');for(let i=0;i<8;i++)rect(g,x+96+i*14,y-20,3,5,'#cbd3be');
label(g,'中 北',x+45,y+8,15,'#9c6555');label(g,'大 学',x+w-45,y+8,15,'#9c6555');rect(g,x-4,y+17,w+8,7,'#eeead4');
for(const off of [12,38,64,225,251,277]){rect(g,x+off,y+38,11,h-68,'#546d69');for(let row=0;row<6;row++)rect(g,x+off,y+44+row*25,11,3,'#9eafa0');}
rect(g,x+88,y+45,124,h-87,'#749a98');for(let row=0;row<5;row++){rect(g,x+88,y+54+row*25,124,3,'#cad2b9');rect(g,x+95,y+58+row*25,32,14,'#94b4a7');}for(const off of [126,166])rect(g,x+off,y+45,3,h-87,'#abc0ae');
rect(g,x+73,y+h-44,154,44,'#536d62');rect(g,x+61,y+h-48,178,9,'#efe9d2');for(let col=0;col<6;col++)rect(g,x+73+col*28,y+h-39,8,39,'#dddac1');rect(g,x+136,y+h-29,28,29,'#98b0a0');
for(let step=0;step<3;step++)rect(g,x-7-step*5,y+h+step*5,w+14+step*10,5,step%2?'#c4c9b1':'#d9dcc1');}

function dehuaiBuilding(g,o){const{x,y,w,h}=o;rect(g,x+12,y+22,w,h,'#71846144');rect(g,x-10,y+h,w+20,8,'#b6baa2');rect(g,x-18,y+h+8,w+36,7,'#d6d5b9');
// Pale flat-roofed wings and recessed central glazing observed in official photographs.
rect(g,x,y,w,h,'#dad9c6');rect(g,x-3,y-5,w+6,8,'#efead5');rect(g,x+186,y-20,88,h+20,'#c5c8b7');rect(g,x+191,y-25,78,8,'#e9e6d2');rect(g,x+203,y+2,54,h-30,'#485a57');
for(let row=0;row<7;row++){const wy=y+14+row*22;for(let col=0;col<6;col++){for(const off of [0,280]){const wx=x+10+off+col*27;rect(g,wx,wy,20,13,'#728885');rect(g,wx+2,wy+2,6,5,'#a4b6ac');rect(g,wx+10,wy,2,13,'#dddcc6');}}rect(g,x+203,wy+7,54,2,'#7b8a7d');}
for(const off of [0,174,280,446])rect(g,x+off,y+3,6,h-6,'#efead3');rect(g,x-20,y+h-35,174,35,'#dedcca');rect(g,x+306,y+h-35,174,35,'#dedcca');for(const off of [-10,316])for(let j=0;j<5;j++)rect(g,x+off+j*28,y+h-23,21,11,'#718a85');rect(g,x+188,y+h-25,84,25,'#4d615a');rect(g,x+196,y+h-20,18,20,'#8da99b');rect(g,x+226,y+h-20,18,20,'#8da99b');rect(g,x+256,y+h-20,8,20,'#8da99b');label(g,'德 怀 楼',x+230,y+h-35,12,'#765f4b');}
root.LegacyArt={rect,poly,label,statue,dehuaiGate,mainBuilding,dehuaiBuilding};
})(typeof window!=='undefined'?window:globalThis);
