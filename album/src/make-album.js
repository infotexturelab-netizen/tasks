// Derives the album app (songs = categories) from the shared app source. Run: node make-album.js
const fs = require('fs');
const SRC = '/mnt/project-files/shared-app/app.html', OUT = '/mnt/project-files/album-app/app.html';
let s = fs.readFileSync(SRC, 'utf8');
let miss = [];
const rep = (a, b, all) => { if (!s.includes(a)) { miss.push(a.slice(0, 60)); return; } s = all ? s.split(a).join(b) : s.replace(a, b); };

// 1. bring categories (songs) back
rep('.book,.book.nolist{grid-template-columns:minmax(0,1fr)}\n.sidetabs,.pill,#suggest,.topicpick{display:none!important}', '.book.nolist{grid-template-columns:minmax(0,1fr)}');
rep('  const text = raw;\n', '  const text = (d.topicId || d.newName) ? (d.clean || raw) : raw;\n');
rep('  pendingTopic = null; // shared app: no categories\n', '');
rep('toast("נוסף ✓");', 'toast(`נוסף ל"${topicById(topic).name}"`);');
rep('    const tn = "";', '    const tn = view.topic==="all" ? "" : ` ב"${esc(topicById(view.topic).name)}"`;');
rep('"גרור את ⋮⋮ באצבע כדי לשנות סדר. לחיצה על משימה: בוצע ועריכה."', '"גרור את ⋮⋮ באצבע כדי לשנות סדר, או אל לשונית של שיר. לחיצה ארוכה על משימה: בוצע ועריכה."');

// 1b. a brand-new list opened from a link should still ask who you are
rep('base = {}; const p = getPending(); Object.assign(p, flat(S)); setPending(p); send(); return;',
    'base = {}; const p = getPending(); Object.assign(p, flat(S)); setPending(p); send(); if(wantName && !me){ wantName = false; askName(); } return;');

// 2. only one default category: general album tasks; songs are added by the user
s = s.replace(/const DEFAULT_TOPICS = \[[\s\S]*?\n\];/, 'const DEFAULT_TOPICS = [\n  {id:"general", name:"כללי", kw:[]}\n];');
rep('placeholder="מילים שיזהו אותו (לא חובה), מופרדות בפסיק"', 'placeholder="מילים שיזהו אותו (לא חובה), למשל: שם קצר"');
rep('placeholder="שם הנושא, למשל: בית"', 'placeholder="שם השיר"');
rep('משימות בלי נושא נכנסות לכאן.', 'משימות של כל האלבום (לא של שיר מסוים) נכנסות לכאן.');

// 3. wording: topic -> song (UI strings only; the detect() regex line stays as is)
const lines = s.split('\n').map(l => {
  if (l.includes('נושא|קטגוריה')) return l;
  if (/^\s*(\/\/|\/\*)/.test(l)) return l;
  return l.replace(/נושאים/g, 'שירים').replace(/נושא/g, 'שיר');
});
s = lines.join('\n');
s = s.replace(/"\+ שיר חדש"|aria-label="שיר חדש"/g, m => m); // no-op, kept for clarity

// 4. names / texts
rep('<title>משימות משותפות</title>', '<title>האלבום שלנו</title>');
rep('<h1 id="listTitle">משימות משותפות</h1>', '<h1 id="listTitle">האלבום שלנו</h1>');
rep(': "משימות משותפות";', ': "האלבום שלנו";');
rep('"רשימה משותפת"', '"האלבום שלנו"', true);
rep('הצטרפו לרשימת המשימות המשותפת', 'הצטרפו לרשימת המשימות של האלבום');
rep('<p>כאן יוצרים רשימת משימות <b>משותפת</b>: כל מי שמקבל את הלינק יכול להוסיף, לעדכן ולסמן משימות, ורואים הכל אצל כולם מיד.</p>',
    '<p>כאן מסיימים את <b>האלבום</b>: מוסיפים שירים, ולכל שיר את מה שנשאר לעשות. כל מי שמקבל את הלינק רואה ומעדכן, אצל כולם מיד.</p>');
rep('placeholder="שם הרשימה, למשל: גלריה – עבודה"', 'placeholder="שם האלבום"');
rep('placeholder="משימה חדשה…"', 'placeholder="מה צריך לעשות?…"');

// 5. own storage keys, so it never mixes with the other apps on the same site
rep('"shared-lists-v1"', '"album-lists-v1"', true);
rep('"shared-me-v1"', '"album-me-v1"', true);
rep('"shared-dev-v1"', '"album-dev-v1"', true);
rep('"shared-cache-"', '"album-cache-"');
rep('"shared-pending-"', '"album-pending-"');
rep('const BK_KEY = "todo-he-backup";', 'const BK_KEY = "album-backup";');

// 6. own colors: warm lilac desk
rep('--desk:#dfe7ee;', '--desk:#e6def0;');
rep('<meta name="theme-color" content="#dfe7ee">', '<meta name="theme-color" content="#e6def0">');

if (miss.length) { console.error('MISSING:', miss); process.exit(1); }
if (/shared-/.test(s.replace(/sharedX/g, ''))) console.log('note: remaining "shared-" refs:', (s.match(/.{20}shared-.{20}/g) || []));
fs.writeFileSync(OUT, s);
console.log('ok', s.length);
