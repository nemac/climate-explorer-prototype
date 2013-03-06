#! /opt/local/bin/python2.7

from PIL import Image, ImageDraw

# im = Image.new('RGBA', (100, 100), (0, 0, 0, 0)) # Create a blank image
# draw = ImageDraw.Draw(im) # Create a draw object
# draw.rectangle((10, 10, 90, 90), fill="yellow", outline="red")
# im.save('out.png');

w = 21    
h = 25

x = 11
y = 10

im = Image.new('RGBA', (w, h), (0, 0, 0, 0)) # Create a blank image
draw = ImageDraw.Draw(im) # Create a draw object
draw.polygon([(0,y),(x,0),(w,y),(x,h)], fill="yellow", outline="red")
im.save('out.png');

