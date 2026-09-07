const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const file=path.resolve(__dirname,'../cost-model.js');
test('calculator is available',()=>assert.ok(fs.existsSync(file),'Cost model must exist'));
if(fs.existsSync(file)){
  const {estimate,defaultConfig,components,landedCost}=require(file);
  const row=(result,id)=>result.rows.find(r=>r.id===id);
  test('four-panel reference has correct material quantities and EUR total',()=>{
    const result=estimate(defaultConfig());
    assert.equal(result.area,5.76);assert.equal(result.nuts,196);assert.equal(result.retainingScrews,392);
    assert.equal(row(result,'plywood').quantity,2);assert.equal(row(result,'tnuts').quantity,2);
    assert.equal(row(result,'retaining').quantity,4);assert.equal(result.subtotalCents,221345);
    assert.equal(result.contingencyCents,22135);assert.equal(result.totalCents,243480);
  });
  test('rounds purchasing quantities to whole sheets and packs',()=>{
    const result=estimate({...defaultConfig(),panels:5,holds:21});
    assert.equal(row(result,'plywood').quantity,3);assert.equal(row(result,'tnuts').quantity,3);
    assert.equal(row(result,'holds').quantity,2);assert.equal(row(result,'bolts').quantity,21);
    assert.equal(row(result,'matting').quantity,1);
  });
  test('zero holds removes holds and bolts without removing the full T-nut grid',()=>{
    const result=estimate({...defaultConfig(),holds:0});
    assert.equal(row(result,'holds').totalCents,0);assert.equal(row(result,'bolts').quantity,0);assert.equal(result.nuts,196);
  });
  test('custom prices and zero contingency calculate in integer cents',()=>{
    const config=defaultConfig();config.contingency=0;config.prices.plywood=100.10;
    const result=estimate(config);assert.equal(result.totalCents,200521);assert.equal(result.contingencyCents,0);
    assert.equal(row(result,'plywood').custom,true);
  });
  test('zero prices are accepted for already owned components',()=>{
    const config=defaultConfig();for(const item of components)config.prices[item.id]=0;
    assert.equal(estimate(config).totalCents,0);
  });
  test('invalid quantities and prices are rejected',()=>{
    for(const panels of [0,-1,1.5,25,NaN,Infinity])assert.throws(()=>estimate({...defaultConfig(),panels}),RangeError);
    for(const holds of [-1,1.2,NaN,1001])assert.throws(()=>estimate({...defaultConfig(),holds}),RangeError);
    assert.throws(()=>estimate({...defaultConfig(),panels:1,holds:50}),RangeError);
    for(const contingency of [-1,101,NaN])assert.throws(()=>estimate({...defaultConfig(),contingency}),RangeError);
    for(const price of [-1,NaN,Infinity,100001]){const config=defaultConfig();config.prices.plywood=price;assert.throws(()=>estimate(config),RangeError);}
  });
  test('each reset gets independent default prices',()=>{
    const first=defaultConfig();first.prices.plywood=0;assert.equal(defaultConfig().prices.plywood,204.22);
  });
  test('EU value uses cheaper face grade and bulk hold selection counts whole packs',()=>{
    const small=estimate(defaultConfig('value'));
    assert.equal(small.totalCents,219557);assert.equal(row(small,'holds').quantity,1);
    const config=defaultConfig('value');config.holds=40;config.holdPack=100;config.prices.holds=249.95;
    assert.equal(row(estimate(config),'holds').quantity,1);
    assert.equal(row(estimate(config),'holds').totalCents,24995);
  });
  test('EU landed quotes do not add VAT to VAT-inclusive amounts',()=>{
    const cost=landedCost({origin:'eu',goods:200,freight:50,quantity:2,required:2});
    assert.equal(cost.totalCents,25000);assert.equal(cost.vatCents,0);
  });
  test('non-EU landed cost includes freight, quoted duty, import VAT, and gross clearance fees',()=>{
    const cost=landedCost({origin:'import',goods:200,freight:100,duty:30,vat:21,fees:15,quantity:10,required:2});
    assert.equal(cost.vatCents,6930);assert.equal(cost.totalCents,41430);
  });
  test('import quotes cannot silently assume missing duties or insufficient quantities',()=>{
    assert.throws(()=>landedCost({origin:'import',goods:200,freight:100,vat:21,fees:15,quantity:2,required:2}),RangeError);
    assert.throws(()=>landedCost({origin:'eu',goods:50,freight:10,quantity:1,required:2}),RangeError);
    assert.throws(()=>landedCost({origin:'eu',goods:50,freight:-10,quantity:2,required:2}),RangeError);
  });
}
