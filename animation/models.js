/* Geometry uses metres. This is a process illustration, not a structural design. */
'use strict';
window.ClimbModels = (() => {
  const T = THREE;
  const mat = (color, extra = {}) => new T.MeshStandardMaterial({color, roughness:0.65, ...extra});
  function grain() {
    const canvas = document.createElement('canvas'); canvas.width=512; canvas.height=512;
    const c=canvas.getContext('2d'); c.fillStyle='#dab884'; c.fillRect(0,0,512,512);
    let seed=19; const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
    for(let i=0;i<850;i++) {
      const y=random()*512; c.beginPath(); c.lineWidth=.3+random()*.8;
      c.strokeStyle=`rgba(${random()>.3?'115,76,36':'255,238,192'},${.025+random()*.08})`;
      for(let x=0;x<=512;x+=8){const py=y+Math.sin(x/72+y/35)*2+Math.sin(x/39)*.7;if(x===0)c.moveTo(x,py);else c.lineTo(x,py);}c.stroke();
    }
    const texture=new T.CanvasTexture(canvas); texture.colorSpace=T.SRGBColorSpace; return texture;
  }
  const wood=mat('#ffffff',{map:grain()}), edge=mat('#b99a6a'), timber=mat('#c6a375',{map:grain()}), metal=mat('#b8c4c3',{metalness:.75,roughness:.28}), dark=mat('#263c3c'), teal=mat('#397e74'), black=mat('#283434');
  function mesh(geometry,material,parent,x=0,y=0,z=0) {const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;if(parent)parent.add(m);return m;}
  function box(parent,w,h,d,material,x=0,y=0,z=0){return mesh(new T.BoxGeometry(w,h,d),material,parent,x,y,z);}
  function cylinder(parent,r,h,material,x=0,y=0,z=0,r2=r){return mesh(new T.CylinderGeometry(r,r2,h,24),material,parent,x,y,z);}
  function line(parent,points,color='#64866a') {const l=new T.Line(new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p))),new T.LineBasicMaterial({color}));parent.add(l);return l;}
  function label(parent,text,x,y,z,width=.65) {
    const c=document.createElement('canvas');c.width=768;c.height=96;const ctx=c.getContext('2d');
    ctx.font='500 35px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#456251';ctx.fillText(text,384,48);
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
    const s=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false,toneMapped:false}));s.position.set(x,y,z);s.scale.set(width,width/8,1);parent.add(s);return s;
  }
  const holes=[];
  for(let row=0;row<7;row++)for(let col=0;col<7;col++)holes.push({x:-.48+col*.16,y:-.48+row*.16});
  const shape=new T.Shape();shape.moveTo(-.6,-.6);shape.lineTo(.6,-.6);shape.lineTo(.6,.6);shape.lineTo(-.6,.6);shape.closePath();
  for(const p of holes){const h=new T.Path();h.absarc(p.x,p.y,.006,0,Math.PI*2,true);shape.holes.push(h);}
  const panelGeometry=new T.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:false,curveSegments:8});
  function panel(parent){const g=new T.Group();parent.add(g);mesh(panelGeometry,[wood,edge],g);
    for(let i=1;i<9;i++){const z=.018*i/9;line(g,[[-.6,-.6001,z],[.6,-.6001,z],[.6001,-.6,z],[.6001,.6,z],[-.6,.6001,z],[-.6001,-.6,z]],i%2?'#96784f':'#d7bb89');}return g;}
  function tnut(parent,x,y,z,scale=1){
    const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);parent.add(g);
    const flange=new T.Shape();flange.absellipse(0,0,.018,.012,0,Math.PI*2,false,0);
    const bore=new T.Path();bore.absarc(0,0,.005,0,Math.PI*2,true);flange.holes.push(bore);
    for(const sx of [-.012,.012]){const p=new T.Path();p.absarc(sx,0,.0016,0,Math.PI*2,true);flange.holes.push(p);}
    const f=mesh(new T.ExtrudeGeometry(flange,{depth:.002,bevelEnabled:false,curveSegments:10}),metal,g,0,0,-.002);
    const ring=new T.Shape();ring.absarc(0,0,.006,0,Math.PI*2,false);const inner=new T.Path();inner.absarc(0,0,.0048,0,Math.PI*2,true);ring.holes.push(inner);
    mesh(new T.ExtrudeGeometry(ring,{depth:.013,bevelEnabled:false,curveSegments:10}),metal,g);
    const screws=[];
    for(const sx of [-.012,.012]){const sg=new T.Group();g.add(sg);sg.position.set(sx,0,0);const sh=cylinder(sg,.0014,.009,metal,0,0,.0025);sh.rotation.x=Math.PI/2;const head=cylinder(sg,.0027,.002,metal,0,0,-.003);head.rotation.x=Math.PI/2;box(sg,.0035,.0006,.0004,dark,0,0,-.0041);screws.push(sg);}
    g.userData.screws=screws;return g;
  }
  function cnc(){
    const root=new T.Group();
    box(root,1.74,.12,1.68,dark,0,.58,0);box(root,1.52,.035,1.5,edge,0,.657,0);
    for(const x of [-.71,.71])for(const z of [-.68,.68]){box(root,.075,.57,.075,metal,x,.25,z);box(root,.15,.04,.15,black,x,-.015,z);}
    box(root,1.44,.06,.06,metal,0,.18,-.68);box(root,1.44,.06,.06,metal,0,.18,.68);
    const board=panel(root);board.rotation.x=-Math.PI/2;board.position.y=.68;
    const plugs=holes.map(p=>{const m=cylinder(board,.006,.018,wood,p.x,p.y,.009);m.rotation.x=Math.PI/2;return m;});
    for(const z of [-.634,.634])box(root,1.336,.018,.065,wood,0,.689,z);
    for(const x of [-.634,.634])box(root,.065,.018,1.2,wood,x,.689,0);
    for(const x of [-.81,.81]){box(root,.065,.10,1.70,metal,x,.70,0);box(root,.026,.018,1.65,dark,x,.757,0);}
    const gantry=new T.Group();root.add(gantry);
    for(const x of [-.81,.81]){box(gantry,.12,.38,.18,teal,x,.90,0);box(gantry,.16,.04,.23,metal,x,.76,0);}
    box(gantry,1.72,.15,.12,metal,0,1.09,0);box(gantry,1.53,.025,.02,dark,0,1.08,.072);
    const carriage=new T.Group();gantry.add(carriage);box(carriage,.20,.26,.09,teal,0,1.09,.10);
    const spindle=new T.Group();carriage.add(spindle);cylinder(spindle,.051,.20,metal,0,.96,.13);cylinder(spindle,.032,.045,dark,0,.835,.13);cylinder(spindle,.003,.075,metal,0,.78,.13);
    const shoe=cylinder(spindle,.077,.035,black,0,.787,.13);shoe.material=mat('#314440',{transparent:true,opacity:.65});
    const hosePoints=[];for(let i=0;i<=30;i++){const t=i/30;hosePoints.push(new T.Vector3(.025+Math.sin(t*Math.PI)*.15,1.02+t*.39,.13-t*.22));}
    mesh(new T.TubeGeometry(new T.CatmullRomCurve3(hosePoints),32,.031,12,false),mat('#a8b0a3'),carriage);
    const outline=line(root,[[-.6,.7,.6],[.6,.7,.6],[.6,.7,-.6],[-.6,.7,-.6],[-.6,.7,.6]],'#3d8172');
    label(root,'1200 × 1200 mm',0,.62,1.00,.92);line(root,[[-.6,.63,.84],[.6,.63,.84]]);for(const x of [-.6,.6])line(root,[[x,.63,.81],[x,.63,.87]]);
    const path=[];for(let row=0;row<7;row++)for(let c=0;c<7;c++){const col=row%2?6-c:c;path.push(row*7+col);}
    return {root,board,plugs,gantry,carriage,spindle,outline,path};
  }
  function nuts(){
    const root=new T.Group();
    for(const x of [-.43,.43]){box(root,.10,.055,1.38,dark,x,.65,0);for(const z of [-.5,.5]){const leg=box(root,.06,.64,.065,timber,x,.31,z);leg.rotation.x=z>0?-.12:.12;}box(root,.06,.06,1.06,timber,x,.25,0);}
    const board=panel(root);board.rotation.x=Math.PI/2;board.position.y=.72;
    const nuts=holes.map(p=>tnut(board,p.x,p.y,-.3));
    label(root,'BACK FACE ↑',0,.77,.78,.72);
    // Enlarged independent section makes the connection readable at actual panel scale.
    const detail=new T.Group();root.add(detail);detail.position.set(1.12,.91,0);detail.rotation.y=-.3;
    const section=new T.Shape();section.moveTo(-.165,-.165);section.lineTo(.165,-.165);section.lineTo(.165,.165);section.lineTo(-.165,.165);section.closePath();
    const sectionHole=new T.Path();sectionHole.absarc(0,0,.018,0,Math.PI*2,true);section.holes.push(sectionHole);
    mesh(new T.ExtrudeGeometry(section,{depth:.054,bevelEnabled:false,curveSegments:12}),[wood,edge],detail,0,0,-.027);
    const nut=tnut(detail,0,0,-.22,3);
    const hold=mesh(new T.DodecahedronGeometry(.105,1),mat('#c57745'),detail,0,0,.23);hold.scale.set(1, .8,.7);
    const bolt=new T.Group();detail.add(bolt);const sh=cylinder(bolt,.014,.18,metal);sh.rotation.x=Math.PI/2;const head=cylinder(bolt,.026,.025,dark,0,0,.098);head.rotation.x=Math.PI/2;bolt.position.z=.46;
    label(root,'CONNECTION · ENLARGED',1.12,1.30,0,1.10);
    label(root,'Rear flange / front bolt',1.12,.62,0,1.0);
    return {root,board,nuts,detail,nut,hold,bolt};
  }
  function wall(){
    const root=new T.Group();const support=new T.Group();root.add(support);
    for(const x of [-1.185,-.525,0,.525,1.185])box(support,.07,2.50,.115,timber,x,1.27,-.16);
    for(const y of [.055,1.265,2.475])box(support,2.51,.075,.115,timber,0,y,-.16);
    // Continuous conceptual landing mat; no approved dimensions implied.
    for(const x of [-.74,.74])for(const z of [.55,1.75]){box(root,1.465,.12,1.18,black,x,.04,z);box(root,1.46,.003,1.175,mat('#384541'),x,.102,z);}
    const boards=[], holds=[], bolts=[], fixings=[];
    const colors=['#d38042','#3e8c8d','#caaf52','#807194','#607c43'];
    const places=[[1,1],[4,2],[2,4],[5,5],[1,5]];
    for(let row=0;row<2;row++)for(let col=0;col<2;col++){
      const b=panel(root);b.position.set(col===0?-.605:.605,row===0?.66:1.87,.8);boards.push(b);
      for(const p of holes)tnut(b,p.x,p.y,0);
      for(const x of [-.58,.58])for(const y of [-.59,0,.59]){const screw=cylinder(b,.0045,.005,metal,x,y,.021);screw.rotation.x=Math.PI/2;fixings.push({mesh:screw,board:boards.length-1});}
      places.forEach(([cx,cy],i)=>{const hi=(i+col+row*2)%5;const p=holes[cy*7+cx];const h=new T.Group();b.add(h);h.position.set(p.x,p.y,.4);const hold=mesh(new T.DodecahedronGeometry(.055+(i%2)*.018,1),mat(colors[hi]),h,0,0,.045);hold.scale.set(1.1,.85,.65);hold.rotation.z=i*1.4;const washer=cylinder(h,.009,.003,metal,0,0,.081);washer.rotation.x=Math.PI/2;const bolt=new T.Group();h.add(bolt);const shaft=cylinder(bolt,.0045,.085,metal,0,0,.046);shaft.rotation.x=Math.PI/2;const head=cylinder(bolt,.008,.008,dark,0,0,.092);head.rotation.x=Math.PI/2;holds.push(h);bolts.push(bolt);});
    }
    return {root,support,boards,holds,bolts,fixings};
  }
  return {cnc,nuts,wall,holes};
})();
