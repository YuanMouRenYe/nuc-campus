"""Fetch the Mapzen/Tilezen Terrarium z15 terrain tiles that cover the NUC map into data/dem/.

Source: https://registry.opendata.aws/terrain-tiles/ (AWS Open Data). Over China the tiles come from SRTM
(NASA / USGS, public domain). Attribution: "Terrain tiles: Mapzen / Tilezen (AWS Open Data), SRTM courtesy of NASA / USGS."
Terrarium encoding: height_m = R*256 + G + B/256 - 32768. These are elevation grids, not imagery.
"""
import os, urllib.request
URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/15/{x}/{y}.png'
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'dem')
os.makedirs(D, exist_ok=True)
for x in range(26617, 26620):
    for y in range(12637, 12639):
        out = os.path.join(D, 't15_%d_%d.png' % (x, y))
        if os.path.exists(out): continue
        urllib.request.urlretrieve(URL.format(x=x, y=y), out); print('fetched', out)
