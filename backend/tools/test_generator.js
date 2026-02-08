const gen = require('../src/generator');

function deepEqual(a,b){ return JSON.stringify(a) === JSON.stringify(b); }

function runTests(){
  console.log('Running generator tests...');
  const N = 50;
  const instances = [];
  for(let i=0;i<N;i++){
    const inst = gen.generateInstance(`team_${i}`);
    instances.push(inst);
  }

  // Test 1: difficulty constant and locks length
  let ok = true;
  for(const inst of instances){
    if(!Array.isArray(inst.locks) || inst.locks.length !== 5){
      console.error('FAIL: instance locks length != 5', inst.id);
      ok = false; break;
    }
    if(typeof inst.difficulty !== 'number' || inst.difficulty <=0){
      console.error('FAIL: invalid difficulty', inst.id, inst.difficulty);
      ok = false; break;
    }
  }
  if(!ok) return process.exit(2);

  // Test 2: each lock includes expected when appropriate
  for(const inst of instances){
    for(const l of inst.locks){
      if(l.type === 'logic' || l.type === 'code' || l.type === 'cipher' || l.type === 'block'){
        if(l.expected === undefined){ console.error('FAIL: missing expected on lock', inst.id, l.type); ok=false; break; }
      }
    }
    if(!ok) break;
  }
  if(!ok) return process.exit(3);

  // Test 3: uniqueness — ensure no two instances are identical (same lock order + same payload)
  for(let i=0;i<instances.length;i++){
    for(let j=i+1;j<instances.length;j++){
      if(deepEqual(instances[i].locks, instances[j].locks)){
        console.error('FAIL: duplicate instance locks found', instances[i].id, instances[j].id);
        ok = false; break;
      }
    }
    if(!ok) break;
  }
  if(!ok) return process.exit(4);

  // Test 4: fairness — check difficulty sum equals expected (here should be 5)
  for(const inst of instances){
    if(inst.difficulty !== 5){ console.error('FAIL: unexpected difficulty score', inst.id, inst.difficulty); ok=false; break; }
  }
  if(!ok) return process.exit(5);

  console.log('All generator tests passed.');
  process.exit(0);
}

runTests();
