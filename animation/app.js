'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const viewport=$('viewport'), duration=42, stageLength=14;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
  const mix=(a,b,v)=>a+(b-a)*v;
  const chapters=[...document.querySelectorAll('.chapter')];
  const copy=[
    {phase:'PRECISION / PREPARATION',title:'Cut & drill.',description:'A CNC router drills the hole grid before cutting the panel perimeter.',tags:['BIRCH PLYWOOD','18 MM']},
    {phase:'HARDWARE / CONNECTION',title:'Built from the back.',description:'T-nut barrels enter from the rear. Short retaining screws secure each flange.',tags:['REAR T-NUTS','FRONT HOLD BOLTS']},
    {phase:'ASSEMBLY / MOVEMENT',title:'Make your next move.',description:'Panels meet over frame supports. Holds attach through the front into rear T-nuts.',tags:['4 PANELS','SEPARATE PANEL FIXINGS']}
  ];
  let renderer;
  try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});}
  catch(error){$('webgl-error').hidden=false;console.error(error);return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#e8ece2');
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.32;
  viewport.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e8ece2');scene.fog=new THREE.Fog('#e8ece2',11,24);
  const camera=new THREE.OrthographicCamera(-3,3,2,-2,.01,50);
  scene.add(new THREE.HemisphereLight('#fff9e8','#8c9c82',2.1));
  const key=new THREE.DirectionalLight('#fff8e8',3.0);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-4,right:4,top:5,bottom:-4,near:.1,far:20});key.shadow.normalBias=.025;key.shadow.bias=-.0002;scene.add(key);
  const fill=new THREE.DirectionalLight('#dcece6',.8);fill.position.set(4,3,-4);scene.add(fill);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#e8ece2',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.045;ground.receiveShadow=true;scene.add(ground);
  const models=[ClimbModels.cnc(),ClimbModels.nuts(),ClimbModels.wall()];models.forEach(m=>scene.add(m.root));
  let time=0,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,speed=1,currentStage=-1,last=performance.now();
  let orbitX=0,orbitY=0,zoom=1,drag=null;
  function cameraView(stage){
    const mobile=viewport.clientWidth<760;
    const height=([2.35,2.3,3.6][stage])*(mobile?1.90:1);
    const aspect=viewport.clientWidth/viewport.clientHeight;
    camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;camera.zoom=zoom;
    const azimuth=[.58,.64,.42][stage]+orbitX, elevation=clamp([.58,.74,.23][stage]+orbitY,.08,1.48);
    const target=new THREE.Vector3(stage===1?.28:0,[.67,.71,1.15][stage]);
    camera.position.set(target.x+5*Math.sin(azimuth)*Math.cos(elevation),target.y+5*Math.sin(elevation),5*Math.cos(azimuth)*Math.cos(elevation));camera.lookAt(target);
    camera.setViewOffset(viewport.clientWidth,viewport.clientHeight,mobile?0:-viewport.clientWidth*.115,mobile?-viewport.clientHeight*.20:0,viewport.clientWidth,viewport.clientHeight);
    camera.updateProjectionMatrix();
  }
  function cncAt(t){
    const m=models[0];let x,z,lift,operation;
    const progress=clamp((t-.8)/9.1)*49;
    const completed=Math.min(49,Math.floor(progress));
    m.plugs.forEach(p=>p.visible=true);for(let i=0;i<completed;i++)m.plugs[m.path[i]].visible=false;
    if(t<10){
      const n=Math.min(48,completed),p=ClimbModels.holes[m.path[n]],prev=ClimbModels.holes[m.path[Math.max(0,n-1)]],f=progress%1;
      const travel=ease(f/.45);x=mix(prev.x,p.x,travel);z=-mix(prev.y,p.y,travel);
      lift=f<.45?.055:f<.72?mix(.055,-.043,ease((f-.45)/.27)):mix(-.043,.055,ease((f-.72)/.28));
      if(t<.8){x=-.48;z=.48;lift=.10;}
      operation=t<.8?'Vacuum workholding · preparing the tool':`Drilling hole ${Math.min(completed+1,49)} / 49`;
      m.outline.visible=false;
    }else{
      const p=clamp((t-10)/2.8)*4,side=Math.min(3,Math.floor(p)),f=p-side;
      const corners=[[-.6,.6],[.6,.6],[.6,-.6],[-.6,-.6],[-.6,.6]];
      x=mix(corners[side][0],corners[side+1][0],f);z=mix(corners[side][1],corners[side+1][1],f);lift=t<12.8?-.043:mix(-.043,.23,ease((t-12.8)/.8));
      m.outline.visible=true;m.outline.geometry.setDrawRange(0,Math.min(5,Math.floor(p)+1));
      operation=t<12.8?'Perimeter cut · holes completed first':'Machining complete · sand edges next';
    }
    m.gantry.position.z=z-.13;m.carriage.position.x=x;m.spindle.position.y=lift;
    return operation;
  }
  function nutsAt(t){
    const m=models[1];
    m.nuts.forEach((n,i)=>{const p=ease((t-1-i*.085)/1.25);n.position.z=mix(-.25,0,p);n.visible=t>.35+i*.055;
      n.userData.screws.forEach(s=>{const sp=ease((t-6-i*.038)/1.1);s.position.z=mix(-.035,0,sp);s.rotation.z=(1-sp)*Math.PI*6;s.visible=t>5.7;});
    });
    const p=ease((t-9)/3);
    m.nut.position.z=mix(-.22,-.027,p);m.hold.position.z=mix(.23,.10,p);m.bolt.position.z=mix(.46,.096,p);
    m.bolt.rotation.z=(1-p)*Math.PI*6;
    return t<1?'Panel face down · rear face up':t<6?'Insert barrels · flanges remain on rear face':t<9?'Secure flanges with short retaining screws':'Detail: hold bolt enters from the climbing side';
  }
  function wallAt(t){
    const m=models[2];
    m.boards.forEach((b,i)=>{const p=ease((t-.8-i*1.15)/1.7);b.visible=t>.5+i*.65;b.position.z=mix(.9,0,p);});
    m.fixings.forEach(({mesh,board})=>{const p=ease((t-5-board*.25)/1.2);mesh.visible=t>5;mesh.position.z=mix(.09,.021,p);});
    m.holds.forEach((h,i)=>{const p=ease((t-7-i*.10)/1.0);h.visible=t>6.8+i*.10;h.position.z=mix(.38,.018,p);const b=ease((t-8-i*.10)/1.1);m.bolts[i].position.z=mix(.14,0,b);m.bolts[i].rotation.z=(1-b)*Math.PI*4;});
    return t<5.4?'Seat panels · support every panel joint':t<7?'Attach panels to the frame with separate fasteners':t<11.5?'Fit holds · tighten bolts from the front':'Wall assembled · continuous bouldering matting below';
  }
  function renderAt(seconds){
    time=clamp(seconds,0,duration);const stage=Math.min(2,Math.floor(time/stageLength)),t=time-stage*stageLength;
    if(stage!==currentStage){currentStage=stage;const c=copy[stage];$('phase').textContent=c.phase;$('scene-title').textContent=c.title;$('scene-description').textContent=c.description;
      $('tags').replaceChildren(...c.tags.map(text=>{const e=document.createElement('span');e.textContent=text;return e;}));
      $('scene-index').textContent=`0${stage+1} / 03`;chapters.forEach((b,i)=>{b.classList.toggle('active',i===stage);if(i===stage)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
    }
    models.forEach((m,i)=>m.root.visible=i===stage);
    $('operation').textContent=[cncAt,nutsAt,wallAt][stage](t);
    $('timeline').value=String(time);$('timeline').setAttribute('aria-valuetext',`${Math.floor(time)} seconds, ${copy[stage].title}`);
    $('time').textContent=`00:${String(Math.floor(time)).padStart(2,'0')}`;
    cameraView(stage);renderer.render(scene,camera);
  }
  function setPlaying(value){playing=value;$('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause animation':'Play animation');}
  function resize(){renderer.setSize(viewport.clientWidth,viewport.clientHeight);renderAt(time);}
  new ResizeObserver(resize).observe(viewport);
  $('play').addEventListener('click',()=>{if(time===duration)time=0;setPlaying(!playing);});
  $('restart').addEventListener('click',()=>{orbitX=orbitY=0;zoom=1;renderAt(0);setPlaying(true);});
  $('timeline').addEventListener('input',e=>renderAt(Number(e.target.value)));
  $('speed').addEventListener('change',e=>speed=Number(e.target.value));
  chapters.forEach((b,i)=>b.addEventListener('click',()=>{orbitX=orbitY=0;zoom=1;renderAt(i*stageLength);}));
  $('reset-view').addEventListener('click',()=>{orbitX=orbitY=0;zoom=1;renderAt(time);});
  viewport.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');});
  viewport.addEventListener('pointermove',e=>{if(!drag)return;orbitX-=(e.clientX-drag.x)*.008;orbitY+=(e.clientY-drag.y)*.005;drag={x:e.clientX,y:e.clientY};renderAt(time);});
  const endDrag=()=>{drag=null;viewport.classList.remove('dragging');};viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);
  viewport.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom*Math.exp(-e.deltaY*.001),.65,2.2);renderAt(time);},{passive:false});
  document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','SELECT','BUTTON','A'].includes(document.activeElement.tagName)){e.preventDefault();if(time===duration)time=0;setPlaying(!playing);}});
  document.addEventListener('visibilitychange',()=>last=performance.now());
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');reduced.addEventListener('change',e=>{if(e.matches)setPlaying(false);});
  // Deterministic seeking also supports frame exports without real-time capture drift.
  window.climbAnimation={duration,seek(seconds){setPlaying(false);renderAt(seconds);},getState(){return {time,playing,stage:currentStage,speed,zoom,orbitX,orbitY,visiblePanels:models[2].boards.filter(b=>b.visible).length,visibleHolds:models[2].holds.filter(h=>h.visible).length};}};
  setPlaying(playing);resize();
  function frame(now){const dt=Math.min((now-last)/1000,.1);last=now;if(playing&&!document.hidden){time+=dt*speed;if(time>=duration){time=duration;setPlaying(false);}renderAt(time);}requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
})();
