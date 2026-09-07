const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1024}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    await page.waitForFunction(()=>window.climbAnimation);
    const geometry=await page.evaluate(()=>{
      const wall=ClimbModels.wall();
      const supports=wall.support.children.map(s=>new THREE.Box3().setFromObject(s));
      let obstructedHoles=0,unsupportedFixings=0;
      wall.boards.forEach(b=>ClimbModels.holes.forEach(h=>{
        const x=b.position.x+h.x,y=b.position.y+h.y;
        if(supports.some(s=>x+.018>s.min.x&&x-.018<s.max.x&&y+.012>s.min.y&&y-.012<s.max.y))obstructedHoles++;
      }));
      wall.fixings.forEach(({mesh,board})=>{
        const b=wall.boards[board],x=b.position.x+mesh.position.x,y=b.position.y+mesh.position.y;
        if(!supports.some(s=>x-.0045>=s.min.x&&x+.0045<=s.max.x&&y-.0045>=s.min.y&&y+.0045<=s.max.y))unsupportedFixings++;
      });
      return {obstructedHoles,unsupportedFixings};
    });
    assert.deepEqual(geometry,{obstructedHoles:0,unsupportedFixings:0},'Hold grid must clear frame members; panel fixings must land on supports');
    await page.evaluate(()=>climbAnimation.seek(7));
    await page.getByRole('button',{name:'Play animation',exact:true}).click();
    await page.waitForTimeout(350);
    assert((await page.evaluate(()=>climbAnimation.getState())).time>7,'Playback must advance');
    await page.getByRole('button',{name:'Pause animation',exact:true}).click();
    const paused=await page.evaluate(()=>climbAnimation.getState().time);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(()=>climbAnimation.getState().time),paused,'Pause must freeze the timeline');
    for(let i=0;i<3;i++){
      await page.locator(`[data-stage="${i}"]`).click();
      const state=await page.evaluate(()=>climbAnimation.getState());
      assert.equal(state.stage,i);assert.equal(state.time,14*i);
      assert.equal(await page.locator('.chapter[aria-current="step"]').count(),1);
      await page.evaluate(t=>climbAnimation.seek(t),[7,23,41][i]);
      await page.waitForTimeout(250);
      await page.screenshot({path:path.join(__dirname,`stage-${i+1}.png`)});
    }
    await page.locator('#timeline').fill('17.5');
    assert.equal(await page.evaluate(()=>climbAnimation.getState().time),17.5);
    await page.locator('#speed').selectOption('2');
    assert.equal(await page.evaluate(()=>climbAnimation.getState().speed),2);
    const rect=await page.locator('#viewport').boundingBox();
    await page.mouse.move(rect.x+rect.width*.7,rect.y+rect.height*.6);
    await page.mouse.down();await page.mouse.move(rect.x+rect.width*.7+60,rect.y+rect.height*.6+15);await page.mouse.up();
    assert.notEqual(await page.evaluate(()=>climbAnimation.getState().orbitX),0);
    await page.mouse.wheel(0,-150);await page.waitForTimeout(100);
    assert((await page.evaluate(()=>climbAnimation.getState().zoom))>1);
    await page.getByRole('button',{name:'Reset camera'}).click();
    assert.equal(await page.evaluate(()=>climbAnimation.getState().zoom),1);
    assert.equal(await page.evaluate(()=>climbAnimation.getState().orbitX),0);
    await page.evaluate(()=>climbAnimation.seek(41.95));
    await page.getByRole('button',{name:'Play animation',exact:true}).click();await page.waitForTimeout(200);
    const end=await page.evaluate(()=>climbAnimation.getState());
    assert.equal(end.time,42);assert.equal(end.playing,false);assert.equal(end.visiblePanels,4);assert.equal(end.visibleHolds,20);
    await page.getByRole('button',{name:'Restart animation'}).click();
    assert((await page.evaluate(()=>climbAnimation.getState().time))<1);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.reload();await page.waitForFunction(()=>window.climbAnimation);
    assert.equal(await page.evaluate(()=>climbAnimation.getState().playing),false);
    await page.setViewportSize({width:390,height:844});
    for(let i=0;i<3;i++){
      await page.evaluate(t=>climbAnimation.seek(t),[7,23,41][i]);
      await page.waitForTimeout(250);
      await page.screenshot({path:path.join(__dirname,`mobile-${i+1}.png`),fullPage:true});
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Mobile must not overflow horizontally');
    assert.deepEqual(errors,[]);
    console.log('PASS: playback, pause, chapters, scrubbing, speed, orbit, zoom, reset, completion, replay, reduced motion, mobile layout; no browser errors.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
