// Concatenates src/ into one self-contained HTML file. Usage: node build.js [out] [--dev]
// The shipped file is minified: comments and redundant whitespace are stripped from the JS and CSS (no renaming, no
// rewriting: every token is kept byte for byte). --dev skips that for debugging. shots/boot/minicheck.js proves a
// build's script parses to the same AST as the unminified source.
const fs=require('fs'),path=require('path');
const args=process.argv.slice(2),dev=args.includes('--dev'),out=args.filter(a=>a!=='--dev')[0]||'dist/index.html',S=path.join(__dirname,'src');

/* ---------- JS minifier: a small tokenizer. Strings, template literals (with nested ${}), regex literals and numbers
   are copied verbatim; comments are dropped; whitespace between tokens is dropped where the two tokens cannot fuse,
   and a line break is kept wherever automatic semicolon insertion or a restricted production could depend on it. */
const PUNCT=['>>>=','...','===','!==','**=','<<=','>>=','>>>','&&=','||=','??=','=>','==','!=','<=','>=','&&','||','??','?.','++','--','+=','-=','*=','/=','%=','&=','|=','^=','**','<<','>>'];
const WORD=/[\w$\u0080-￿\\]/;
// after these words a '/' starts a regex, not a division
const REGEX_AFTER_WORD=new Set(['return','typeof','instanceof','in','of','new','delete','void','throw','case','do','else','yield','await']);
// a line break after one of these punctuators can never end a statement (an operand or more tokens must follow)
const NO_ASI_AFTER=p=>p!==')'&&p!==']'&&p!=='}'&&p!=='++'&&p!=='--';
// a line break before one of these can never have ended a statement (none of them can start one)
const NO_ASI_BEFORE=new Set([')',']','}',',',';','.','?.','?',':','=','==','===','!=','!==','<','>','<=','>=','*','%','**','&&','||','??','&','|','^','<<','>>','>>>','+=','-=','*=','/=','%=','**=','<<=','>>=','>>>=','&=','|=','^=','&&=','||=','??=','=>']);
function jsTokens(src){
  const T=[];let i=0,nl=false;const n=src.length,stack=[];   // stack: '{' for a block brace, '`' for a template ${
  const prevSig=()=>T.length?T[T.length-1]:null;
  const regexOK=()=>{const p=prevSig();if(!p)return true;if(p.t==='word')return REGEX_AFTER_WORD.has(p.v);if(p.t==='punct')return p.v!==')'&&p.v!==']'&&p.v!=='}';
    if(p.t==='tmpl')return /\$\{$/.test(p.v);return false};
  const push=(t,v)=>{T.push({t,v,nl});nl=false};
  const tmpl=start=>{let j=start;for(;;){if(j>=n)throw new Error('unterminated template at '+start);const c=src[j];
      if(c==='\\'){j+=2;continue}if(c==='`'){j++;break}if(c==='$'&&src[j+1]==='{'){j+=2;stack.push('`');break}j++}
    return j};
  while(i<n){const c=src[i];
    if(c==='\n'||c==='\r'||c==='\u2028'||c==='\u2029'){nl=true;i++;continue}
    if(c===' '||c==='\t'||c==='\f'||c==='\v'||c==='﻿'||/\s/.test(c)){i++;continue}
    if(c==='/'&&src[i+1]==='/'){while(i<n&&!/[\n\r\u2028\u2029]/.test(src[i]))i++;continue}
    if(c==='/'&&src[i+1]==='*'){const e=src.indexOf('*/',i+2);if(e<0)throw new Error('unterminated comment');if(/[\n\r\u2028\u2029]/.test(src.slice(i,e)))nl=true;i=e+2;continue}
    if(c==='"'||c==="'"){let j=i+1;while(j<n&&src[j]!==c){if(src[j]==='\\')j++;else if(src[j]==='\n')throw new Error('newline in string at '+i);j++}push('str',src.slice(i,j+1));i=j+1;continue}
    if(c==='`'){const j=tmpl(i+1);push('tmpl',src.slice(i,j));i=j;continue}
    if(c==='}'&&stack.length&&stack[stack.length-1]==='`'){stack.pop();const j=tmpl(i+1);push('tmpl',src.slice(i,j));i=j;continue}
    if(c==='/'&&regexOK()){let j=i+1,cls=false;for(;;){if(j>=n||src[j]==='\n')throw new Error('bad regex at '+i);const d=src[j];if(d==='\\'){j+=2;continue}if(d==='[')cls=true;else if(d===']')cls=false;else if(d==='/'&&!cls)break;j++}
      j++;while(j<n&&/[a-z]/i.test(src[j]))j++;push('regex',src.slice(i,j));i=j;continue}
    if(/[0-9]/.test(c)||(c==='.'&&/[0-9]/.test(src[i+1]||''))){const m=/^(?:0[xXoObB][\da-fA-F_]+n?|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?n?)/.exec(src.slice(i,i+64));push('num',m[0]);i+=m[0].length;continue}
    if(WORD.test(c)||c==='#'){let j=i+1;while(j<n&&WORD.test(src[j])){if(src[j]==='\\')j++;j++}if(c==='\\')j=Math.max(j,i+6);push('word',src.slice(i,j));i=j;continue}
    if(src.startsWith('<!--',i)||(src.startsWith('-->',i)&&(nl||!T.length)))throw new Error('HTML-like comment at '+i+' (not supported by the minifier)');
    let p=PUNCT.find(q=>src.startsWith(q,i));if(p==='?.'&&/[0-9]/.test(src[i+2]||''))p=null;p=p||c;
    if(p==='{')stack.push('{');else if(p==='}')stack.pop();
    push('punct',p);i+=p.length}
  return T}
// would writing token b straight after token a lex differently? (fused words/numbers, ++ from + +, comment from / *, ...)
function needSpace(a,b){const x=a.v[a.v.length-1],y=b.v[0];
  if(WORD.test(x)&&(WORD.test(y)||y==='#'))return true;
  if(a.t==='num'&&(y==='.'||WORD.test(y)))return true;
  if(a.t==='regex'&&WORD.test(y))return true;
  if((x==='+'||x==='-')&&(y===x))return true;
  if(x==='/'&&(y==='/'||y==='*'))return true;
  if(x==='<'&&y==='!')return true;            // '<!--' is an HTML comment in scripts
  if(x==='-'&&y==='>')return true;            // '-->' likewise
  if(a.t==='punct'&&b.t==='punct'&&PUNCT.some(q=>q.startsWith(a.v+b.v[0])&&q.length>a.v.length))return true;
  return false}
/* Characters above U+00FF in string / template tokens are written as \u escapes (same value; there are no tagged
   templates, so a template's raw text is never observed). The script is then pure Latin-1, which lets the browser
   hand V8 a one-byte source string: half the memory of a two-byte one and faster to scan. */
function latin1Token(v){if(!/[^\x00-\xff]/.test(v))return v;let o='';
  for(let i=0;i<v.length;i++){const c=v.charCodeAt(i);
    if(v[i]==='\\'&&i+1<v.length&&v.charCodeAt(i+1)<=0xff){o+=v[i]+v[i+1];i++;continue}
    if(v[i]==='\\'){const d=v.charCodeAt(i+1);if(d===0x2028||d===0x2029)throw new Error('line continuation with U+2028/9');continue}   // '\—' means '—'
    o+=c>0xff?'\\u'+c.toString(16).padStart(4,'0'):v[i]}   // UTF-16 units: astral characters become surrogate-pair escapes
  return o}
function minifyJS(src){const T=jsTokens(src);let o='';
  for(const t of T)if(t.t==='str'||t.t==='tmpl')t.v=latin1Token(t.v);
  for(let k=0;k<T.length;k++){const b=T[k];if(k){const a=T[k-1];
      let br=b.nl;if(br&&((a.t==='punct'&&NO_ASI_AFTER(a.v))||(b.t==='punct'&&NO_ASI_BEFORE.has(b.v))))br=false;
      if(br)o+='\n';else if(needSpace(a,b))o+=' '}
    o+=b.v}
  return o}

// cheap guard run on every build: the minified text must re-tokenize to the same tokens (modulo \u escapes).
// The full proof (identical AST) is shots/boot/minicheck.js.
function selfCheck(src,min){const a=jsTokens(src).map(t=>t.t==='str'||t.t==='tmpl'?latin1Token(t.v):t.v),b=jsTokens(min).map(t=>t.v);
  if(a.length!==b.length)throw new Error('minifier self-check: token count '+a.length+' -> '+b.length);
  for(let i=0;i<a.length;i++)if(a[i]!==b[i])throw new Error('minifier self-check: token '+i+' '+JSON.stringify(a[i])+' -> '+JSON.stringify(b[i]))}
/* ---------- CSS minifier: drop comments, collapse whitespace, drop it around { } ; , and the last ; of a block.
   Strings and url(...) are copied verbatim. Spaces around : + > ~ and inside values (calc, selectors) are kept. */
function minifyCSS(src){let o='',i=0,ws=false;const n=src.length;
  const emit=s=>{if(ws&&o&&!/[{};,]$/.test(o)&&!/^[{};,]/.test(s))o+=' ';ws=false;o+=s};
  while(i<n){const c=src[i];
    if(c==='/'&&src[i+1]==='*'){const e=src.indexOf('*/',i+2);i=e<0?n:e+2;ws=true;continue}
    if(/\s/.test(c)){ws=true;i++;continue}
    if(c==='"'||c==="'"){let j=i+1;while(j<n&&src[j]!==c){if(src[j]==='\\')j++;j++}emit(src.slice(i,j+1));i=j+1;continue}
    if(/^url\(/i.test(src.slice(i,i+4))&&!/[\w-]$/.test(o)){const e=src.indexOf(')',i);emit(src.slice(i,e+1));i=e+1;continue}
    if(c==='}'&&o.endsWith(';'))o=o.slice(0,-1);
    if(c==='{'||c==='}'||c===';'||c===',')ws=false;
    emit(c);i++}
  return o}

function build(){
const cssFiles=fs.readdirSync(S).filter(f=>f.endsWith('.css')).sort((a,b)=>a==='style.css'?-1:b==='style.css'?1:a.localeCompare(b)).map(f=>fs.readFileSync(path.join(S,f),'utf8'));
const jsFiles=fs.readdirSync(S).filter(f=>f.endsWith('.js')).sort();
const css=dev?cssFiles.join('\n'):cssFiles.map(minifyCSS).join('\n');
// files are minified one at a time so an error names its file; each still ends with a line break as when concatenated
const js=jsFiles.map(f=>{const s=fs.readFileSync(path.join(S,f),'utf8');if(dev)return`/* ---- ${f} ---- */\n`+s;
  try{const m=minifyJS(s);selfCheck(s,m);return m}catch(e){throw new Error(f+': '+e.message)}}).join('\n');
  if(!dev)new (require('vm').Script)("'use strict';\n"+js,{filename:'minified.js'});   // syntax check of the whole minified script
const body=fs.readFileSync(path.join(S,'body.html'),'utf8');
// game icon (art): committed PNGs in assets/ (node assets/make-icons.js), inlined as data URIs; skipped when absent
const icon=n=>{try{return'data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'assets','icon-'+n+'.png')).toString('base64')}catch(e){return''}};
const icons=[['icon','16','16x16'],['icon','32','32x32'],['apple-touch-icon','180','180x180']].map(([r,n,s])=>{const u=icon(n);return u?`<link rel="${r}" type="image/png" sizes="${s}" href="${u}">`:''}).filter(Boolean).join('\n');
const html=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no">
<title>Wyrdmarch</title>
${icons}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<style>
${css}
</style>
</head>
<body>
${body}
<script>
'use strict';
${js}
</script>
<link href="https://fonts.googleapis.com/css2?family=Jersey+15&family=Alegreya+Sans:wght@400;500;700&display=swap" rel="stylesheet">
</body>
</html>
`;
if(/<\/script/i.test(js)||/<\/style/i.test(css))throw new Error('</script> or </style> inside the inlined code');
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html);console.log('built',out,html.length,'bytes'+(dev?' (dev, unminified)':''));
}
if(require.main===module)build();
module.exports={minifyJS,minifyCSS,jsTokens};
