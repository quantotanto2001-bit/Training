"""Deterministic 3D bench-press prototype. No generated/interpolated bitmap poses.
Units metres; x lateral, y toward head, z upward. Fixed-length two-bone arm IK.
Run: python render.py. Requires numpy, Pillow and ffmpeg.
"""
from pathlib import Path
import math, subprocess, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT=Path(__file__).parent
SIZE=800
SKIN=(198,151,118); SHIRT=(39,141,150); SHORTS=(40,54,76)
STEEL=(102,119,136); PLATE=(38,48,64)
FACES=[]
def unit(v):
    v=np.array(v,dtype=float); return v/np.linalg.norm(v)
def basis(axis):
    w=unit(axis); u=unit(np.cross(w,[0,0,1] if abs(w[2])<.9 else [0,1,0])); return np.column_stack((u,np.cross(w,u),w))
def mesh(points,faces,color):
    p=np.array(points)
    for f in faces:
        q=p[list(f)]; n=np.cross(q[1]-q[0],q[2]-q[0]); l=np.linalg.norm(n)
        if l>1e-9:
            light=.55+.45*abs(np.dot(n/l,unit([-.4,-.6,1])))
            FACES.append((q,tuple(int(c*light) for c in color)))
def ellipsoid(center,radii,color,rotation=None,n=16,m=10):
    p=[]; fs=[]; R=np.eye(3) if rotation is None else rotation
    for j in range(m+1):
        a=math.pi*j/m
        for i in range(n):
            b=2*math.pi*i/n
            p.append(np.array(center)+R@(np.array([math.sin(a)*math.cos(b),math.sin(a)*math.sin(b),math.cos(a)])*radii))
    for j in range(m):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n;c=b+n;d=a+n
            fs.extend([(a,b,c),(a,c,d)])
    mesh(p,fs,color)
def segment(a,b,r1,r2,color,n=14):
    a=np.array(a);b=np.array(b);R=basis(b-a);p=[]
    for c,r in [(a,r1),(b,r2)]:
        for i in range(n):
            t=2*math.pi*i/n;p.append(c+R@np.array([r*math.cos(t),r*math.sin(t),0]))
    fs=[]
    for i in range(n):
        j=(i+1)%n;fs.extend([(i,j,j+n),(i,j+n,i+n)])
    for i in range(1,n-1):fs.extend([(0,i+1,i),(n,n+i,n+i+1)])
    mesh(p,fs,color)
def limb(a,b,r,color):
    mid=(np.array(a)+b)/2
    ellipsoid(mid,[r,r,np.linalg.norm(np.array(b)-a)/2+r*.5],color,basis(np.array(b)-a))
def box(c,s,color):
    p=[np.array(c)+np.array([x,y,z])*s for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    mesh(p,[(0,2,1),(0,3,2),(4,5,6),(4,6,7),(0,1,5),(0,5,4),(1,2,6),(1,6,5),(2,3,7),(2,7,6),(3,0,4),(3,4,7)],color)
def rig(t,s):
    sh=np.array([s*.195,.42,.64])
    w=np.array([s*(.43-.265*t),.20+.19*t,.85+.405*t])
    d=w-sh;dist=np.linalg.norm(d);u=d/dist
    a=(.32**2-.30**2+dist**2)/(2*dist)
    h=math.sqrt(max(0,.32**2-a*a))
    hint=np.array([s*.8,-.6,-.25]);v=unit(hint-u*np.dot(hint,u))
    elbow=sh+a*u+h*v
    return sh,elbow,w
def scene(t):
    FACES.clear()
    box([0,.02,-.025],[.82,1.13,.025],(223,231,235))
    # Bench pad, supports and cross-feet.
    box([0,.20,.425],[.155,.64,.045],(50,67,83))
    for y in [-.27,.66]:
        box([0,y,.21],[.035,.045,.18],STEEL)
        box([0,y,.045],[.31,.055,.035],PLATE)
    box([0,.20,.34],[.04,.53,.035],STEEL)
    ellipsoid([0,.015,.575],[.17,.205,.12],SHORTS)
    ellipsoid([0,.285,.595],[.215,.28,.135],SHIRT)
    # Fixed shoulder girdle, head and support contacts.
    segment([0,.49,.60],[0,.62,.62],.067,.066,SKIN)
    ellipsoid([0,.725,.635],[.085,.115,.09],SKIN)
    ellipsoid([0,.785,.637],[.087,.067,.083],(64,52,47))
    ellipsoid([0,.71,.723],[.018,.030,.019],SKIN,n=12,m=7)
    for s in [-1,1]:
        ellipsoid([s*.039,.75,.713],[.012,.006,.003],(58,47,43),n=10,m=5)
        hip=np.array([s*.105,-.06,.57]);knee=np.array([s*.235,-.47,.42]);ankle=np.array([s*.26,-.57,.10])
        limb(hip,(hip+knee)/2,.105,SHORTS)
        limb((hip+knee)/2,knee,.077,SKIN)
        ellipsoid(knee,[.072,.075,.068],SKIN)
        limb(knee,ankle,.052,SKIN)
        ellipsoid([s*.26,-.66,.068],[.068,.14,.06],(49,67,83))
        box([s*.26,-.66,.025],[.065,.125,.018],(215,224,230))
        sh,el,wr=rig(t,s)
        ellipsoid(sh,[.092,.09,.085],SHIRT)
        limb(sh,el,.061,SKIN);ellipsoid(el,[.052,.052,.052],SKIN)
        limb(el,wr,.043,SKIN)
        # Wrist/palm follows forearm. Handle rigidly attached to hand.
        up=unit(wr-el); grip=wr+up*.055
        axis=unit([math.cos(math.radians(22)),s*math.sin(math.radians(22)),0])
        axis=unit(axis-up*np.dot(axis,up))
        side=unit(np.cross(axis,up))
        R=np.column_stack((axis,side,up))
        ellipsoid(wr+up*.024-side*.012,[.043,.026,.043],SKIN,R,n=14,m=8)
        segment(grip-axis*.105,grip+axis*.105,.014,.014,(168,179,188))
        for end in [-1,1]:
            p=grip+axis*(end*.135)
            segment(p-axis*.033,p+axis*.033,.084,.084,PLATE,n=12)
            segment(p-axis*.036,p+axis*.036,.035,.035,STEEL,n=12)
        # Four closed fingers wrap the actual handle; thumb crosses the grip.
        for offset in [-.029,-.010,.009,.028]:
            for a,b in zip(np.linspace(-.3,4.6,9)[:-1],np.linspace(-.3,4.6,9)[1:]):
                p=grip+axis*offset+.025*(side*math.cos(a)+up*math.sin(a))
                q=grip+axis*offset+.025*(side*math.cos(b)+up*math.sin(b))
                segment(p,q,.008,.008,SKIN,n=7)
        limb(grip-axis*.043-side*.015-up*.015,grip-axis*.013+side*.022,.014,SKIN)
    return list(FACES)

FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def font(n):return ImageFont.truetype(FONT,n)
def render(t,view='main'):
    faces=scene(t)
    eye=unit([2.8,-3.6,2.5] if view=='main' else [0,-4,1.6])
    right=unit(np.cross([0,0,1],eye));up=np.cross(eye,right)
    camera=np.column_stack([right,up,eye]);target=np.array([0,.02,.64])
    img=Image.new('RGB',(SIZE,SIZE),(245,248,250));draw=ImageDraw.Draw(img)
    projected=[]
    for q,c in faces:
        v=(q-target)@camera;xy=np.column_stack([400+v[:,0]*305,420-v[:,1]*305])
        projected.append((v[:,2].mean(),xy,c))
    for _,xy,c in sorted(projected,key=lambda f:f[0]):draw.polygon([tuple(p) for p in xy],fill=c)
    draw.text((36,24),'BANKDRÜCKEN',font=font(27),fill=(26,45,62))
    draw.text((36,62),'3D-Muster · Kurzhanteln · leicht eingedrehter Griff',font=font(16),fill=(85,106,123))
    draw.rounded_rectangle((36,699,764,760),12,fill=(230,239,242))
    draw.text((54,709),'Handgelenke stabil · Füße und Gesäß bleiben aufgesetzt',font=font(17),fill=(35,68,82))
    draw.text((54,735),'Schematischer Prototyp — noch nicht fachlich freigegeben',font=font(14),fill=(85,106,123))
    return img

if __name__=='__main__':
    frames=OUT/'frames';frames.mkdir(exist_ok=True)
    # 5 second loop, 24 fps: controlled descent, short pause, press, pause.
    stats=[]
    for i in range(120):
        p=i/24
        if p<2:t=(1+math.cos(math.pi*p/2))/2
        elif p<2.5:t=0
        elif p<4:t=(1-math.cos(math.pi*(p-2.5)/1.5))/2
        else:t=1
        render(t).save(frames/f'{i:03}.png')
        for s in [-1,1]:
            sh,el,wr=rig(t,s);stats.append([float(np.linalg.norm(el-sh)),float(np.linalg.norm(wr-el))])
    for t,name in [(0,'bottom'),(.5,'middle'),(1,'top')]:
        render(t).save(OUT/f'{name}.png')
        render(t,'front').save(OUT/f'{name}-front.png')
    subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate','24','-i',str(frames/'%03d.png'),'-c:v','libx264','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'bench-3d.mp4')],check=True)
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(OUT/'bench-3d.mp4'),'-vf','fps=12,scale=560:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',str(OUT/'bench-3d.gif')],check=True)
    a=np.array(stats)
    assert np.max(abs(a[:,0]-.32))<1e-9 and np.max(abs(a[:,1]-.30))<1e-9
    (OUT/'validation.json').write_text(json.dumps({'frames':120,'fps':24,'upper_arm_m':[float(a[:,0].min()),float(a[:,0].max())],'forearm_m':[float(a[:,1].min()),float(a[:,1].max())],'clinical_validation':False},indent=2))
    print('Rendered 120 frames; fixed limb lengths verified.')
