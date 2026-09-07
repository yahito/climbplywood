// Dev dependencies: Playwright with Chrome, and ffmpeg on PATH.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

(async()=>{
  const out=path.resolve(__dirname,'../../output/animation');fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const fps=24,seconds=42;
  const encoder=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-vcodec','mjpeg','-i','pipe:0','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,'climbing-wall-process.mp4')],{stdio:['pipe','inherit','inherit']});
  let encoderError=null;encoder.on('error',e=>encoderError=e);encoder.stdin.on('error',e=>encoderError=e);
  const closed=once(encoder,'close');
  try {
    const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    await page.waitForFunction(()=>window.climbAnimation);
    await page.addStyleTag({content:'*{transition:none!important} .view-tools{display:none}'});
    for(let frame=0;frame<fps*seconds;frame++){
      if(encoderError)throw encoderError;
      await page.evaluate(t=>{climbAnimation.seek(t);document.getElementById('play').textContent='Ⅱ';},frame/fps);
      const buffer=await page.screenshot({type:'jpeg',quality:92});
      if(!encoder.stdin.write(buffer))await once(encoder.stdin,'drain');
      if(frame%(fps*7)===0)console.log(`Exported ${frame/fps} / ${seconds} seconds`);
    }
    encoder.stdin.end();const [code]=await closed;if(code!==0)throw Error(`ffmpeg exited ${code}`);
    console.log(path.join(out,'climbing-wall-process.mp4'));
  } catch(error){encoder.kill();throw error;} finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
