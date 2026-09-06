#!/usr/bin/env python3
"""Original, deterministic vector art for The Night Window. No downloaded inputs.
Subject-left is screen-right. All visible anomaly features have textual equivalents.
Run: python3 assets-src/make-art.py. Python standard library only.
"""
from pathlib import Path
import json, math, random, html
ROOT=Path(__file__).resolve().parents[1]
RES=json.loads((ROOT/'logic/residents.logic').read_text().split(' = ',1)[1].rsplit(';',1)[0])
SKINS=['#b7ac8e','#aa8974','#b8a085','#8c7862','#c0a78a','#987e65','#b5a088','#b39b79','#ad9071','#b5b39b','#887666','#b9a885','#a39378','#b0a282','#877664','#bcaa90','#a48c76','#b0a38b','#998771','#a1927d']
HAIRS=['#b9b9a5','#352f2b','#302d29','#3d3730','#282b28','#40382e','#3c342a','#838374','#c1ad80','#41443a','#30342d','#463a2c','#646c5c','#afb19c','#363d32','#42463a','#323a34','#929e89','#524234','#616554']
COATS=['#515d47','#3d5752','#5a513c','#6a6550','#58635a','#6b6050','#6a5142','#4b5142','#576047','#3e4d3c','#364d43','#63705a','#4c5c58','#626454','#5d6952','#475c52','#3e504a','#354a40','#626952','#515d57']
VARIANTS=['base','eye','mole','scar','pupil','ear','hand','reflection','shadow','teeth','temperature','bandage','open','defensive','anxious']
def tag(name,body='',**attrs):
    return '<'+name+''.join(' '+k.replace('_','-')+'="'+html.escape(str(v),quote=True)+'"' for k,v in attrs.items())+'>'+body+'</'+name+'>'
def path(d,fill,**kw):return tag('path',d=d,fill=fill,**kw)
def line(x1,y1,x2,y2,stroke,w=1,**kw):return tag('path',d=f'M{x1} {y1}L{x2} {y2}',fill='none',stroke=stroke,stroke_width=w,**kw)
def circle(cx,cy,r,fill,**kw):return tag('circle',cx=cx,cy=cy,r=r,fill=fill,**kw)
def rect(x,y,w,h,fill,**kw):return tag('rect',x=x,y=y,width=w,height=h,fill=fill,**kw)
def txt(x,y,text,size=12,fill='#c6cbb2',**kw):return tag('text',html.escape(text),x=x,y=y,font_size=size,fill=fill,font_family='monospace',**kw)
def svg(body,w=320,h=360,title=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"><title>{html.escape(title)}</title>{body}</svg>'
def portrait(r,var):
    i=r['visual'];skin=SKINS[i];hair=HAIRS[i];coat=COATS[i];ink='#202e26';hi='#d4cbb0';age=r['age']
    rx=[49,48,46,56,47,54,42,54,49,46,55,46,50,50,57,47,52,55,49,51][i]
    ytop=59+(6 if i in [6] else 0); chin=229-(10 if i==6 else 0)+(6 if i==9 else 0)
    face=f'M{160-rx} 114 C{153-rx} {ytop-12} {167+rx} {ytop-12} {160+rx} 114 L{155+rx} 179 Q{153+rx} 204 183 {chin-5} Q160 {chin+9} 137 {chin-5} Q{167-rx} 204 {165-rx} 179Z'
    defs=tag('defs',tag('linearGradient',tag('stop',offset='0',stop_color=skin)+tag('stop',offset='.6',stop_color=skin)+tag('stop',offset='1',stop_color='#6c715e'),id='skin')+tag('clipPath',path(face,'white'),id='face')+tag('linearGradient',tag('stop',offset='0',stop_color=coat)+tag('stop',offset='1',stop_color='#26392c'),id='coat',x2='0',y2='1'))
    s=[defs]
    if var!='shadow':s+=[path('M70 360L70 298Q87 272 128 259L116 194Q99 162 110 106Q115 58 156 49Q229 42 226 128L229 234L263 287L286 360Z','#0d1912',opacity='.5',transform='translate(14 3)')]
    if i in [1,5,8,12,14,18,19]:
        s += [path(f'M{160-rx-8} 151 Q90 89 131 59 Q211 37 {160+rx+12} 128 L{160+rx+15} 263 L{160-rx-12} 253Z',hair)]
    # Neck and clothing: silhouette, seams and functional individual clothing.
    s += [path('M135 204L185 204L188 251L213 268L108 268L132 249Z',skin),path('M137 213L185 211L181 241Q158 255 136 235Z','#6c7059',opacity='.48')]
    s += [path(f'M18 360L32 289Q49 263 116 247L160 259L204 247Q268 263 288 291L307 360Z','url(#coat)',stroke=ink,stroke_width=3)]
    s += [path('M115 247L138 250L160 272L184 249L205 247L184 300L162 286L138 299Z','#b2b69b',stroke=ink,stroke_width=2)]
    s += [path('M159 274L162 360L131 360L132 299Z',coat),line(64,292,53,358,'#a1ab8e',1,opacity='.45'),line(246,292,263,359,ink,2)]
    if i in [10,16,17]:
        s += [path('M157 268L168 268L172 283L165 313L156 283Z','#202b25'),rect(216,293,32,16,'#adb494'),txt(219,304,'047' if i==10 else '17',7,'#34432f')]
    elif i in [1,12,19]:
        s += [rect(220,282,23,34,'#c1c5ad',stroke=ink),line(225,287,237,287,'#485b48',2),line(225,291,235,291,'#485b48'),rect(224,296,8,11,'#5c7764'),line(85,304,113,304,ink,2)]
    elif i in [3,18]:
        s += [path('M94 254L121 251L138 360L106 360Z','#8b8767',stroke=ink,stroke_width=2),path('M202 250L226 258L204 360L179 360Z','#8b8767',stroke=ink,stroke_width=2),circle(111,282,5,'#b9b592'),circle(213,282,5,'#b9b592')]
    elif i==14:s += [path('M111 261L129 276L196 277L212 261L233 360L84 360Z','#a7ac90',stroke=ink,stroke_width=2),path('M137 300Q165 306 193 300L194 335Q165 343 135 336Z','#929f82',stroke='#596b54')]
    elif i in [2,6,11]:s += [path('M120 246L96 263L115 286L150 283Z','#9c9977',stroke=ink),path('M198 247L222 265L201 285L171 283Z','#9c9977',stroke=ink),line(140,283,141,309,'#bfbda1',2),line(178,283,178,303,'#bfbda1',2)]
    else:
        for y in [296,316,338]:s += [circle(163,y,2.7,'#b1b493')]
    # Ears, neck/head and painterly geometric shading.
    ear=tag('ellipse',cx=160-rx-1,cy=146,rx=10 if var!='ear' else 8,ry=21,fill=skin,stroke=ink,stroke_width=2)+tag('ellipse',cx=160+rx+1,cy=146,rx=10 if var!='ear' else 8,ry=21,fill=skin,stroke=ink,stroke_width=2)
    if var!='ear':
        ear+=path(f'M{155-rx} 135Q{170-rx} 138 {159-rx} 154M{165+rx} 135Q{150+rx} 138 {161+rx} 154','none',stroke='#726f59',stroke_width=2)
    s += [ear,path(face,'url(#skin)',stroke=ink,stroke_width=3)]
    s += [tag('g',path('M156 68L143 119L150 160L133 196L153 228L112 217L96 113Z','#76826b',opacity='.22')+path('M187 115L200 181L184 209L158 232L226 238L230 86Z','#4b604e',opacity='.24')+path('M115 164Q133 153 143 169L139 184L117 183Z','#b6a188',opacity='.25'),clip_path='url(#face)')]
    # Eyes with asymmetric brows, eyelids and reflected light.
    eyes={'brown':'#554c36','blue':'#6d8b89','green':'#7b8b62','grey':'#829487','amber':'#968354','hazel':'#8e865c'}
    eyecolor='#c5d0bc' if var=='eye' else eyes.get(r['eyes'],'#737c61')
    eyeY=143 if i!=6 else 148
    for ei,x in enumerate([137,183]):
        narrow=i in [3,9,10,17,19]; eyh=6 if narrow else 8
        s += [path(f'M{x-13} {eyeY}Q{x} {eyeY-eyh-4} {x+13} {eyeY}Q{x} {eyeY+eyh} {x-13} {eyeY}Z','#c5c4a8',stroke='#4b5140',stroke_width=1.7),circle(x,eyeY,5.4,eyecolor)]
        if var=='pupil' and ei==0:s += [circle(x-3,eyeY,2.2,ink),circle(x+3,eyeY,2.2,ink)]
        else:s += [circle(x,eyeY,2.4,ink)]
        s += [circle(x-1.6,eyeY-2,1.1,'#dce3c9'),path(f'M{x-15} {eyeY+9}Q{x} {eyeY+15} {x+11} {eyeY+9}','none',stroke='#857e65',stroke_width=1.2)]
        browY=eyeY-17; tilt=(5 if ei==0 else -5) if var=='defensive' else (-4 if ei==0 else 4) if var=='anxious' else ((i%3)-1)*2
        s += [path(f'M{x-15} {browY-tilt}Q{x} {browY-4} {x+14} {browY+tilt}','none',stroke=hair,stroke_width=5 if i in [3,10,17] else 3.5,stroke_linecap='round')]
    # Nose and mouth are intentionally individualized rather than simple emoji geometry.
    nose=174+(i%4)*2
    s += [path(f'M157 146L152 {nose}Q161 {nose+6} 171 {nose-1}','none',stroke='#756e55',stroke_width=2.2,stroke_linecap='round'),path(f'M154 {nose+3}Q160 {nose+6} 166 {nose+3}','none',stroke=ink,stroke_width=1.2)]
    mouthY=204 if i!=6 else 201
    smile=5 if var=='open' or (i in [0,8,14] and var=='base') else -3 if var=='defensive' else 1
    if var=='teeth':
        s += [path(f'M144 {mouthY-5}Q160 {mouthY-8} 178 {mouthY-4}L176 {mouthY+11}Q160 {mouthY+13} 146 {mouthY+9}Z',ink)]
        for row in [0,7]:
            for tx in range(148,176,6):s += [path(f'M{tx} {mouthY+row-4}L{tx+4} {mouthY+row-4}L{tx+3} {mouthY+row+1}L{tx+1} {mouthY+row+1}Z','#d9d6b8')]
    else:
        s += [path(f'M144 {mouthY}Q160 {mouthY+smile} 178 {mouthY-1}','none',stroke='#604b3d',stroke_width=2.5,stroke_linecap='round'),path(f'M151 {mouthY+6}Q162 {mouthY+9} 172 {mouthY+5}','none',stroke='#c2af8f',stroke_width=2)]
    if i==6 and var!='teeth':s += [path(f'M151 {mouthY}L157 {mouthY}L156 {mouthY+3}L153 {mouthY+2}Z','#dbd5b6')]
    if age>=44:
        s += [path('M119 112Q139 106 151 110M163 110Q185 105 198 113M121 117Q145 114 149 118','none',stroke='#827c62',stroke_width=1.1,opacity='.7'),path('M129 170Q122 190 133 201M181 171Q193 187 187 199','none',stroke='#83765b',stroke_width=1.2)]
    if age>55:s += [path('M118 146L111 143M117 150L110 152M196 146L203 143M197 151L204 155M140 217L149 221M173 220L181 216','none',stroke='#746e55',stroke_width=1.2)]
    # Hairstyles: twenty deliberately different silhouettes.
    styles=[
      'M108 115Q86 99 102 71Q111 50 137 47Q150 26 169 50Q199 40 213 70Q226 98 210 118L199 91Q185 111 170 84Q157 112 145 83Q132 108 118 91Z',
      'M108 127Q92 74 127 52Q153 31 188 47Q226 69 218 136L204 106L201 78Q157 111 115 94Z',
      'M110 124L101 102L110 86L102 75L124 64L134 47L152 57L170 42L182 55L204 54L221 78L214 91L218 119L204 97L189 102L180 85L163 95L148 80L133 96L119 92Z',
      'M106 127Q90 69 123 63L137 67L130 91L115 103L117 129ZM184 66Q227 65 219 130L207 126L206 96L190 86Z',
      'M103 158Q88 80 123 56Q167 26 203 63Q224 86 215 167L201 156L204 91Q171 111 131 90L116 168Z',
      'M106 131Q79 125 94 101Q83 82 104 75Q102 46 129 51Q145 28 161 49Q187 30 199 54Q228 55 221 81Q238 96 220 111Q230 137 210 148L199 103L175 85L139 99L115 103Z',
      'M115 125L104 109L114 89L107 80L131 74L146 55L168 65L180 55L194 76L216 89L204 104L207 126L193 107L178 101L169 85L155 103L138 94L126 111Z',
      'M105 129Q93 74 119 58L147 53L135 78L117 95L116 134ZM174 53Q218 61 219 129L208 133L199 96L186 82Z',
      'M103 148Q90 92 115 61Q148 31 189 53Q221 66 217 153L199 175L205 95Q172 93 155 72Q141 102 116 111L119 171Z',
      'M112 121Q104 82 125 72L139 68L132 91L119 105ZM179 69Q209 72 213 124L204 118L201 92Z',
      'M105 119L107 75Q155 44 210 75L215 120L204 113L204 86L116 85L117 114Z',
      'M109 145L98 123L108 67L148 46L202 53L217 96L205 111L192 83L154 111L121 116L117 154Z',
      'M102 169L103 89Q107 53 151 46L194 59L215 99L216 177L199 175L199 98L161 81L115 105L120 172Z',
      'M108 129Q100 81 117 68L139 64L134 88L119 100L119 131ZM183 65Q214 74 214 133L204 131L201 99L185 86Z',
      'M101 136Q84 112 97 87Q86 65 118 59Q129 35 154 47Q180 30 197 55Q228 56 222 86Q236 112 214 139L201 105L118 103Z',
      'M107 130Q90 97 109 69Q140 35 183 49Q220 61 215 115L206 129L202 86L189 77L175 99L157 88L142 102L118 98L119 131Z',
      'M109 115L105 88Q156 47 211 82L216 114L204 102L204 89L117 92L117 119Z',
      'M103 123Q100 82 122 65Q160 47 200 64Q221 81 216 130L202 121L201 95L165 79L127 98L117 127Z',
      'M107 139Q93 76 128 54Q157 31 194 56L214 93L211 137L203 112L193 80L171 93L156 81L138 96L118 88L119 135Z',
      'M105 150Q94 100 110 73Q142 44 178 51Q215 53 219 111L215 181L201 158L202 95L168 74L117 102L119 166Z'
    ]
    # Long cuts, swept parts and their highlights.
    s += [path(styles[i],hair,stroke=ink,stroke_width=2)]
    if i in [0,5,14]:
        for j in range(7):
            x=115+j*14;y=65+(j%2)*10
            s += [path(f'M{x-5} {y+10}Q{x-11} {y-7} {x+6} {y-2}','none',stroke='#c2c0a2' if i==0 else '#898e71',stroke_width=2,opacity='.75')]
    else:s += [path('M122 78Q143 58 164 62M177 62Q195 68 204 85','none',stroke='#ccd0ac',stroke_width=1.4,opacity='.3')]
    if i==0:s += [circle(214,86,17,hair,stroke=ink,stroke_width=2)]
    if i==1:s += [path('M209 96Q245 112 224 226L214 225Q231 135 207 120Z',hair)]
    if i==18:s += [path('M216 96Q229 141 224 197Q243 224 219 260','none',stroke=hair,stroke_width=17),path('M218 119L229 128M217 143L228 151M217 169L227 177M219 200L230 209M221 231L231 240','none',stroke='#a8a484',stroke_width=2)]
    if i==16:s += [path('M103 101L111 76Q156 60 208 80L212 104Z','#33483c',stroke=ink,stroke_width=2),path('M108 100Q161 88 213 101L227 116Q155 107 94 116Z','#1d3027',stroke='#64745b'),rect(152,80,22,13,'#aab591'),txt(156,90,'17',7,ink)]
    if i==14:s += [path('M104 97Q154 81 215 99L214 112Q151 98 106 113Z','#b8bfa0')]
    if i in [3,7,13,19]:
        if i==7:s += [path('M111 170L122 190L137 197L159 196L180 192L199 171L197 218L180 239L149 246L127 229Z',hair,opacity='.93'),path('M140 203Q159 210 178 204','none',stroke='#272f24',stroke_width=2)]
        else:
            for j in range(22):
                x=129+(j%11)*6;y=210+(j//11)*8
                s += [line(x,y,x-1,y+2,hair,1,opacity='.45')]
        if i==13:s += [path('M139 196Q151 185 159 191Q168 186 184 194L178 200L161 197L145 202Z',hair)]
    if i in [4,7,12,15]:
        radius=19 if i in [7,15] else 17
        for x in [136,184]:
            if i==15:s += [rect(x-18,127,36,30,'none',rx=5,stroke='#344135',stroke_width=3)]
            else:s += [circle(x,144,radius,'none',stroke='#394838',stroke_width=2.6)]
        s += [path('M155 142Q161 138 166 142M114 138L107 134M205 138L214 134','none',stroke='#394838',stroke_width=2.5)]
    # Explicit distinguishing traits. Switching side never flips unrelated props.
    side=1 if 'LEFT' in r['feature'] or 'left' in r['feature'] else -1
    if var=='scar':side=-side
    x=160+side*32
    if var!='mole':
        feature=r['feature'].lower()
        if 'scar' in feature:
            sy=115 if 'brow' in feature else 194 if 'jaw' in feature else 173
            s += [path(f'M{x-3} {sy-5}L{x+4} {sy+11}','none',stroke='#d3b49a',stroke_width=2.6),path(f'M{x-6} {sy}L{x+1} {sy-1}M{x-3} {sy+8}L{x+5} {sy+6}','none',stroke='#75624b',stroke_width=1.3)]
        elif 'freckles' in feature:
            for xx,yy in [(x,162),(x+6,165),(x+2,169)]:s += [circle(xx,yy,1.8,'#594e35')]
        elif 'mole' in feature:s += [circle(160+side*20 if 'lip' in feature else x,200 if 'lip' in feature else 163,2.6,'#4d4c36')]
        elif 'eyebrow' in feature or 'brow' in feature:
            s += [path(f'M{x-2} 122L{x+2} 130','none',stroke=skin,stroke_width=4)]
        elif 'patch' in feature:s += [tag('ellipse',cx=160+side*(rx+2),cy=148,rx=7,ry=13,fill='#d7c8a3',opacity='.85')]
        elif 'ear' in feature and var!='ear':
            ex=160+side*(rx+3)
            s += [path(f'M{ex} 132L{ex+side*9} 138L{ex+side*6} 130Z','#203329')]
        elif 'streak' in feature:s += [path(f'M{x} 64Q{x+10} 84 {x+4} 111','none',stroke='#c5c7ad',stroke_width=9)]
        elif 'dimple' in feature:s += [path(f'M{x} 182Q{x+6} 184 {x+1} 189','none',stroke='#776950',stroke_width=2)]
        elif 'patch' in feature:s += [tag('ellipse',cx=x,cy=160,rx=9,ry=14,fill='#d7c8a3',opacity='.7')]
        elif 'eyelid' in feature:s += [path('M171 141Q184 132 196 142L172 144Z',skin)]
    if var=='bandage':
        if r['id']=='micah':s += [rect(116,161,31,17,'#d8d2b5',rx=3,transform='rotate(-17 131 169)'),line(130,161,134,177,'#9d9f7c',2)]
        else:s += [rect(211,315,26,18,'#d8d2b5',rx=3,transform='rotate(12 224 324)'),line(225,316,222,332,'#9d9f7c',2)]
    # One hand holding a pencil makes handedness inspectable, not purely abstract.
    hand=r['hand'];hand=('left' if hand=='right' else 'right') if var=='hand' else hand
    hx=222 if hand=='left' else 92
    s += [path(f'M{hx-16} 360L{hx-15} 340Q{hx-27} 324 {hx-12} 319Q{hx} 312 {hx+11} 326L{hx+20} 360Z',skin,stroke=ink,stroke_width=2),line(hx-4,340,hx+8,304,'#c4b174',3),line(hx+8,304,hx+10,299,ink,2)]
    if var!='temperature':s += [path('M188 203Q213 198 222 185M193 210Q216 214 228 203','none',stroke='#cbd6c0',stroke_width=2,opacity='.13')]
    if var=='reflection':s += [tag('g',path('M260 154Q285 145 286 187L282 229Q261 237 249 211Z','#bfcba7')+tag('ellipse',cx=269,cy=209,rx=7,ry=11,fill='#203428'),opacity='.18')]
    # Cross-hatching confined to clothing: light enough to remain inexpensive.
    for j in range(9):s += [line(40+j*4,325,48+j*4,352,'#bfc8a0',.7,opacity='.14')]
    return svg(''.join(s),title=r['name']+' — original character illustration')

def facade(rng,x,y,w,h,lit=False):
    s=[rect(x,y,w,h,'#25382f'),path(f'M{x+w} {y}L{x+w+42} {y+25}L{x+w+42} {y+h}L{x+w} {y+h}Z','#14291f'),rect(x-8,y-7,w+16,10,'#4d5b48')]
    for yy in range(int(y)+25,int(y+h)-10,30):
        s+=[line(x,yy+22,x+w,yy+22,'#60705a',1,opacity='.22')]
        for xx in range(int(x)+18,int(x+w)-12,24):
            on=lit or rng.random()<.1
            s+=[rect(xx,yy,9,15,'#ceba74' if on else '#11261c',opacity='.75' if on else '1')]
    return ''.join(s)
def city(kind,w=1200,h=650):
    rng=random.Random(171989);s=[]
    dawn=kind=='dawn';sky='#8d9570' if dawn else '#162c25'
    defs=tag('defs',tag('linearGradient',tag('stop',offset='0',stop_color='#131f1c' if not dawn else '#456856')+tag('stop',offset='1',stop_color=sky),id='sky',x2='0',y2='1'))
    s += [defs,rect(0,0,w,h,'url(#sky)'),circle(874,169,83,'#a7ad7f',opacity='.12'),circle(885,155,68,sky)]
    for j in range(7):s += [line(0,100+j*29,w,90+j*29,'#77846b',1,opacity='.07')]
    for x,y,ww,hh in [(35,280,110,310),(890,197,155,420),(1080,305,115,315),(160,166,200,438),(326,84,350,520),(658,227,210,360)]:s += [facade(rng,x,y,ww,hh,kind=='rain')]
    s += [path('M0 578L430 518L850 560L1200 524L1200 650L0 650Z','#14241c'),path('M0 625L424 542L916 582L1200 556','none',stroke='#708266',stroke_width=3,opacity='.6')]
    s += [rect(397,405,316,158,'#46513b'),path('M377 410L554 374L735 403L713 419L397 419Z','#667154'),rect(457,438,87,95,'#182a20'),rect(566,433,114,70,'#bfa76a'),rect(573,440,100,56,'#595f3e'),rect(579,446,88,44,'#c9b978',opacity='.8')]
    s += [line(624,439,624,496,'#304932',5),line(574,476,671,476,'#304932',4),rect(562,504,124,7,'#263b26'),txt(415,430,'MERIDIAN-17',14,'#d3c59c',letter_spacing=3),txt(469,465,'ENTRY',8,'#bdc7a1'),rect(441,532,273,7,'#243b2a')]
    for x in range(21,370,39):s += [line(x,527,x,606,'#394c37',3),line(x,527,x+39,522,'#6a7759',2)]
    s += [path('M720 580L774 536L1090 560L1188 590','none',stroke='#3c523c',stroke_width=5)]
    for j in range(150):
        x=rng.randrange(w);y=rng.randrange(h);ln=rng.randrange(10,28)
        s += [line(x,y,x-4,y+ln,'#99b19b',.7,opacity='.11' if kind!='rain' else '.2')]
    if kind=='rain':
        for x,y,sc in [(248,596,1.1),(303,603,.85),(350,611,.75)]:
            s += [tag('g',circle(0,-41,9,'#07170f')+path('M-12 -29Q0 -35 12 -28L20 8L-19 8Z','#07170f')+line(-5,6,-11,36,'#07170f',7)+line(6,6,15,34,'#07170f',7),transform=f'translate({x} {y}) scale({sc})')]
        s += [rect(253,572,14,18,'#baa780',transform='rotate(-11 260 581)')]
    return ''.join(s)

def scene(kind):
    if kind in ['title','rain']:return svg(city(kind),1200,650,'Meridian-17 / '+kind)
    s=[rect(0,0,1200,650,'#1b3027')]
    if kind=='sealed':
        s += [rect(120,58,950,450,'#425541',stroke='#718166',stroke_width=8)]
        for y in range(70,500,36):s += [rect(131,y,928,27,'#384e3b'),line(132,y+29,1055,y+29,'#718161',2)]
        s += [rect(473,418,250,22,'#112319'),rect(498,425,200,7,'#a99b62'),rect(0,529,1200,121,'#253b2c'),path('M408 564L588 545L694 616L508 637Z','#d0c3a0'),path('M586 547L588 616','none',stroke='#6a754f',stroke_width=3),line(427,585,558,571,'#747753'),line(439,596,567,583,'#747753'),line(455,608,570,596,'#747753'),line(490,615,695,560,'#c8af69',4),txt(135,548,'INNER GATE / SEALED',13,'#bdc4a0')]
    elif kind=='ward':
        s += [path('M0 0L462 191L459 453L0 650Z','#3a4e43'),path('M1200 0L741 192L739 454L1200 650Z','#30483b'),rect(462,191,279,263,'#59705b'),rect(546,224,102,198,'#213c2a'),rect(555,236,84,49,'#9ca88b'),path('M0 650L459 453L739 454L1200 650Z','#546346')]
        for y in [477,502,536,588,642]:s += [line(0,y,1200,y,'#869274',2)]
        for x in range(-400,1700,230):s += [line(600,453,x,650,'#344b35',3)]
        for y,x,scale in [(470,176,1.6),(404,307,1),(363,377,.65),(470,930,1.6),(404,822,1),(363,774,.65)]:
            s += [tag('g',path('M-80 -20L64 -34L94 8L-57 24Z','#c1c2a1',stroke='#677359',stroke_width=2)+line(-60,24,-60,49,'#273f2b',5)+line(80,9,80,34,'#273f2b',5)+path('M-87 -28L-87 25M-90 -27L-40 -33','none',stroke='#9fac90',stroke_width=5),transform=f'translate({x} {y}) scale({scale})')]
        s += [rect(45,499,150,14,'#748063'),tag('ellipse',cx=119,cy=494,rx=35,ry=9,fill='#d0c397'),path('M84 492Q118 537 155 492Z','#a99968'),txt(485,215,'NAMES, NOT TOTALS',12,'#d4d3b0')]
    elif kind=='radio':
        s += [rect(703,36,390,338,'#13291e',stroke='#768969',stroke_width=7),circle(977,143,57,'#d3c083',opacity='.17'),path('M792 318L850 160L909 318M850 160L851 76M825 184L880 184M831 170L871 170','none',stroke='#687e62',stroke_width=3),rect(66,349,1070,229,'#46563c',stroke='#89956d',stroke_width=5),rect(101,385,492,98,'#132b1b',stroke='#748d5f',stroke_width=4)]
        for j in range(55):s += [line(117+j*8,439,117+j*8,407 if j%5==0 else 421,'#b2c387',1)]
        s += [line(347,396,347,469,'#dfbf74',3),txt(126,469,'INDEPENDENT CARRIER / 6.17 MHz',13,'#c3d5a4'),circle(695,429,48,'#1b3321',stroke='#a5ad79',stroke_width=6),line(695,429,712,397,'#dac895',4)]
        for y in range(379,491,9):s += [line(809,y,1080,y,'#172d1c',4)]
        for x in [148,224,300,376]:s += [circle(x,532,19,'#243c25',stroke='#a4b489',stroke_width=3)]
        s += [txt(478,543,'REPEAT THE NAMES BACK',17,'#d6c899'),path('M699 478Q639 593 822 610Q1094 630 1104 481','none',stroke='#0d2618',stroke_width=9),rect(51,591,340,14,'#b8aa7c'),txt(64,603,'R-84/17   /   CARBON 02',10,'#344930')]
    elif kind=='garden':
        s += [rect(45,31,1110,378,'#53694b'),circle(838,161,98,'#cfc591',opacity='.28')]
        for x in [45,210,379,547,715,883,1050,1150]:s += [line(x,31,600,407,'#1e3929',6),line(x,31,x,409,'#2f4a32',7)]
        for y in [142,270,409]:s += [line(45,y,1155,y,'#28452d',8)]
        s += [rect(0,412,1200,238,'#294730'),path('M187 505L244 505L233 594L198 594Z','#a29562'),path('M214 515Q222 380 217 256M219 381L168 309M219 397L281 323','none',stroke='#777250',stroke_width=11)]
        for x,y,rx,ry in [(156,305,62,44),(252,326,83,48),(216,251,71,66),(135,359,56,31),(291,377,65,42)]:s += [tag('ellipse',cx=x,cy=y,rx=rx,ry=ry,fill='#334d2c',stroke='#627b47',stroke_width=2)]
        for x,y in [(156,317),(248,313),(225,239),(286,388),(189,275),(270,351)]:s += [circle(x,y,12,'#c3a65b'),circle(x-3,y-4,3,'#e2c47e')]
        s += [path('M395 442L903 420L1033 505L486 554Z','#929267',stroke='#1a3c25',stroke_width=5),line(482,543,468,635,'#69815a',13),line(988,506,1004,595,'#69815a',12)]
        for x,y in [(474,383),(677,375),(892,363),(690,550)]:s += [path(f'M{x} {y+72}L{x-8} {y}L{x+80} {y-4}L{x+82} {y+64}M{x-8} {y+20}L{x+80} {y+17}','none',stroke='#b0b18b',stroke_width=8)]
        s += [tag('ellipse',cx=641,cy=470,rx=48,ry=17,fill='#c3c19d'),circle(636,467,10,'#b79c51'),circle(659,473,9,'#cab266'),txt(810,590,'KEEP A CHAIR',14,'#b5c294')]
    elif kind=='dawn':
        s += [rect(564,45,583,449,'#748867',stroke='#3d5940',stroke_width=12),circle(956,157,87,'#ddcd97',opacity='.8'),path('M575 400L745 293L821 310L911 251L1139 370L1139 485L575 485Z','#4e6d51'),line(857,44,857,494,'#243f2a',12),line(565,386,1144,386,'#314c30',8),rect(54,69,424,466,'#4c5d40',stroke='#96a17b',stroke_width=7)]
        for idx,x in enumerate([95,222,349]):
            s += [rect(x,161,76,244,'#1f3725',stroke='#829363',stroke_width=3),txt(x+23,135,'ABC'[idx],31,'#d1d3ab'),rect(x+19,230 if idx<2 else 343,38,24,'#cbb979' if idx<2 else '#738465'),line(x+36,408,x+36,501,'#bcad79' if idx<2 else '#243e2b',5),circle(x+36,193,5,'#b3cb8c' if idx<2 else '#3c5136')]
        s += [txt(98,459,'AIR',11),txt(226,459,'ALARM',11),txt(350,459,'REF',11),path('M593 523L890 531L1011 622L669 631Z','#d1c8a4'),line(675,549,912,607,'#777c54',2),txt(695,582,'C / CENSUS',17,'#375431',transform='rotate(8 695 582)'),circle(1051,549,11,'#ac9763',stroke='#d1bc7d',stroke_width=2)]
    return svg(''.join(s),1200,650,'The Night Window / '+kind+' ending illustration')

def main():
    for r in RES:
        dest=ROOT/'assets/portraits'/r['id'];dest.mkdir(parents=True,exist_ok=True)
        for variant in VARIANTS:(dest/(variant+'.svg')).write_text(portrait(r,variant))
    for kind in ['title','sealed','ward','rain','radio','garden','dawn']:
        (ROOT/'assets/scenes'/(kind+'.svg')).write_text(scene(kind))
    icon=svg(rect(0,0,96,96,'#1d3025')+path('M19 77L19 20L77 20L77 77Z','none',stroke='#d6bd7b',stroke_width=4)+path('M48 21L48 77M20 52L76 52','none',stroke='#d6bd7b',stroke_width=3)+rect(25,58,17,14,'#d6bd7b')+line(31,8,26,16,'#758d72',2)+line(64,4,58,13,'#758d72',2)+line(85,31,81,39,'#758d72',2),96,96,'The Night Window emblem')
    (ROOT/'assets/icon.svg').write_text(icon)
    thumb=scene('title').replace('</svg>',rect(33,25,501,136,'#101f19',opacity='.94')+txt(58,65,'THE NIGHT WINDOW',31,'#ebd8a2',letter_spacing=2)+txt(60,99,'MERIDIAN-17 / 1989',14,'#c0cbb1',letter_spacing=3)+txt(60,131,'Keep an independent copy.',16,'#c0cbb1')+'</svg>')
    (ROOT/'assets/thumbnail.svg').write_text(thumb)
    print(f'Generated {len(RES)*len(VARIANTS)} portraits, seven scenes, icon and thumbnail.')
if __name__=='__main__':main()
