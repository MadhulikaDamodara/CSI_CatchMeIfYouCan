const { v4: uuidv4 } = require('uuid');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Lock 1: Logic reasoning templates (same difficulty)
// Lock1 templates with compute function
const lock1Templates = [
  {
    template: (X,Y,Z) => `If ${X} workers finish a task in ${Y} days, how long for ${Z} workers?`,
    compute: (X,Y,Z) => (X * Y) / Z
  },
  {
    template: (X,Y,Z) => `A machine completes a job in ${X} hours. How many hours for ${Y} machines to do ${Z} jobs?`,
    compute: (X,Y,Z) => (X * Z) / Y
  }
];

// Lock 2: Code output templates
const lock2Templates = [
  {
    code: (vars) => `let ${vars.a} = ${vars.va}; let ${vars.b} = ${vars.vb}; console.log(${vars.a} + ${vars.b});`,
    compute: (vars) => Number(vars.va) + Number(vars.vb)
  },
  {
    code: (vars) => `const ${vars.a} = ${vars.va}; console.log(${vars.a} * ${vars.vb});`,
    compute: (vars) => Number(vars.va) * Number(vars.vb)
  }
];

// Lock 3: Block game
function generateBlockGame() {
  const labels = ['A','B','C','D','E','F','G','H'];
  const selected = labels.slice(0, 4).map(l => ({label: l, x: randomInt(0,3), y: randomInt(0,3)}));
  // expected: order of labels to reach goal (simple canonical answer)
  const expected = selected.map(s => s.label).join('-');
  return {grid: {w:4,h:4}, blocks: selected, expected};
}

// Lock 4: Caesar cipher
function generateCipher() {
  const plaintexts = ['SECRET', 'PUZZLE', 'CIPHER', 'LOCK'];
  const plain = plaintexts[randomInt(0, plaintexts.length-1)];
  const shift = randomInt(1,25);
  const cipher = plain.split('').map(ch=>{
    const code = ((ch.charCodeAt(0)-65+shift)%26)+65; return String.fromCharCode(code);
  }).join('');
  return {plain, cipher, shiftHint: `A Caesar shift around ${shift}`, expected: plain};
}

// Lock 5: MCQ
const mcqPool = [
  {q: 'What does HTTP stand for?', opts: ['HyperText Transfer Protocol','HighText Transfer Protocol','Hyperlink Transfer Protocol'], a:0},
  {q: 'Which language is used for styling web pages?', opts: ['CSS','HTML','Python'], a:0}
];

function shuffle(arr){
  for(let i = arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function generateInstance(teamId){
  const id = uuidv4();
  // Lock1 generate numbers and expected
  const L1 = lock1Templates[randomInt(0, lock1Templates.length-1)];
  const X = randomInt(2,5); const Y = randomInt(3,8); const Z = randomInt(2,6);
  const lock1 = {type:'logic', prompt: L1.template(X,Y,Z), expected: L1.compute(X,Y,Z), estimate_seconds: 120, difficulty:1};

  // Lock2 code variation
  const varNames = ['x','y','z','a','b','c'];
  const vars = {a: varNames[randomInt(0,varNames.length-1)], b: varNames[randomInt(0,varNames.length-1)], va: randomInt(2,9), vb: randomInt(2,9)};
  const t2 = lock2Templates[randomInt(0, lock2Templates.length-1)];
  const code = t2.code(vars);
  const expected2 = t2.compute(vars);
  const lock2 = {type:'code', code, expected: expected2, estimate_seconds: 90, difficulty:1};

  // Lock3
  const block = generateBlockGame();
  const lock3 = {type:'block', data: block, expected: block.expected, estimate_seconds: 150, difficulty:1};

  // Lock4
  const cipher = generateCipher();
  const lock4 = {type:'cipher', data: cipher, expected: cipher.expected, estimate_seconds: 60, difficulty:1};

  // Lock5 MCQ with shuffled options but keep index of correct
  const mcqs = shuffle(mcqPool.slice()).map(item=>{
    const opts = shuffle(item.opts.slice());
    const correctText = item.opts[item.a];
    const correctIndex = opts.findIndex(o=>o===correctText);
    return {q:item.q, opts, correctIndex};
  });
  const lock5 = {type:'mcq', questions: mcqs, estimate_seconds: 60, difficulty:1};

  // assemble locks in randomized order but include metadata index
  const rawLocks = [lock1, lock2, lock3, lock4, lock5];
  const locks = shuffle(rawLocks).map((l, idx) => ({...l, lock_index: idx}));

  // fairness: sum difficulties
  const difficulty = rawLocks.reduce((s,r)=>s+(r.difficulty||1),0);

  return {id, teamId, locks, difficulty, createdAt: new Date().toISOString()};
}

module.exports = { generateInstance };
