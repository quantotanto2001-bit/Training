"""Render/inspect the detailed character as a separate reviewable sample."""
import json, math, subprocess
import numpy as np
from PIL import Image
import render as gfx
import human

gfx.scene=human.scene
OUT=gfx.OUT
FRAMES=OUT/'human-frames';FRAMES.mkdir(exist_ok=True)
arm_ids=set()
for name,w in human.WEIGHTS.items():
    if name.startswith(('upperarm','lowerarm')):
        arm_ids.update(int(i) for i,a in w if a>.35)
arm_ids=np.array(sorted(arm_ids))
lo=np.array([-.155,-.44,.38]);hi=np.array([.155,.84,.47])
minimum=np.inf;intrusions=0;length_error=0
for t in np.linspace(0,1,81):
    p,_,rig=human.pose(t)
    a=p[arm_ids]
    inside=((a>lo)&(a<hi)).all(1)
    intrusions+=int(inside.sum())
    minimum=min(minimum,float(np.linalg.norm(a-np.clip(a,lo,hi),axis=1).min()))
    for sh,el,wr,l1,l2 in rig:
        length_error=max(length_error,abs(np.linalg.norm(el-sh)-l1),abs(np.linalg.norm(wr-el)-l2))
assert intrusions==0, f'{intrusions} arm vertices within bench cushion'
assert length_error<1e-8
for t,name in [(0,'bottom'),(.5,'middle'),(1,'top')]:
    gfx.render(t).save(OUT/f'human-{name}.png')
    gfx.render(t,'front').save(OUT/f'human-{name}-front.png')
sheet=Image.new('RGB',(1200,800),'white')
for i,name in enumerate(['bottom','middle','top']):
    for j,suffix in enumerate(['','-front']):
        sheet.paste(Image.open(OUT/f'human-{name}{suffix}.png').resize((400,400)),(i*400,j*400))
sheet.save(OUT/'human-review.png')
for i in range(80):
    s=i/16
    if s<2:t=(1+math.cos(math.pi*s/2))/2
    elif s<2.5:t=0
    elif s<4:t=(1-math.cos(math.pi*(s-2.5)/1.5))/2
    else:t=1
    gfx.render(t).save(FRAMES/f'{i:03}.png')
    if i%16==0: print(f'Rendered {i}/80',flush=True)
subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','16','-i',str(FRAMES/'%03d.png'),'-c:v','libx264','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'bench-human.mp4')],check=True)
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(OUT/'bench-human.mp4'),'-vf','fps=12,scale=560:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',str(OUT/'bench-human.gif')],check=True)
(OUT/'human-validation.json').write_text(json.dumps({'mesh_vertices':len(human.V),'visible_triangles':len(human.F),'source':'MakeHuman core assets, CC0','frames':80,'fps':16,'checked_pose_samples':81,'arm_vertices_inside_pad':intrusions,'minimum_sampled_arm_vertex_pad_distance_m':minimum,'maximum_limb_length_error_m':float(length_error),'limitations':'Vertex sample check is not a complete triangle collision solver or biomechanical validation.'},indent=2))
print('Human sample complete',flush=True)
