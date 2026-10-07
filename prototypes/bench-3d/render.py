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
SKIN=(184,188,192); SHIRT=SKIN; SHORTS=(35,39,45)
MUSCLE=(186,69,62)
STEEL=(102,119,136); PLATE=(38,48,64)
FACES=[]
def unit(v):
    v=np.array(v,dtype=float); return v/np.linalg.norm(v)
def basis(axis):
    w=unit(axis); u=unit(np.cross(w,[0,0,1] if abs(w[2])<.9 else [0,1,0])); return np.column_stack((u,np.cross(w,u),w))
def mesh(points,faces,color,normals=None):
    p=np.array(points)
    normal_array=None if normals is None else np.array(normals)
    for f in faces:
        q=p[list(f)]; n=np.cross(q[1]-q[0],q[2]-q[0]); l=np.linalg.norm(n)
        if l>1e-9:
            ns=np.tile(n/l,(3,1)) if normals is None else normal_array[list(f)]
            FACES.append((q,ns,np.array(color)))
def ellipsoid(center,radii,color,rotation=None,n=24,m=16):
    p=[]; ns=[]; fs=[]; R=np.eye(3) if rotation is None else rotation
    for j in range(m+1):
        a=math.pi*j/m
        for i in range(n):
            b=2*math.pi*i/n
            v=np.array([math.sin(a)*math.cos(b),math.sin(a)*math.sin(b),math.cos(a)])
            p.append(np.array(center)+R@(v*radii))
            ns.append(unit(R@(v/np.array(radii))))
    for j in range(m):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n;c=b+n;d=a+n
            fs.extend([(a,b,c),(a,c,d)])
    mesh(p,fs,color,ns)
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
    box([0,.02,-.025],[.82,1.13,.025],(248,249,250))
    # Bench pad, supports and cross-feet.
    box([0,.20,.425],[.155,.64,.045],(43,47,53))
    for y in [-.27,.66]:
        box([0,y,.21],[.035,.045,.18],STEEL)
        box([0,y,.045],[.31,.055,.035],PLATE)
    box([0,.20,.34],[.04,.53,.035],STEEL)
    ellipsoid([0,.015,.575],[.17,.205,.12],SHORTS)
    ellipsoid([0,.285,.595],[.205,.28,.125],SKIN)
    # Layered chest/abdomen volumes and restrained muscle highlighting.
    for s in [-1,1]:
        ellipsoid([s*.097,.38,.694],[.104,.14,.044],MUSCLE)
        ellipsoid([s*.060,.185,.691],[.065,.07,.028],SKIN)
        ellipsoid([s*.056,.085,.67],[.057,.065,.025],SKIN)
    # Fixed shoulder girdle, head and support contacts.
    segment([0,.49,.60],[0,.62,.62],.067,.066,SKIN)
    ellipsoid([0,.725,.59],[.085,.115,.12],SKIN)
    ellipsoid([0,.785,.586],[.087,.067,.106],(41,43,46))
    ellipsoid([0,.71,.71],[.017,.028,.024],SKIN)
    ellipsoid([0,.675,.681],[.043,.042,.031],SKIN)
    for s in [-1,1]:
        ellipsoid([s*.039,.75,.702],[.015,.009,.004],(47,48,51),n=12,m=8)
        ellipsoid([s*.085,.735,.596],[.019,.030,.041],SKIN)
        hip=np.array([s*.105,-.06,.57]);knee=np.array([s*.235,-.47,.42]);ankle=np.array([s*.26,-.57,.10])
        limb(hip,(hip+knee)/2,.105,SHORTS)
        limb((hip+knee)/2,knee,.077,SKIN)
        ellipsoid(knee,[.072,.075,.068],SKIN)
        limb(knee,ankle,.052,SKIN)
        ellipsoid([s*.26,-.66,.068],[.068,.14,.06],(49,67,83))
        box([s*.26,-.66,.025],[.065,.125,.018],(215,224,230))
        sh,el,wr=rig(t,s)
        ellipsoid(sh,[.080,.08,.077],SKIN)
        limb(sh,el,.061,SKIN);ellipsoid(el,[.045,.045,.045],SKIN)
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
            segment(p-axis*.033,p+axis*.033,.084,.084,PLATE,n=24)
            segment(p-axis*.036,p+axis*.036,.035,.035,STEEL,n=24)
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
    eye=unit([-3.8,-1.8,2.1] if view=='main' else [0,-4,1.6])
    right=unit(np.cross([0,0,1],eye));up=np.cross(eye,right)
    camera=np.column_stack([right,up,eye]);target=np.array([0,.02,.64])
    # Per-pixel depth buffer fixes the false arm/bench occlusion of v1.
    pixels=np.full((SIZE,SIZE,3),252.,dtype=float)
    depth=np.full((SIZE,SIZE),-np.inf)
    light=unit(eye+np.array([-.4,.0,1.4]));half=unit(light+eye)
    for q,ns,c in faces:
        v=(q-target)@camera;xy=np.column_stack([400+v[:,0]*330,415-v[:,1]*330])
        xmin=max(0,int(np.floor(xy[:,0].min())));xmax=min(SIZE-1,int(np.ceil(xy[:,0].max())))
        ymin=max(0,int(np.floor(xy[:,1].min())));ymax=min(SIZE-1,int(np.ceil(xy[:,1].max())))
        if xmin>xmax or ymin>ymax:continue
        x0,y0=xy[0];x1,y1=xy[1];x2,y2=xy[2]
        den=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2)
        if abs(den)<1e-8:continue
        yy,xx=np.mgrid[ymin:ymax+1,xmin:xmax+1];xx=xx+.5;yy=yy+.5
        a=((y1-y2)*(xx-x2)+(x2-x1)*(yy-y2))/den
        b=((y2-y0)*(xx-x2)+(x0-x2)*(yy-y2))/den;d=1-a-b
        z=a*v[0,2]+b*v[1,2]+d*v[2,2]
        region=depth[ymin:ymax+1,xmin:xmax+1]
        mask=(a>=-1e-6)&(b>=-1e-6)&(d>=-1e-6)&(z>region)
        if not mask.any():continue
        n=a[...,None]*ns[0]+b[...,None]*ns[1]+d[...,None]*ns[2]
        n/=np.maximum(np.linalg.norm(n,axis=2,keepdims=True),1e-8)
        # Smooth surface lighting, independently of triangle tessellation.
        diffuse=np.maximum(0,n@light);spec=np.maximum(0,n@half)**28
        base=c if c.ndim==1 else a[...,None]*c[0]+b[...,None]*c[1]+d[...,None]*c[2]
        colors=base*(.45+.55*diffuse[...,None])+24*spec[...,None]
        pixels[ymin:ymax+1,xmin:xmax+1][mask]=np.clip(colors[mask],0,255)
        region[mask]=z[mask]
    img=Image.fromarray(pixels.astype('uint8'));draw=ImageDraw.Draw(img)
    draw.text((36,24),'BANKDRÜCKEN',font=font(27),fill=(26,45,62))
    draw.text((36,62),'3D-Muster v2 · kontrollierter Bewegungsweg',font=font(16),fill=(85,106,123))
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
