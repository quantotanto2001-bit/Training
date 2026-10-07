"""CC0 MakeHuman mesh, morphs and skin weights; our own posing/rendering code."""
import json, math
from pathlib import Path
import numpy as np
import render as gfx

ASSETS=Path(__file__).parent/'human-assets'
verts=[]; triangles=[]; group=''
for line in (ASSETS/'base.obj').read_text().splitlines():
    a=line.split()
    if not a:continue
    if a[0]=='v':verts.append(list(map(float,a[1:4])))
    elif a[0]=='g':group=a[1]
    elif a[0]=='f' and group=='body':
        ids=[int(x.split('/')[0])-1 for x in a[1:]]
        for i in range(1,len(ids)-1):triangles.append([ids[0],ids[i],ids[i+1]])
V=np.array(verts);F=np.array(triangles)
for name in ['caucasian-male-young.target','universal-male-young-maxmuscle-minweight.target']:
    for line in (ASSETS/name).read_text().splitlines():
        if not line or line.startswith('#'):continue
        a=line.split();V[int(a[0])]+=np.array(a[1:4],float)
V*=.1
S=json.loads((ASSETS/'default.mhskel').read_text())
WEIGHTS=json.loads((ASSETS/'default_weights.mhw').read_text())['weights']
HEAD={n:V[S['joints'][b['head']]].mean(0) for n,b in S['bones'].items()}
TAIL={n:V[S['joints'][b['tail']]].mean(0) for n,b in S['bones'].items()}
SHIFT=np.array([0,-.163,.58])
def rotation(a,b):
    a=gfx.unit(a);b=gfx.unit(b);v=np.cross(a,b);c=np.dot(a,b)
    if c>.999999:return np.eye(3)
    if c<-.999999:
        u=gfx.unit(np.cross(a,[1,0,0] if abs(a[0])<.8 else [0,1,0]));return 2*np.outer(u,u)-np.eye(3)
    K=np.array([[0,-v[2],v[1]],[v[2],0,-v[0]],[-v[1],v[0],0]])
    return np.eye(3)+K+K@K/(1+c)
def ik(a,w,l1,l2,hint):
    d=w-a;dist=np.linalg.norm(d)
    if dist>=l1+l2:raise ValueError('Unreachable wrist/ankle target')
    u=d/dist;x=(l1*l1-l2*l2+dist*dist)/(2*dist)
    h=math.sqrt(max(0,l1*l1-x*x));v=gfx.unit(hint-u*np.dot(hint,u))
    return a+x*u+h*v
def pose(t):
    transforms={n:(np.eye(3),HEAD[n]+SHIFT) for n in HEAD}
    grips=[];rig=[]
    for side,sign in [('L',1),('R',-1)]:
        def n(s):return s+'.'+side
        shoulder=HEAD[n('upperarm01')]+SHIFT
        elbow_rest=HEAD[n('lowerarm01')];wrist_rest=HEAD[n('wrist')]
        l1=np.linalg.norm(elbow_rest-HEAD[n('upperarm01')]);l2=np.linalg.norm(wrist_rest-elbow_rest)
        wrist=np.array([sign*(.355-.20*t),.235+.15*t,.815+.29*t])
        # Keep targets within reach after all morphs.
        if np.linalg.norm(wrist-shoulder)>l1+l2-.004:
            wrist=shoulder+gfx.unit(wrist-shoulder)*(l1+l2-.004)
        elbow=ik(shoulder,wrist,l1,l2,np.array([sign*.8,-.6,-.25]))
        Ru=rotation(elbow_rest-HEAD[n('upperarm01')],elbow-shoulder)
        Rl=rotation(wrist_rest-elbow_rest,wrist-elbow)
        for part in ['upperarm01','upperarm02']:
            key=n(part);transforms[key]=(Ru,shoulder+Ru@(HEAD[key]-HEAD[n('upperarm01')]))
        for part in ['lowerarm01','lowerarm02']:
            key=n(part);transforms[key]=(Rl,elbow+Rl@(HEAD[key]-elbow_rest))
        up=gfx.unit(wrist-elbow)
        axis=gfx.unit([math.cos(math.radians(20)),sign*math.sin(math.radians(20)),0])
        axis=gfx.unit(axis-up*np.dot(axis,up));normal=gfx.unit(np.cross(axis,up))
        forward=gfx.unit(TAIL[n('metacarpal3')]-wrist_rest)
        across=HEAD[n('finger2-1')]-HEAD[n('finger5-1')]
        across=gfx.unit(across-forward*np.dot(across,forward))
        old=np.column_stack([across,forward,np.cross(across,forward)])
        new=np.column_stack([axis*sign,up,np.cross(axis*sign,up)])
        Rh=new@old.T
        hand_names=[k for k in HEAD if k.endswith('.'+side) and (k.startswith('wrist') or k.startswith('metacarpal'))]
        for key in hand_names:transforms[key]=(Rh,wrist+Rh@(HEAD[key]-wrist_rest))
        # Finger chains close into a grip; all knuckles have explicit hinges.
        for finger in range(1,6):
            parentR=Rh
            for joint in range(1,4):
                key=n(f'finger{finger}-{joint}');parent=S['bones'][key]['parent']
                Rpar,Ppar=transforms.get(parent,(Rh,wrist+Rh@(HEAD.get(parent,wrist_rest)-wrist_rest)))
                pos=Ppar+Rpar@(HEAD[key]-HEAD.get(parent,wrist_rest))
                angle=-math.radians((35 if finger==1 else 65) if joint==1 else (55 if joint==2 else 40))
                # Curl fingers toward palm; thumb uses a separate hinge.
                hinge=axis*sign if finger>1 else normal
                c=math.cos(angle);ss=math.sin(angle);x,y,z=hinge
                K=np.array([[0,-z,y],[z,0,-x],[-y,x,0]])
                bend=np.eye(3)*c+(1-c)*np.outer(hinge,hinge)+ss*K
                transforms[key]=(bend@Rpar,pos)
        grip=wrist+up*.105-normal*sign*.024
        grips.append((grip,axis));rig.append((shoulder,elbow,wrist,l1,l2))
        hip=HEAD[n('upperleg01')]+SHIFT;kr=HEAD[n('lowerleg01')];ar=HEAD[n('foot')]
        thigh=np.linalg.norm(kr-HEAD[n('upperleg01')]);shin=np.linalg.norm(ar-kr)
        ankle=np.array([sign*.215,-.66,.095])
        knee=ik(hip,ankle,thigh,shin,np.array([0,-1,1]))
        Rt=rotation(kr-HEAD[n('upperleg01')],knee-hip);Rs=rotation(ar-kr,ankle-knee)
        for part in ['upperleg01','upperleg02']:
            key=n(part);transforms[key]=(Rt,hip+Rt@(HEAD[key]-HEAD[n('upperleg01')]))
        for part in ['lowerleg01','lowerleg02']:
            key=n(part);transforms[key]=(Rs,knee+Rs@(HEAD[key]-kr))
        # Upright foot: the source standing pose is mapped onto the floor.
        Rfoot=np.array([[1,0,0],[0,0,-1],[0,1,0]])
        for key in HEAD:
            if key.endswith('.'+side) and (key.startswith('foot') or key.startswith('toe')):
                transforms[key]=(Rfoot,ankle+Rfoot@(HEAD[key]-ar))
    out=np.zeros_like(V);total=np.zeros(len(V))
    for name,weights in WEIGHTS.items():
        w=np.array(weights);ids=w[:,0].astype(int);amount=w[:,1]
        R,p=transforms[name];out[ids]+=((V[ids]-HEAD[name])@R.T+p)*amount[:,None];total[ids]+=amount
    ok=total>1e-7;out[ok]/=total[ok,None];out[~ok]=V[~ok]+SHIFT
    return out,grips,rig

def scene(t):
    gfx.FACES.clear()
    gfx.box([0,.2,.425],[.155,.64,.045],(43,47,53))
    for y in [-.27,.66]:
        gfx.box([0,y,.21],[.035,.045,.18],gfx.STEEL)
        gfx.box([0,y,.045],[.31,.055,.035],gfx.PLATE)
    gfx.box([0,.2,.34],[.04,.53,.035],gfx.STEEL)
    p,grips,rig=pose(t)
    normal=np.zeros_like(p);q=p[F];ns=np.cross(q[:,1]-q[:,0],q[:,2]-q[:,0])
    for j in range(3):np.add.at(normal,F[:,j],ns)
    normal/=np.maximum(np.linalg.norm(normal,axis=1,keepdims=True),1e-9)
    color=np.tile([188.,192.,196.],(len(V),1))
    x,y,z=V.T
    shorts=(y>-.12)&(y<.17)
    color[shorts]=[37,40,46]
    hair=(y>.85)&(z<.10)
    color[hair]=[37,39,43]
    region=((abs(x)-.090)/.093)**2+((y-.455)/.10)**2
    redness=np.clip((1.10-region)*4,0,1)*np.clip((z-.075)*60,0,1)
    color=color*(1-redness[:,None])+np.array([181,68,60])*redness[:,None]
    for i,tri in enumerate(F):
        gfx.FACES.append((p[tri],normal[tri],color[tri]))
    # Simple shoes fitted over the posed detailed feet.
    for sign in [-1,1]:
        gfx.ellipsoid([sign*.217,-.728,.062],[.062,.125,.052],(47,51,57))
        gfx.box([sign*.217,-.728,.023],[.061,.111,.013],(161,166,170))
    for side in ['L','R']:
        e=HEAD['eye.'+side]+SHIFT
        gfx.ellipsoid(e,[.010,.010,.010],(218,221,223),n=16,m=10)
        gfx.ellipsoid(e+[0,0,.009],[.004,.004,.002],(45,46,48),n=12,m=8)
    for grip,axis in grips:
        gfx.segment(grip-axis*.105,grip+axis*.105,.012,.012,(153,164,175),n=20)
        for end in [-1,1]:
            point=grip+axis*(end*.14)
            gfx.segment(point-axis*.032,point+axis*.032,.078,.078,(38,42,48),n=28)
            gfx.segment(point-axis*.034,point+axis*.034,.027,.027,(110,116,124),n=20)
    return list(gfx.FACES)

if __name__=='__main__':
    gfx.scene=scene
    gfx.render(.3).save(gfx.OUT/'human-preview.png')
    print('Detailed mesh:',len(V),'vertices;',len(F),'visible triangles')
