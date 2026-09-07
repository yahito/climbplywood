'use strict';
(() => {
  const M=CostModel,$=id=>document.getElementById(id),storageKey='climb-budget-v1';
  const euro=cents=>new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR'}).format(cents/100);
  let config=M.defaultConfig('value'),result=null,localDeliveryEdited=false;
  try {const stored=JSON.parse(localStorage.getItem(storageKey));if(stored){M.estimate(stored);config=stored;}}catch{}
  const rows=new Map();
  for(const component of M.components){
    const tr=document.createElement('tr');tr.dataset.component=component.id;
    tr.innerHTML=`<td><div class="component-name">${component.name}</div><p class="component-note">${component.note}</p><span class="component-reference"></span></td><td class="component-quantity"></td><td><label><span class="sr-only">${component.name} price (EUR)</span><input type="number" min="0" max="100000" step="0.01" data-price="${component.id}"></label><span class="unit-label"></span></td><td class="component-total"></td>`;
    $('component-rows').appendChild(tr);rows.set(component.id,tr);
    tr.querySelector('input').addEventListener('input',update);
  }
  function syncControls(){
    $('budget-panels').value=config.panels;$('budget-holds').value=config.holds;$('budget-contingency').value=config.contingency;$('budget-pack').value=config.holdPack;
    for(const c of M.components)rows.get(c.id).querySelector('input').value=config.prices[c.id];
    $('preset-value').setAttribute('aria-pressed',String(config.preset==='value'));$('preset-retail').setAttribute('aria-pressed',String(config.preset==='retail'));
  }
  function readNumber(id){return $(id).value===''?NaN:$(id).valueAsNumber;}
  function update(){
    const panelCount=readNumber('budget-panels');
    if(Number.isInteger(panelCount)&&panelCount>=1&&panelCount<=24)$('budget-holds').max=Math.min(1000,panelCount*49);
    const next={...config,panels:readNumber('budget-panels'),holds:readNumber('budget-holds'),contingency:readNumber('budget-contingency'),holdPack:Number($('budget-pack').value),prices:{}};
    for(const c of M.components){const input=rows.get(c.id).querySelector('input');next.prices[c.id]=input.value===''?NaN:input.valueAsNumber;input.setAttribute('aria-invalid',String(!input.validity.valid||input.value===''));}
    try{result=M.estimate(next);config=next;$('budget-error').hidden=true;}
    catch{
      result=null;$('budget-error').hidden=false;$('budget-error').textContent='Enter whole quantities within the shown limits (up to 49 installed holds per panel), a contingency from 0–100%, and non-negative prices. Fill every price; use 0 for items you already own.';
      for(const id of ['budget-total','budget-subtotal','budget-reserve','budget-transport'])$(id).textContent='—';
      $('budget-comparison').textContent='Complete the inputs to calculate the estimate.';$('cost-breakdown').replaceChildren();
      for(const tr of rows.values())tr.querySelector('.component-total').textContent='—';
      compareQuote();return;
    }
    try{localStorage.setItem(storageKey,JSON.stringify(config));}catch{}
    for(const row of result.rows){
      const tr=rows.get(row.id);tr.querySelector('.component-quantity').textContent=row.quantity;
      tr.querySelector('.component-total').textContent=euro(row.totalCents);
      tr.querySelector('.unit-label').textContent=row.id==='holds'?`${config.holdPack}-hold pack`:row.unit;
      let source=row.source,reference=row.price;
      if(row.id==='plywood'&&config.preset==='value'){source=M.sources.valuePlywood;reference=95.48;}
      if(row.id==='holds'&&config.holdPack===100){source=M.sources.bulkHolds;reference=249.95;}
      if(row.id==='holds')tr.querySelector('.component-note').textContent=config.holdPack===100?'100-hold Euroholds Starter Pack reference, with a mix of hold sizes. Hardware excluded; surplus holds stay in the purchase total.':row.note;
      const custom=Math.round(config.prices[row.id]*100)!==Math.round(reference*100);
      const badge=tr.querySelector('.component-reference');
      if(source){badge.innerHTML=`<a class="component-source" href="${source}" target="_blank" rel="noopener noreferrer">Supplier reference ${euro(Math.round(reference*100))} ↗</a>${custom?' <span class="component-kind">· EDITED</span>':''}`;}
      else badge.innerHTML=`<span class="component-kind">${row.id==='labour'&&row.totalCents===0?'NOT INCLUDED':custom?'YOUR BUDGET INPUT':'BUDGET ALLOWANCE'}</span>`;
    }
    const facts=[`${result.area.toFixed(2)} m² of wall`,`${Math.ceil(config.panels/2)} full sheets`,`${result.nuts} T-nuts`,`${result.retainingScrews} retaining screws`,`${result.purchasedHolds} holds purchased / ${config.holds} installed`];
    $('budget-facts').replaceChildren(...facts.map(text=>{const span=document.createElement('span');span.textContent=text;return span;}));
    $('budget-total').textContent=euro(result.totalCents);$('budget-subtotal').textContent=euro(result.subtotalCents);$('budget-reserve').textContent=euro(result.contingencyCents);$('reserve-percent').textContent=`${config.contingency}%`;
    const groups={};for(const row of result.rows)groups[row.group]=(groups[row.group]||0)+row.totalCents;
    $('budget-transport').textContent=euro(groups.Transport);
    $('cost-breakdown').replaceChildren(...Object.entries(groups).filter(([,cost])=>cost>0).sort((a,b)=>b[1]-a[1]).map(([name,cost])=>{
      const div=document.createElement('div');div.className='breakdown-line';div.innerHTML=`<div><span>${name}</span><span>${euro(cost)}</span></div><div class="breakdown-track"><span style="width:${result.subtotalCents?100*cost/result.subtotalCents:0}%"></span></div>`;return div;
    }));
    const retail=M.estimate({...config,holdPack:20,prices:{...config.prices,plywood:204.22,holds:111.03}}),difference=retail.totalCents-result.totalCents;
    $('budget-comparison').textContent=difference===0?'Retail sheet and hold references, with your other budget inputs.':`${euro(Math.abs(difference))} ${difference>0?'less':'more'} than retail sheet and hold references, with the same other inputs and contingency.`;
    $('labour-note').textContent=config.prices.labour===0?'Design, paid installation and tools are excluded until you enter a quote.':'Your design / installation budget is included. Check that it covers all paid work and tool hire.';
    $('wood-saving').textContent=`${euro(Math.ceil(config.panels/2)*(20422-9548))} less in sheet costs.`;
    const small=Math.ceil(config.holds/20)*11103,bulk=Math.ceil(config.holds/100)*24995;
    $('hold-saving').textContent=config.holds===0?'No holds budgeted.':bulk<small?'Bulk lowers the goods total.':'The smaller set costs less.';
    $('hold-comparison').textContent=`For ${config.holds} installed holds: ${Math.ceil(config.holds/20)} × 20-hold sets = ${euro(small)}; ${Math.ceil(config.holds/100)} × 100-hold packs = ${euro(bulk)}. Bulk reference: €249.95 on sale; bolts excluded.`;
    $('mat-cost').textContent=`${euro(Math.round((config.prices.matting+config.prices.matfreight)*100))} with delivery budgeted.`;
    compareQuote();
  }
  function applyPreset(preset){
    const panels=config.panels,holds=config.holds,contingency=config.contingency,prices={...config.prices};
    config=M.defaultConfig(preset);Object.assign(config,{panels,holds,contingency,prices:{...prices,plywood:config.prices.plywood,holds:111.03}});
    if(preset==='value'&&Math.ceil(holds/100)*24995<Math.ceil(holds/20)*11103){config.holdPack=100;config.prices.holds=249.95;}
    syncControls();update();resetQuote();
  }
  $('preset-value').addEventListener('click',()=>applyPreset('value'));
  $('preset-retail').addEventListener('click',()=>applyPreset('retail'));
  $('budget-reset').addEventListener('click',()=>{config=M.defaultConfig('value');syncControls();update();resetQuote();});
  for(const id of ['budget-panels','budget-holds','budget-contingency'])$(id).addEventListener('input',update);
  $('budget-pack').addEventListener('change',()=>{config.holdPack=Number($('budget-pack').value);config.prices.holds=config.holdPack===100?249.95:111.03;rows.get('holds').querySelector('input').value=config.prices.holds;update();});
  $('use-value-wood').addEventListener('click',()=>{config.preset='value';config.prices.plywood=95.48;rows.get('plywood').querySelector('input').value=95.48;$('preset-value').setAttribute('aria-pressed','true');$('preset-retail').setAttribute('aria-pressed','false');update();});
  $('use-best-holds').addEventListener('click',()=>{const bulk=Math.ceil(config.holds/100)*24995<Math.ceil(config.holds/20)*11103;config.holdPack=bulk?100:20;config.prices.holds=bulk?249.95:111.03;$('budget-pack').value=config.holdPack;rows.get('holds').querySelector('input').value=config.prices.holds;update();});
  function quoteBasis(){
    if(!result)return null;const id=$('quote-component').value,row=result.rows.find(r=>r.id===id);
    return {row,required:id==='holds'?config.holds:row.quantity,unit:id==='holds'?'holds':id==='plywood'?'full sheets':'complete landing-area solution',freight:config.prices[id==='plywood'?'delivery':id==='holds'?'parcel':'matfreight']};
  }
  function resetQuote(){
    localDeliveryEdited=false;
    const basis=quoteBasis();if(basis){$('quote-quantity').value=Math.max(1,basis.required);$('quote-local-freight').value=basis.freight;}
    for(const id of ['quote-goods','quote-freight','quote-duty','quote-fees'])$(id).value='';compareQuote();
  }
  function compareQuote(){
    const imported=$('quote-origin').value==='import';document.querySelectorAll('.import-field').forEach(e=>e.hidden=!imported);$('import-note').hidden=!imported;
    const basis=quoteBasis();if(!basis){$('quote-result').textContent='Complete the build estimate before comparing a quote.';return;}
    if(!localDeliveryEdited)$('quote-local-freight').value=basis.freight;
    $('quote-requirement').textContent=`Quote must cover at least ${basis.required} ${basis.unit}. Enter the entire order price, including any minimum-order surplus. ${localDeliveryEdited?'Using your custom delivery allocation for the current option.':'Current delivery follows the transport budget above; edit it to compare a different allocation.'}`;
    if(basis.required===0){$('quote-result').textContent='Add holds to the estimate before comparing hold quotes.';return;}
    const ids=['quote-goods','quote-freight','quote-quantity','quote-local-freight',...(imported?['quote-duty','quote-vat','quote-fees']:[])];
    if(ids.some(id=>$(id).value==='')){$('quote-result').textContent=imported?'Enter the full order, freight, quoted duties and clearance fees. Use 0 only for a confirmed zero charge.':'Enter goods and freight to compare delivered costs.';return;}
    try{
      if(!ids.every(id=>$(id).validity.valid))throw new RangeError();
      const quote=M.landedCost({origin:imported?'import':'eu',goods:readNumber('quote-goods'),freight:readNumber('quote-freight'),quantity:readNumber('quote-quantity'),required:basis.required,duty:readNumber('quote-duty'),vat:readNumber('quote-vat'),fees:readNumber('quote-fees')});
      const local=basis.row.totalCents+Math.round(readNumber('quote-local-freight')*100),difference=local-quote.totalCents;
      $('quote-result').innerHTML=`<strong>${euro(quote.totalCents)} delivered</strong> · current option ${euro(local)}<p>${difference===0?'The delivered totals are equal.':`${euro(Math.abs(difference))} ${difference>0?'less':'more'} for the quoted order, before build contingency.`}${imported?` Includes ${euro(quote.dutyCents)} quoted duty and ${euro(quote.vatCents)} import VAT.`:''} Compare equivalent specifications and confirm the complete delivered quote before ordering.</p>`;
    }catch{$('quote-result').textContent='The quote needs enough units for this build and valid non-negative amounts. Include the full minimum order cost.';}
  }
  $('quote-component').addEventListener('change',resetQuote);
  $('quote-origin').addEventListener('change',()=>{for(const id of ['quote-goods','quote-freight'])$(id).value='';compareQuote();});
  document.querySelectorAll('.quote-controls input').forEach(input=>input.addEventListener('input',()=>{if(input.id==='quote-local-freight')localDeliveryEdited=true;compareQuote();}));
  syncControls();update();resetQuote();
})();
