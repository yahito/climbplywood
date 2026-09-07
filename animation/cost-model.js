/* Prices are dated planning references, not live quotes. All calculation totals use cents. */
'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CostModel=api;})(typeof window==='undefined'?globalThis:window,()=>{
  const sources={
    plywood:'https://www.houtshop.be/nl/plaatmateriaal/multiplex-berk-b-bb-18mm-2500x1250mm',
    bouwsubPlywood:'https://bouwsub.nl/product/multiplex-hardhout-18mm-244x122cm-b-bb-onbehandeld/',
    valuePlywood:'https://multiplexfabriek.nl/product/berken-bb-bb-ext-ce2-fsc-mix-70-1250x2500x18-mm/',
    tnuts:'https://www.alpidex.com/en/fixing-of-climbing-holds/wood/special-t-nuts/100-x-special-t-nut-zinc-plated-m-10-professional_7205',
    holds:'https://www.erhardsport.de/en/climbing-holds-set-climb-it-free-radicals',
    bulkHolds:'https://euroholds.com/en/offers-promotions/196-starter-pack-bolt-on.html?SubmitCurrency=1&id_currency=1',
    matting:'https://gubbies.com/products/one-cover-boulder-matts-vinyl'
  };
  const components=[
    {id:'plywood',name:'Birch plywood · 18 mm',price:204.22,unit:'sheet',group:'Panels & machining',source:sources.plywood,note:'2500 × 1250 mm sheet → two 1200 × 1200 mm panels. Confirm structural grade; BB/BB has repaired faces.'},
    {id:'cnc',name:'CNC drilling & perimeter cuts',price:75,unit:'panel',group:'Panels & machining',note:'Budget allowance. Ask for one setup and a nested batch; supplier quote replaces this rate.'},
    {id:'tnuts',name:'M10 screw-retained T-nuts',price:30.99,unit:'100-pack',group:'Hardware',source:sources.tnuts,note:'49 per panel. ALPIDEX Professional price reference; rear flange, two retaining screws, approx. 12 mm bore.'},
    {id:'retaining',name:'Short T-nut retaining screws',price:8,unit:'100-pack',group:'Hardware',note:'Two per T-nut. Select length for 18 mm plywood and the flange; tips must stay behind the climbing face.'},
    {id:'frame',name:'Timber frame & joint blocking',price:50,unit:'panel allowance',group:'Frame & fixing',note:'Budget only, scaled per panel. Member sizes and joints follow the site-specific frame design.'},
    {id:'fixings',name:'Panel fixings & building anchors',price:12.5,unit:'panel allowance',group:'Frame & fixing',note:'Budget only. Separate from hold bolts; type and quantity depend on the frame and building.'},
    {id:'holds',name:'Climbing holds',price:111.03,unit:'20-hold set',group:'Holds',source:sources.holds,note:'20-hold Climb-it reference; bolts excluded. Packs are bought whole, including surplus holds.'},
    {id:'bolts',name:'M10 hold bolts & anti-rotation screws',price:.75,unit:'hold allowance',group:'Hardware',note:'Hardware allowance per installed hold. Match bolt length, head, and anti-rotation fixing to the hold maker.'},
    {id:'finishing',name:'Sanding & edge finishing',price:35,unit:'project',group:'Panels & machining',note:'Abrasives and finish allowance. Tools and your own time are excluded.'},
    {id:'matting',name:'Continuous bouldering matting',price:750,unit:'project allowance',group:'Landing area',note:'Quote required for the actual landing area, thickness, foam and cover. Does not scale with panel count.'},
    {id:'delivery',name:'Plywood / pallet transport',price:75,unit:'delivery',group:'Transport',note:'VAT-inclusive allowance. Replace with delivery to your postcode, or the full cost of collection.'},
    {id:'parcel',name:'Hardware & hold parcels',price:25,unit:'shipment allowance',group:'Transport',note:'VAT-inclusive allowance for combined EU parcel delivery; separate suppliers can mean several charges.'},
    {id:'matfreight',name:'Matting transport',price:150,unit:'delivery',group:'Transport',note:'Bulky freight allowance. Include unloading and final delivery; set to zero if included in the mat quote.'},
    {id:'labour',name:'Design & installation quote',price:0,unit:'project',group:'Services',note:'Excluded until you enter a quote. Include structural design, paid installation and any tool hire here.'}
  ];
  const cents=n=>Math.round(n*100);
  function number(n,min,max,integer=false){if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw new RangeError('Enter a valid number within the shown limits.');return n;}
  function defaultConfig(preset='retail'){
    const config={panels:4,holds:20,contingency:10,holdPack:20,includeMatting:true,preset,prices:Object.fromEntries(components.map(c=>[c.id,c.price]))};
    if(preset==='value')config.prices.plywood=95.48;return config;
  }
  function estimate(config){
    const p=number(config.panels,1,24,true),h=number(config.holds,0,Math.min(1000,p*49),true),reserve=number(config.contingency,0,100);
    if(![20,100].includes(config.holdPack))throw new RangeError('Choose a 20 or 100 hold pack.');
    const quantities={plywood:Math.ceil(p/2),cnc:p,tnuts:Math.ceil(p*49/100),retaining:Math.ceil(p*98/100),frame:p,fixings:p,holds:Math.ceil(h/config.holdPack),bolts:h,finishing:1,matting:config.includeMatting?1:0,delivery:1,parcel:1,matfreight:config.includeMatting?1:0,labour:1};
    const rows=components.map(c=>{const price=number(config.prices[c.id],0,100000);return {...c,quantity:quantities[c.id],unitPriceCents:cents(price),totalCents:quantities[c.id]*cents(price),custom:price!==c.price};});
    const subtotalCents=rows.reduce((sum,r)=>sum+r.totalCents,0),contingencyCents=Math.round(subtotalCents*reserve/100);
    const panelIds=new Set(['plywood','cnc','tnuts','retaining','frame','fixings','holds','bolts']);
    const panelSubtotalCents=rows.filter(r=>panelIds.has(r.id)).reduce((sum,r)=>sum+r.totalCents,0);
    return {rows,area:Math.round(p*144)/100,nuts:p*49,retainingScrews:p*98,purchasedHolds:quantities.holds*config.holdPack,panelSubtotalCents,panelTotalCents:panelSubtotalCents+Math.round(panelSubtotalCents*reserve/100),subtotalCents,contingencyCents,totalCents:subtotalCents+contingencyCents};
  }
  function landedCost(quote){
    number(quote.required,1,100000,true);number(quote.quantity,quote.required,100000,true);
    const goods=cents(number(quote.goods,0,100000)),freight=cents(number(quote.freight,0,100000));
    if(quote.origin==='eu')return {totalCents:goods+freight,vatCents:0,dutyCents:0};
    if(quote.origin!=='import')throw new RangeError('Select a quote origin.');
    const dutyCents=cents(number(quote.duty,0,100000)),fees=cents(number(quote.fees,0,100000));
    const vatCents=Math.round((goods+freight+dutyCents)*number(quote.vat,0,100)/100);
    return {totalCents:goods+freight+dutyCents+vatCents+fees,vatCents,dutyCents};
  }
  return {components,sources,defaultConfig,estimate,landedCost};
});
