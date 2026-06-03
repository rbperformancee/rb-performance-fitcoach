(function(){
var section = document.querySelector('section.how');
if (!section) return;
var blocks = section.querySelectorAll('.sys-block');
var counted = false;
function countUp(el) {
var target = parseInt(el.dataset.count);
var suffix = el.dataset.suffix || '';
var prefix = target < 0 ? '-' : '';
var abs = Math.abs(target);
var duration = 1600;
var start = performance.now();
function tick(now) {
var t = Math.min((now - start) / duration, 1);
var ease = 1 - Math.pow(1 - t, 3);
var val = Math.round(abs * ease);
el.textContent = prefix + val + suffix;
if (t < 1) requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
}
function revealAll() {
if (counted) return;
counted = true;
blocks.forEach(function(b, i) {
setTimeout(function(){
b.classList.add('vis');
setTimeout(function(){
var big = b.querySelector('.sys-big[data-count]');
if (big) countUp(big);
}, 300);
}, i * 150);
});
}
if (section.classList.contains('active')) revealAll();
var mo = new MutationObserver(function(mutations) {
mutations.forEach(function(m) {
if (m.attributeName === 'class' && section.classList.contains('active')) revealAll();
});
});
mo.observe(section, { attributes: true });
})();
if (!window.toggleFaq) {
window.toggleFaq = function(btn) {
var item = btn.closest('.faq-item');
var ans = item ? item.querySelector('.faq-a') : null;
if (!item || !ans) return;
var isOpen = item.classList.contains('open');
document.querySelectorAll('.faq-item.open').forEach(function(o) {
if (o !== item) { o.classList.remove('open'); var b=o.querySelector('.faq-q'),a=o.querySelector('.faq-a'); if(b)b.setAttribute('aria-expanded','false'); if(a){a.style.maxHeight='0';a.style.paddingBottom='0';} }
});
item.classList.toggle('open');
btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
if (!isOpen) { ans.style.maxHeight = '500px'; ans.style.paddingBottom = '22px'; }
else { ans.style.maxHeight = '0'; ans.style.paddingBottom = '0'; }
};
}
(function() {
'use strict';
var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var hasIntersectionObserver = 'IntersectionObserver' in window;
var noHover = matchMedia('(hover: none)').matches;
initLoader();
if (prefersReducedMotion || !hasIntersectionObserver) {
initNavScroll();
initHeroSplit(false);
initCountUp();
initFAQ();
initThemeToggle();
initLangToggle();
initQuiz();
return;
}
initNavScroll();
initHeroSplit(true);
initReveals();
initManifeste();
initCountUp();
initScreenSwitch();
initIphoneAutoCycle();
initMagnetic();
initTilt();
initSpotlight();
initStickyCta();
initFAQ();
initLiveData();
initBentoSpotlight();
initThemeToggle();
initLangToggle();
initHowSteps();
initFounderSig();
initQuiz();
initStackingCards();
initPauseOffscreen();
function initLoader() {
var loader = document.getElementById('loader');
if (!loader) return;
var hide = function() {
loader.classList.add('done');
setTimeout(function() { loader.style.display = 'none'; }, 800);
};
if (document.readyState === 'complete') {
setTimeout(hide, 1900);
} else {
window.addEventListener('load', function() { setTimeout(hide, 1900); });
}
setTimeout(hide, 4000);
}
function initNavScroll() {
var nav = document.getElementById('nav');
if (!nav) return;
var lastY = 0;
window.addEventListener('scroll', function() {
var y = window.scrollY;
if (y > 100) nav.classList.add('scrolled'); else nav.classList.remove('scrolled');
if (y > lastY && y > 200) nav.classList.add('hidden'); else nav.classList.remove('hidden');
lastY = y;
}, { passive: true });
}
function initHeroSplit(animate) {
var title = document.getElementById('heroTitle');
if (!title) return;
var text = title.textContent.trim();
title.innerHTML = text.split('').map(function(c) {
return c === ' ' ? '<span class="char">&nbsp;</span>' : '<span class="char">' + c + '</span>';
}).join('');
if (!animate) return;
var sub = document.querySelector('.hero-sub');
var chars = title.querySelectorAll('.char');
chars.forEach(function(char, i) {
char.style.transition = 'opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1)';
char.style.transitionDelay = (0.4 + i * 0.08) + 's';
char.style.opacity = '1';
char.style.transform = 'translateY(0)';
});
var d = 400 + chars.length * 80;
setTimeout(function() {
if (sub) { sub.style.transition = 'opacity 0.9s ease, transform 0.9s ease'; sub.style.opacity = '1'; sub.style.transform = 'translateY(0)'; }
}, d + 200);
}
function initReveals() {
var observer = new IntersectionObserver(function(entries) {
entries.forEach(function(e) {
if (e.isIntersecting) {
e.target.classList.add('visible');
observer.unobserve(e.target);
}
});
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(function(el) { observer.observe(el); });
setTimeout(function() {
document.querySelectorAll('.reveal:not(.visible)').forEach(function(el) {
el.classList.add('visible');
});
document.querySelectorAll('.hero-title .char').forEach(function(c) {
if (parseFloat(getComputedStyle(c).opacity) < 0.5) {
c.style.opacity = '1';
c.style.transform = 'translateY(0)';
}
});
var line = document.getElementById('manifesteLine');
if (line) line.classList.add('visible');
}, 3500);
}
function initManifeste() {
var m = document.getElementById('manifesteText');
var line = document.getElementById('manifesteLine');
if (!m) return;
var words = m.textContent.trim().split(' ');
m.innerHTML = words.map(function(w) {
return '<span style="display:inline-block;opacity:0;transform:translateY(14px);transition:opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1)">' + w + '</span>';
}).join(' ');
var observer = new IntersectionObserver(function(entries) {
entries.forEach(function(e) {
if (!e.isIntersecting) return;
m.style.opacity = '1';
m.style.transform = 'none';
m.classList.add('visible');
var spans = m.querySelectorAll('span');
spans.forEach(function(s, i) {
setTimeout(function() {
s.style.opacity = '1';
s.style.transform = 'translateY(0)';
}, i * 85);
});
if (line) setTimeout(function() { line.classList.add('visible'); }, spans.length * 85 + 300);
observer.unobserve(m);
});
}, { threshold: 0.25 });
observer.observe(m);
}
function initCountUp() {
var els = document.querySelectorAll('[data-count]');
var observer = new IntersectionObserver(function(entries) {
entries.forEach(function(e) {
if (!e.isIntersecting) return;
var el = e.target;
var target = parseInt(el.dataset.count, 10);
var suffix = el.dataset.suffix || '';
var prefix = el.dataset.prefix || '';
if (isNaN(target)) { observer.unobserve(el); return; }
el.textContent = prefix + '0' + suffix;
var current = 0, steps = 50, inc = target / steps, tick = 0;
var timer = setInterval(function() {
tick++;
current += inc;
if (tick >= steps || current >= target) { current = target; clearInterval(timer); }
el.textContent = prefix + Math.round(current) + suffix;
}, 22);
observer.unobserve(el);
});
}, { threshold: 0.5 });
els.forEach(function(el) { observer.observe(el); });
}
function initScreenSwitch() {
var steps = document.querySelectorAll('.step');
var screens = document.querySelectorAll('.screen');
if (!steps.length || !screens.length) return;
function switchTo(idx) {
screens.forEach(function(s, i) { s.classList.toggle('active', i === idx); });
steps.forEach(function(s, i) { s.classList.toggle('active', i === idx); });
}
steps.forEach(function(step, i) {
var observer = new IntersectionObserver(function(entries) {
entries.forEach(function(e) { if (e.isIntersecting) switchTo(i); });
}, { threshold: 0, rootMargin: '-40% 0px -40% 0px' });
observer.observe(step);
});
}
function initMagnetic() {
if (noHover) return;
document.querySelectorAll('.magnetic').forEach(function(el) {
el.addEventListener('mousemove', function(e) {
var rect = el.getBoundingClientRect();
var x = e.clientX - rect.left - rect.width / 2;
var y = e.clientY - rect.top - rect.height / 2;
var maxPull = 8;
var px = Math.max(-maxPull, Math.min(maxPull, x * 0.25));
var py = Math.max(-maxPull, Math.min(maxPull, y * 0.25));
el.style.transform = 'translate(' + px + 'px, ' + py + 'px)';
});
el.addEventListener('mouseleave', function() {
el.style.transform = '';
});
});
}
function initTilt() {
if (noHover) return;
document.querySelectorAll('.tilt').forEach(function(card) {
card.addEventListener('mousemove', function(e) {
var rect = card.getBoundingClientRect();
var px = (e.clientX - rect.left) / rect.width;
var py = (e.clientY - rect.top) / rect.height;
var rx = (py - 0.5) * -8;
var ry = (px - 0.5) * 8;
card.style.transform = 'perspective(1000px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-4px)';
card.style.setProperty('--mx', (px * 100) + '%');
card.style.setProperty('--my', (py * 100) + '%');
});
card.addEventListener('mouseleave', function() {
card.style.transform = '';
});
});
}
function initSpotlight() {
if (noHover) return;
document.querySelectorAll('.spotlight').forEach(function(section) {
section.addEventListener('mousemove', function(e) {
var rect = section.getBoundingClientRect();
section.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
section.style.setProperty('--my', (e.clientY - rect.top) + 'px');
});
});
}
function initStickyCta() {
var bar = document.getElementById('stickyCta');
var close = document.getElementById('stickyCtaClose');
if (!bar) return;
var dismissed = false;
try { dismissed = sessionStorage.getItem('rb_sticky_cta_dismissed') === '1'; } catch (e) {}
if (dismissed) return;
if (close) {
close.addEventListener('click', function() {
bar.classList.remove('visible');
bar.setAttribute('aria-hidden', 'true');
try { sessionStorage.setItem('rb_sticky_cta_dismissed', '1'); } catch (e) {}
});
}
var shown = false;
window.addEventListener('scroll', function() {
var scrolled = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
if (!shown && scrolled > 0.3 && scrolled < 0.92) {
bar.classList.add('visible');
bar.setAttribute('aria-hidden', 'false');
shown = true;
} else if (shown && scrolled > 0.92) {
bar.classList.remove('visible');
bar.setAttribute('aria-hidden', 'true');
shown = false;
}
}, { passive: true });
}
function initFAQ() {
}
window.toggleFaq = function(btn) {
var item = btn.closest('.faq-item');
var ans = item ? item.querySelector('.faq-a') : null;
if (!item || !ans) return;
var isOpen = item.classList.contains('open');
document.querySelectorAll('.faq-item.open').forEach(function(other) {
if (other !== item) {
other.classList.remove('open');
var ob = other.querySelector('.faq-q');
var oa = other.querySelector('.faq-a');
if (ob) ob.setAttribute('aria-expanded', 'false');
if (oa) { oa.style.maxHeight = '0'; oa.style.paddingBottom = '0'; }
}
});
item.classList.toggle('open');
btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
if (!isOpen) {
ans.style.maxHeight = '500px';
ans.style.paddingBottom = '22px';
} else {
ans.style.maxHeight = '0';
ans.style.paddingBottom = '0';
}
};
function initIphoneAutoCycle() {
var iphone = document.getElementById('iphone');
var screens = document.querySelectorAll('.screen');
var steps = document.querySelectorAll('.step');
if (!iphone || !screens.length) return;
var idx = 0;
var timer = null;
var lastScroll = Date.now();
var isVisible = false;
window.addEventListener('scroll', function() { lastScroll = Date.now(); }, { passive: true });
var observer = new IntersectionObserver(function(entries) {
entries.forEach(function(e) { isVisible = e.isIntersecting; });
}, { threshold: 0.4 });
observer.observe(iphone);
setInterval(function() {
if (!isVisible) return;
if (Date.now() - lastScroll < 2500) return;
idx = (idx + 1) % screens.length;
screens.forEach(function(s, i) { s.classList.toggle('active', i === idx); });
steps.forEach(function(s, i) { s.classList.toggle('active', i === idx); });
}, 3500);
}
function initLiveData() {
var alertIco = document.querySelector('.screen-dashboard .icn.alert');
if (alertIco) {
setInterval(function() {
alertIco.style.transition = 'transform 0.4s ease';
alertIco.style.transform = 'scale(1.15)';
setTimeout(function() { alertIco.style.transform = 'scale(1)'; }, 400);
}, 8000);
}
}
function initBentoSpotlight() {
if (noHover) return;
document.querySelectorAll('.bento-card').forEach(function(card) {
card.addEventListener('mousemove', function(e) {
var rect = card.getBoundingClientRect();
var x = ((e.clientX - rect.left) / rect.width) * 100;
var y = ((e.clientY - rect.top) / rect.height) * 100;
card.style.setProperty('--mx', x + '%');
card.style.setProperty('--my', y + '%');
});
});
}
function initThemeToggle() {
var btn = document.getElementById('themeToggle');
if (!btn) return;
var saved = null;
try { saved = localStorage.getItem('rb_theme'); } catch (e) {}
if (saved === 'light') document.documentElement.classList.add('light');
btn.addEventListener('click', function() {
var isLight = document.documentElement.classList.toggle('light');
try { localStorage.setItem('rb_theme', isLight ? 'light' : 'dark'); } catch (e) {}
});
}
var I18N = {
fr: {
  "nav.features": "Features",
  "nav.pricing": "Tarifs",
  "nav.login": "Connexion",
  "hero.eyebrow": "SaaS de coaching premium",
  "hero.countdown_label": "Lancement officiel dans",
  "hero.countdown_unit": "jours",
  "how.tag": "Comment ça marche",
  "how.title": "3 étapes.<br/>Pas une de plus.",
  "how.s1_title": "Crée ton compte",
  "how.s1_desc": "Configure ton branding (logo, couleurs), ton lien de paiement et ton premier code d'invitation. 2 minutes chrono.",
  "how.s2_title": "Invite tes clients",
  "how.s2_desc": "Partage ton code 6 chiffres ou ton lien d'invitation personnalisé. Tes clients s'inscrivent en 30 secondes.",
  "how.s3_title": "Pilote et performe",
  "how.s3_desc": "Crée des programmes, suis l'activité, anticipe le churn, fais grandir ton business. RB s'occupe du reste.",
  "stack.tag": "Pensé pour les coachs sérieux",
  "stack.title": "Plus qu'une app.<br/>Un système.",
  "stack.c1_tag": "Performance",
  "stack.c1_title": "Score business<br/>en temps réel.",
  "stack.c1_desc": "Un seul chiffre qui résume la santé de ton activité. Calculé live à partir de la rétention, du MRR, de l'activité client et du momentum. Tu sais en 2 secondes si ton mois est solide.",
  "stack.c2_tag": "Anticipation",
  "stack.c2_title": "L'IA voit avant toi.",
  "stack.c2_desc": "7 signaux par client analysés en continu. Quand un score de churn dépasse 60, tu reçois une alerte avec l'action recommandée. Tu sauves les clients que d'autres laissent partir.",
  "stack.c3_tag": "Suivi",
  "stack.c3_title": "Tu vois tout.<br/>Ton client ne fait rien.",
  "stack.c3_desc": "Nutrition IA vocale, scanner code-barre, poids, sommeil, pas — tout se logue automatiquement. Ton client dit \"un bol de pâtes au saumon\" et les macros tombent en 2 secondes.",
  "founder.role": "Mot du fondateur",
  "founder.message": "J'ai construit RB Perform parce que les outils existants <strong>volaient les coachs</strong> — 30% de commission, interfaces décennales, support inexistant. J'ai voulu un système qui te donne <strong>les armes des CEO</strong>, sans te prendre un centime sur tes revenus. Tu paies pour la techno, point. Le reste, c'est à toi.",
  "quiz.tag": "Trouve ton plan en 5 secondes",
  "quiz.q": "Tu coaches combien de clients&nbsp;?",
  "quiz.opt1": "Je démarre",
  "quiz.opt2": "J'établis",
  "quiz.opt3": "Je scale",
  "a11y.skip": "Aller au contenu",
  "nav.waitlist": "Rejoindre",
  "menu.ch0": "Le Système",
  "menu.ch1": "Ton Business",
  "menu.ch3": "Features",
  "menu.ch4": "Explorer",
  "menu.ch5": "Ton Offre",
  "menu.cta": "Rejoindre les 30 Founding Coachs →",
  "hero.sub": "Le système qui transforme<br/>chaque coach en CEO.",
  "hero.enter": "Entrer",
  "how.header_tag": "Le Système",
  "how.header_title": "Certains coachs ont du talent.<br/>Les meilleurs ont un système.",
  "how.stat1_label": "Commission",
  "how.stat2_label": "Clients / 1 coach",
  "how.stat3_label": "Pour démarrer",
  "how.b1_num": "01 — Dashboard CEO",
  "how.b1_title": "Tu sais exactement<br/>où en est ton business.",
  "how.b1_sub": "MRR, ARR, score business live. Le cockpit que Trainerize cache derrière 3 onglets.",
  "how.b1_stat": "Score moyen de nos coachs après 30 jours : 84/100",
  "how.badge_starter": "Inclus dès le Starter",
  "how.b1_bul1": "Score 0–100 en temps réel",
  "how.b1_bul2": "MRR · ARR · Rétention",
  "how.b1_bul3": "Alertes expiration auto",
  "how.b1_unit": "Score Live",
  "how.b2_num": "02 — Anti-Churn IA",
  "how.b2_title": "Tu sauves les clients<br/>avant qu'ils partent.",
  "how.b2_sub": "7 signaux par client. Tu interviens 7 jours avant qu'il décide.",
  "how.b2_stat": "Rétention moyenne avec anti-churn actif : 94%",
  "how.b2_bul1": "7 signaux comportementaux",
  "how.b2_bul2": "Score churn 0–100",
  "how.b2_bul3": "Action recommandée auto",
  "how.b2_unit": "De Churn",
  "how.b3_num": "03 — Suivi Client Total",
  "how.b3_title": "Tu vois tout.<br/>Ton client ne fait rien.",
  "how.b3_sub": "Nutrition IA vocale, scanner code-barre, poids, sommeil, pas. Tout se logue automatiquement.",
  "how.b3_stat": "Temps moyen pour logger un repas : 2 secondes",
  "how.b3_bul1": "IA vocale : \"un bol de pâtes au saumon\" → macros en 2s",
  "how.b3_bul2": "Scanner code-barre : 3M+ produits",
  "how.b3_bul3": "Poids · sommeil · pas · eau — tracking auto",
  "how.b3_unit": "Pour Logger",
  "how.b4_num": "04 — Programme Builder",
  "how.b4_title": "Tes programmes<br/>en minutes pas en heures.",
  "how.b4_sub": "Drag & drop. PDF signé. Vidéos YouTube. Zéro Excel.",
  "how.b4_stat": "Temps moyen de création d'un programme 12 semaines : 4 min",
  "how.b4_bul1": "Drag & drop multi-semaines",
  "how.b4_bul2": "Export PDF signé",
  "how.b4_bul3": "Preview live",
  "how.b4_unit": "Min Pour Créer",
  "how.b5_num": "05 — Automatisations",
  "how.b5_title": "Tu travailles moins.<br/>Tes clients avancent plus.",
  "how.b5_sub": "Rapports auto. Relances auto. Renouvellements auto.",
  "how.b5_stat": "Temps admin économisé en moyenne par coach : 12h/mois",
  "how.b5_bul1": "Rapports hebdo auto-envoyés",
  "how.b5_bul2": "Relance si inactif 3j",
  "how.b5_bul3": "Renouvellement auto",
  "how.b5_unit": "Gagnées / Semaine",
  "how.b6_num": "06 — Zéro Commission",
  "how.b6_title": "Ce que tu gagnes,<br/>tu le gardes.",
  "how.b6_sub": "Trainerize prend jusqu'à 30%. Nous : zéro. À vie.",
  "how.b6_stat": "Économie moyenne vs plateformes concurrentes : 5 400€/an",
  "how.badge_lifetime": "Garanti à vie",
  "how.b6_bul1": "0% commission prélevée",
  "how.b6_bul2": "Ton CA reste intégralement le tien",
  "how.b6_bul3": "+450€/mois récupérés vs concurrents",
  "how.b6_unit": "Commission",
  "bento.tag": "Une plateforme. Tout l'arsenal.",
  "bento.title": "Construit pour les coachs<br>qui ne s'arrêtent jamais.</br>",
  "bento.mission_tag": "Notre mission",
  "bento.mission_title": "Faire de chaque<br>coach sportif<br>un<span style=\"color:var(--orange)\"> entrepreneur</span><br>indépendant.</br></br></br>",
  "bento.mission_desc": "Plateformes US comme Trainerize prennent jusqu'à 30% sur tes revenus. Nous : zéro. Tu paies pour la techno, pas pour ton succès. Ton chiffre d'affaires reste à toi, intégralement.",
  "bento.stat1_label": "Commission prélevée",
  "bento.feat1_title": "Anti-churn IA",
  "bento.feat1_desc": "7 signaux analysés en temps réel pour prédire qui va décrocher.",
  "bento.live_dashboard": "Live dashboard",
  "bento.score_business": "Score Business",
  "bento.stat2_label": "Signaux IA analysés par client",
  "bento.stat3_label": "Pour onboarder un client",
  "bento.feat2_title": "Automatisations intelligentes",
  "bento.feat2_desc": "Rapports hebdo, alertes churn, relances — tout part automatiquement. Tu gères ton business, pas ta paperasse.",
  "bento.cta_title": "30 places. Prix verrouillé à vie.",
  "bento.cta_btn": "Rejoindre les Founding Coachs →",
  "demo.title": "Teste. Juge. Décide.",
  "demo.sub": "15 minutes d'accès complet. Sans créer de compte.<br/> <span style=\"color:rgba(255,255,255,0.55)\">Tu verras pourquoi les coachs qui passent sur RB Perform ne reviennent jamais en arrière.</span>",
  "demo.coach_tag": "Vue Coach · Dashboard CEO",
  "demo.coach_title": "Tu pilotes ton business<br/>en temps réel.",
  "demo.coach_chip1": "MRR Live",
  "demo.coach_chip2": "Anti-Churn IA",
  "demo.coach_chip3": "Pipeline CRM",
  "demo.coach_cta": "Explorer la démo coach →",
  "demo.client_tag": "Vue Client · App Premium",
  "demo.client_title": "Ton client vit une<br/>expérience premium.",
  "demo.client_chip1": "Programme Interactif",
  "demo.client_chip2": "Nutrition IA",
  "demo.client_chip3": "Tracking Complet",
  "demo.client_cta": "Explorer la démo client →",
  "demo.microcopy": "8 clients fictifs · Toutes les features actives · Aucune carte requise · 15 min d'accès",
  "features.tag": "Pourquoi c'est différent",
  "features.title": "J'ai construit ce que<br>j'aurais voulu avoir.</br>",
  "features.intro": "Athlète de haut niveau. Des années à conseiller des sportifs autour de moi. Je connais chaque problème du métier — parce que je les ai vécus. Alors j'ai construit l'outil qui les règle.",
  "sentinel.badge": "Sentinel actif",
  "sentinel.title": "J'ai integre un Sentinel dans ton app<span>.</span>",
  "sentinel.sub": "Pour sauver ton argent. Une IA qui tourne chaque matin a 7h — elle scanne tes clients, tes prix, tes opportunites et te dit exactement quoi faire. Voila ce qu'elle fait pendant que tu dors :",
  "sentinel.notif1": "<div class=\"sl-time\">07:31</div> <span class=\"sl-warn\">ALERTE CHURN</span> — Client M.D. inactif depuis 6 jours<br/>→ Message de relance automatique envoye <span class=\"sl-val\">(+120EUR sauve)</span>",
  "sentinel.notif2": "<div class=\"sl-time\">07:32</div> <span class=\"sl-warn\">UPSELL DETECTE</span> — Client S.R. fin de pack dans 5 jours<br/>→ Proposition pack 6 mois generee <span class=\"sl-val\">(+660EUR potentiel)</span>",
  "sentinel.notif3": "<div class=\"sl-time\">07:33</div> <span style=\"color:#818cf8;font-weight:700\">PRIX MARCHE</span> — Tes tarifs sont 18% sous la mediane<br/>→ Recommandation : +15EUR/mois/client <span class=\"sl-val\">(+225EUR/mois)</span>",
  "sentinel.notif4": "<div class=\"sl-time\">07:34</div> <span class=\"sl-ok\">PLAYBOOK DU JOUR</span> — 3 actions generees pour ce matin<br/>→ Impact estime : <span class=\"sl-val\">+340EUR ce mois</span>",
  "sentinel.total_label": "Recupere ce mois grace a Sentinel",
  "ft.f1_eyebrow": "Dashboard MRR + Prévision",
  "ft.f1_title": "Tu sais ce que tu vas gagner le mois prochain. Pas approximativement.",
  "ft.f1_built": "Un dashboard qui calcule ton MRR en temps réel, prédit tes revenus à 90 jours, et te montre exactement qui renouvelle, qui expire, qui est en retard. Comme un tableau de bord de startup — mais pour un coach.",
  "ft.f1_result": "Tu ouvres RB Perform le matin. En <strong>3 secondes</strong> tu sais : combien tu gagnes ce mois, combien tu gagneras le prochain, et quel client tu dois appeler aujourd'hui.",
  "ft.f1_stat_label": "Prévision",
  "ft.f2_eyebrow": "Alertes Anti-Churn IA",
  "ft.f2_title": "L'IA voit que ton client va partir. 7 jours avant lui.",
  "ft.f2_built": "Un algorithme qui analyse 7 signaux par client en continu : fréquence des séances, RPE, poids, connexions app, réponses messages, régularité nutrition, streak. Quand le score dépasse 60, tu reçois une alerte avec l'action recommandée.",
  "ft.f2_result": "Un coach perd en moyenne <strong>25% de ses clients par an</strong> sans le voir. Avec les alertes, tu récupères 80% de ces départs. Sur 20 clients à 150€, ça fait <strong>3 600€/an récupérés</strong>.",
  "ft.f2_stat_label": "Signaux analysés / client",
  "ft.f3_eyebrow": "Programme Builder",
  "ft.f3_title": "Tes programmes se créent en minutes. Pas en heures sur Excel.",
  "ft.f3_built": "Multi-semaines, drag-and-drop, vidéos YouTube intégrées, notes de motivation, preview live. Tu construis un programme une fois — ton client le suit en direct dans son app avec les démos vidéo de chaque exercice.",
  "ft.f3_result": "Fini les PDF envoyés sur WhatsApp. Ton client ouvre son app, voit sa séance du jour, <strong>lance la vidéo, log ses charges</strong>. Toi tu vois sa progression — sans lui demander.",
  "ft.f3_mock_label": "Semaine 1 · Push",
  "ft.f3_add_exercise": "+ Ajouter un exercice",
  "ft.f4_eyebrow": "Score Business",
  "ft.f4_title": "Un seul chiffre. Toute la santé de ton business.",
  "ft.f4_built": "Un score de 0 à 100 calculé en temps réel à partir de ta rétention, ton MRR, l'activité de tes clients, et le momentum. Au-dessus de 70, tout va bien. En dessous de 50, il faut agir. Avec des recommandations concrètes à chaque palier.",
  "ft.f4_result": "Tu ne te fies plus à ton instinct pour savoir si ton business est solide. Tu as <strong>un chiffre. Comme un CEO.</strong>",
  "ft.f4_score_label": "Score",
  "ft.stat_break": "Un coach utilise en moyenne <strong style=\"color:rgba(255,255,255,0.7)\">4,7 outils différents</strong> pour gérer son activité. RB Perform les remplace. <strong style=\"color:#00C9A7\">Tous.</strong>",
  "ft.f5_eyebrow": "Nutrition IA vocale",
  "ft.f5_title": "Ton client dit ce qu'il mange. L'IA fait le reste.",
  "ft.f5_built": "\"Un bol de pâtes au saumon\" — 2 secondes, les macros tombent. Pas de scan, pas de recherche manuelle. Ton client parle, l'IA analyse avec la précision CIQUAL. Scanner code-barre inclus pour les produits industriels. 3 millions de produits référencés.",
  "ft.f5_result": "Tu vois <strong>ce que ton client mange réellement</strong> — sans lui demander. Macros, calories, tendances, écarts. Le suivi nutritionnel qui se fait tout seul.",
  "ft.f5_vocal_label": "Vocal IA",
  "ft.f5_vocal_quote": "\"Un bol de pâtes au saumon\"",
  "ft.f5_macro_kcal": "Calories",
  "ft.f5_macro_protein": "Protéines",
  "ft.f5_macro_carbs": "Glucides",
  "ft.f5_macro_fat": "Lipides",
  "ft.f6_eyebrow": "IA Analyser · Mistral",
  "ft.f6_title": "Demande à l'IA ce que ton client ne te dit pas.",
  "ft.f6_built": "Un bouton. Tu cliques, l'IA analyse tout : séances, nutrition, poids, RPE, fréquence, tendances. En 3 secondes elle te sort un résumé + 3 actions concrètes. Pas du blabla — de l'analyse basée sur les vraies données de ton client.",
  "ft.f6_result": "Tu passes de <strong>\"je pense que Thomas va bien\"</strong> à <strong>\"Thomas montre 3 signaux de décrochage, voici quoi faire\"</strong>. En 3 secondes, pas en 30 minutes.",
  "ft.f7_eyebrow": "App Client · iOS & Android",
  "ft.f7_title": "Ton client ouvre son app. Il vit une expérience premium.",
  "ft.f7_built": "Installable en 1 clic depuis Safari (iPhone) ou Chrome (Android) — l'app apparaît sur l'écran d'accueil comme n'importe quelle app native. Programmes interactifs avec vidéos, log des séances en temps réel, messagerie directe, push notifications, suivi poids · sommeil · pas. Tout remonte dans ton dashboard automatiquement.",
  "ft.f7_result": "Ton client ne te dit plus \"j'ai fait ma séance\". <strong>Tu le vois. En direct.</strong> Charges, RPE, nutrition, poids, sommeil. Et lui, il a une vraie app — pas un PDF sur WhatsApp.",
  "ft.f7_session_today": "Séance du jour",
  "ft.f7_session_title": "Push · Semaine 1",
  "ft.f7_exos": "Exos",
  "ft.f7_duration": "Durée",
  "ft.f7_start": "Commencer",
  "business.tag": "Ton business en chiffres",
  "business.title": "Ce que RB Perform<br/>change. Concrètement.",
  "business.intro": "Calcule. Visualise. Décide.",
  "business.roi_title": "Calcule ton potentiel<span style=\"color:#00C9A7\">.</span>",
  "business.roi_sub": "Règle tes chiffres. Vois ce que tu encaisses.",
  "business.roi_slider1": "Nombre de clients",
  "business.roi_clients_unit": "clients",
  "business.roi_slider2": "Tarif mensuel",
  "business.roi_tarif_unit": "€ / mois",
  "business.roi_mrr_label": "Ton MRR potentiel",
  "business.roi_gain_label": "Argent récupéré / an",
  "business.roi_hours_label": "Heures gagnées / mois",
  "biz.tl_title": "Une journée.<br/>Deux réalités.",
  "biz.tl_without": "Sans RB Perform",
  "biz.tl_w1": "Tu ouvres Excel. Tu cherches qui a payé. Tu ne sais pas.",
  "biz.tl_w2": "Thomas n'a pas ouvert son app depuis 8 jours. Tu l'apprends trop tard.",
  "biz.tl_w3": "Marie veut arrêter. Tu ne l'avais pas vu venir.",
  "biz.tl_w4": "2h de rapports manuels. 2h perdues.",
  "biz.tl_w5": "2 clients en moins. Sans comprendre pourquoi.",
  "biz.tl_with": "Avec RB Perform",
  "biz.tl_a1": "Dashboard ouvert. MRR, rétention, score : tout est là en 3 secondes.",
  "biz.tl_a2": "Alerte RB : Thomas à risque depuis 3 jours. Message en 1 clic. Il reste.",
  "biz.tl_a3": "Marie reçoit son rapport auto. Elle voit ses progrès. Elle renouvelle.",
  "biz.tl_a4": "Les rapports sont partis automatiquement. Tu n'as rien fait.",
  "biz.tl_a5": "0 clients perdus. +150€ récupérés. Tu es CEO.",
  "pricing.tag": "Tarifs Coach",
  "pricing.title": "Ce que tu ignores<br/>te ruine.",
  "pricing.sub": "Chaque mois sans visibilité, c'est un client qui part en silence.",
  "pricing.support": "Support 7j/7",
  "pricing.fc_badge": "Offre Fondateur",
  "pricing.fc_title": "Le prix d'aujourd'hui est ton prix <span style=\"color:#00C9A7\">à vie</span>.",
  "pricing.fc_sub": "Après cette offre, le prix passe à 299€. Pas de retour en arrière.",
  "pricing.fc_per_month": "/mois",
  "pricing.fc_lock": "12 mois · Verrouillé à vie",
  "pricing.fc_cta": "Rejoindre →",
  "pricing.fc_check1": "Clients illimités",
  "pricing.fc_check2": "Features Pro incluses",
  "pricing.fc_check3": "Anti-churn IA",
  "pricing.fc_check4": "Prix verrouillé à vie",
  "pricing.fc_check5": "Groupe privé Founders",
  "pricing.fc_check6": "Vote roadmap",
  "pricing.fc_check7": "Accès anticipé",
  "pricing.fc_check8": "Badge Founding",
  "pricing.starter_name": "Starter",
  "pricing.starter_desc": "Pour les coachs qui démarrent leur activité.",
  "pricing.per_month": "Par mois",
  "pricing.starter_f1": "Jusqu'à 5 clients",
  "pricing.starter_f2": "Dashboard coach complet",
  "pricing.starter_f3": "Programme builder illimité",
  "pricing.starter_f4": "Anti-churn IA",
  "pricing.starter_f5": "Messagerie + push notifs",
  "pricing.starter_f6": "0% commission sur tes revenus",
  "pricing.cta_join": "Rejoindre →",
  "pricing.pro_badge": "Recommandé",
  "pricing.pro_name": "Pro",
  "pricing.pro_desc": "Pour les coachs établis qui passent à l'échelle.",
  "pricing.pro_f1": "Jusqu'à 30 clients",
  "pricing.pro_f2": "Tout Starter +",
  "pricing.pro_f3": "Analytics + corrélations",
  "pricing.pro_f4": "Automatisations avancées",
  "pricing.pro_f5": "Rapports hebdo auto",
  "pricing.elite_name": "Elite",
  "pricing.elite_desc": "Pour les coachs qui veulent tout — et plus encore.",
  "pricing.elite_f1": "Clients illimités",
  "pricing.elite_f2": "Tout Pro +",
  "pricing.elite_f3": "Support prioritaire < 24h",
  "pricing.elite_f4": "Onboarding 1:1 à l'entrée",
  "pricing.elite_f5": "Groupe privé Elite",
  "faq.tag": "Questions fréquentes",
  "faq.title": "Tout ce que tu veux savoir.",
  "faq.q1": "Mes clients paient des frais ?",
  "faq.a1": "Jamais. Tes clients accèdent à leur espace gratuitement. Tu paies ton abonnement, c'est tout. Zéro frais cachés, zéro surprise.",
  "faq.q2": "C'est vraiment 0% de commission ?",
  "faq.a2": "Vraiment. Ce que tu encaisses, tu le gardes — intégralement. Trainerize prend jusqu'à 30%. Nous : zéro. Aujourd'hui, demain, toujours.",
  "faq.q3": "Je peux annuler quand je veux ?",
  "faq.a3": "Oui. En un clic depuis ton dashboard. Pas de justification, pas de préavis, pas d'appel de rétention. Tu es libre.",
  "faq.q4": "Mes clients doivent télécharger une app ?",
  "faq.a4": "Pas de passage par l'App Store ou Google Play — ton client ouvre rbperform.app dans son navigateur, clique « Ajouter à l'écran d'accueil » et l'app s'installe en 3 secondes. Fonctionne hors-ligne, push notifications actives, identique à une app native.",
  "faq.q5": "Comment l'anti-churn IA fonctionne ?",
  "faq.a5": "7 signaux comportementaux analysés en continu par client. Score de risque 0–100. Tu reçois une alerte avec l'action recommandée <strong style=\"color:rgba(255,255,255,0.7)\">7 jours avant</strong> qu'il décide de partir. Tu interviens au bon moment, tu gardes ton client.",
  "faq.q6": "C'est quoi l'offre Founding Coach ?",
  "faq.a6": "Les 30 premiers coachs paient <strong style=\"color:#00C9A7\">199€/mois verrouillé à vie</strong>. Clients illimités, toutes les features Pro, accès au groupe privé, vote sur la roadmap. Le prix passera à 299€ après. Une fois verrouillé, ton prix ne bouge plus — jamais.",
  "footer.tagline": "Le système qui transforme<br/>chaque coach en CEO.",
  "footer.legal_note": "© 2026 Rayan Bonte — Micro-entrepreneur<br/> SIRET 990 637 803 00018<br/> 10 Rue Cardinale, 84000 Avignon, France<br/> Hébergé par Vercel Inc. — San Francisco, CA",
  "footer.col_follow": "Suivre",
  "footer.col_resources": "Ressources",
  "footer.res_comparison": "Comparaison",
  "footer.res_security": "Sécurité",
  "footer.res_status": "Statut plateforme",
  "footer.col_legal": "Légal",
  "footer.legal_mentions": "Mentions légales",
  "footer.legal_rgpd": "Confidentialité & RGPD",
  "footer.legal_cgu": "CGU / CGV",
  "footer.manage_cookies": "Gérer mes cookies",
  "footer.col_contact": "Contact",
  "footer.become_founder": "Devenir Founding Coach →",
  "sticky.label": "Founding Coach Program — <b>30 fondateurs</b>",
  "sticky.cta": "Rejoindre les 30 Founding Coachs →"
},
en: {
  "nav.features": "Features",
  "nav.pricing": "Pricing",
  "nav.login": "Sign in",
  "hero.eyebrow": "Premium coaching SaaS",
  "hero.countdown_label": "Official launch in",
  "hero.countdown_unit": "days",
  "how.tag": "How it works",
  "how.title": "3 steps.<br/>Not one more.",
  "how.s1_title": "Create your account",
  "how.s1_desc": "Set up your branding (logo, colors), your payment link and your first invitation code. 2 minutes flat.",
  "how.s2_title": "Invite your clients",
  "how.s2_desc": "Share your 6-digit code or personalized invitation link. Your clients sign up in 30 seconds.",
  "how.s3_title": "Steer and perform",
  "how.s3_desc": "Build programs, track activity, anticipate churn, grow your business. RB handles the rest.",
  "stack.tag": "Built for serious coaches",
  "stack.title": "More than an app.<br/>A system.",
  "stack.c1_tag": "Performance",
  "stack.c1_title": "Real-time<br/>business score.",
  "stack.c1_desc": "One number that sums up your business health. Live-computed from retention, MRR, client activity and momentum. You know in 2 seconds if your month is solid.",
  "stack.c2_tag": "Anticipation",
  "stack.c2_title": "AI sees before you.",
  "stack.c2_desc": "7 signals per client analyzed continuously. When a churn score exceeds 60, you get an alert with the recommended action. You save clients others let go.",
  "stack.c3_tag": "Tracking",
  "stack.c3_title": "You see everything.<br/>Your client does nothing.",
  "stack.c3_desc": "Voice AI nutrition, barcode scanner, weight, sleep, steps — everything logs automatically. Your client says \"a bowl of salmon pasta\" and macros drop in 2 seconds.",
  "founder.role": "Founder note",
  "founder.message": "I built RB Perform because the existing tools were <strong>robbing coaches</strong> — 30% commission, dated interfaces, non-existent support. I wanted a system that gives you <strong>CEO-level weapons</strong>, without taking a cent of your revenue. You pay for the tech, period. The rest is yours.",
  "quiz.tag": "Find your plan in 5 seconds",
  "quiz.q": "How many clients do you coach?",
  "quiz.opt1": "Starting out",
  "quiz.opt2": "Established",
  "quiz.opt3": "Scaling",
  "a11y.skip": "Skip to content",
  "nav.waitlist": "Join",
  "menu.ch0": "The System",
  "menu.ch1": "Your Business",
  "menu.ch3": "Features",
  "menu.ch4": "Explore",
  "menu.ch5": "Your Offer",
  "menu.cta": "Join the 30 Founding Coaches →",
  "hero.sub": "The system that turns<br/>every coach into a CEO.",
  "hero.enter": "Enter",
  "how.header_tag": "The System",
  "how.header_title": "Some coaches have talent.<br/>The best have a system.",
  "how.stat1_label": "Commission",
  "how.stat2_label": "Clients / 1 coach",
  "how.stat3_label": "To get started",
  "how.b1_num": "01 — CEO Dashboard",
  "how.b1_title": "You know exactly<br/>where your business stands.",
  "how.b1_sub": "MRR, ARR, live business score. The cockpit Trainerize hides behind 3 tabs.",
  "how.b1_stat": "Average score of our coaches after 30 days: 84/100",
  "how.badge_starter": "Included from Starter",
  "how.b1_bul1": "Real-time 0–100 score",
  "how.b1_bul2": "MRR · ARR · Retention",
  "how.b1_bul3": "Auto expiration alerts",
  "how.b1_unit": "Live Score",
  "how.b2_num": "02 — AI Anti-Churn",
  "how.b2_title": "You save clients<br/>before they leave.",
  "how.b2_sub": "7 signals per client. You step in 7 days before they decide.",
  "how.b2_stat": "Average retention with anti-churn active: 94%",
  "how.b2_bul1": "7 behavioral signals",
  "how.b2_bul2": "Churn score 0–100",
  "how.b2_bul3": "Auto recommended action",
  "how.b2_unit": "Of Churn",
  "how.b3_num": "03 — Total Client Tracking",
  "how.b3_title": "You see everything.<br/>Your client does nothing.",
  "how.b3_sub": "Voice AI nutrition, barcode scanner, weight, sleep, steps. Everything logs automatically.",
  "how.b3_stat": "Average time to log a meal: 2 seconds",
  "how.b3_bul1": "Voice AI: \"a bowl of salmon pasta\" → macros in 2s",
  "how.b3_bul2": "Barcode scanner: 3M+ products",
  "how.b3_bul3": "Weight · sleep · steps · water — auto-tracking",
  "how.b3_unit": "To Log",
  "how.b4_num": "04 — Programme Builder",
  "how.b4_title": "Your programmes<br/>in minutes, not hours.",
  "how.b4_sub": "Drag & drop. Signed PDF. YouTube videos. Zero Excel.",
  "how.b4_stat": "Average time to build a 12-week programme: 4 min",
  "how.b4_bul1": "Multi-week drag & drop",
  "how.b4_bul2": "Signed PDF export",
  "how.b4_bul3": "Live preview",
  "how.b4_unit": "Min To Build",
  "how.b5_num": "05 — Automations",
  "how.b5_title": "You work less.<br/>Your clients progress more.",
  "how.b5_sub": "Auto reports. Auto reminders. Auto renewals.",
  "how.b5_stat": "Average admin time saved per coach: 12h/month",
  "how.b5_bul1": "Auto-sent weekly reports",
  "how.b5_bul2": "Reminder if inactive 3d",
  "how.b5_bul3": "Auto renewal",
  "how.b5_unit": "Saved / Week",
  "how.b6_num": "06 — Zero Commission",
  "how.b6_title": "What you earn,<br/>you keep.",
  "how.b6_sub": "Trainerize takes up to 30%. Us: zero. For life.",
  "how.b6_stat": "Average savings vs competing platforms: €5,400/year",
  "how.badge_lifetime": "Guaranteed for life",
  "how.b6_bul1": "0% commission taken",
  "how.b6_bul2": "Your revenue stays 100% yours",
  "how.b6_bul3": "+€450/month recovered vs competitors",
  "how.b6_unit": "Commission",
  "bento.tag": "One platform. Full arsenal.",
  "bento.title": "Built for coaches<br>who never stop.</br>",
  "bento.mission_tag": "Our mission",
  "bento.mission_title": "Make every<br>sports coach<br>an<span style=\"color:var(--orange)\"> independent</span><br>entrepreneur.</br></br></br>",
  "bento.mission_desc": "US platforms like Trainerize take up to 30% of your revenue. Us: zero. You pay for the tech, not for your success. Your turnover stays yours, fully.",
  "bento.stat1_label": "Commission taken",
  "bento.feat1_title": "AI Anti-churn",
  "bento.feat1_desc": "7 signals analyzed in real time to predict who's about to drop off.",
  "bento.live_dashboard": "Live dashboard",
  "bento.score_business": "Business Score",
  "bento.stat2_label": "AI signals analyzed per client",
  "bento.stat3_label": "To onboard a client",
  "bento.feat2_title": "Smart automations",
  "bento.feat2_desc": "Weekly reports, churn alerts, reminders — everything goes out automatically. You run your business, not your paperwork.",
  "bento.cta_title": "30 spots. Price locked for life.",
  "bento.cta_btn": "Join the Founding Coaches →",
  "biz.tl_title": "One day.<br/>Two realities.",
  "biz.tl_without": "Without RB Perform",
  "biz.tl_w1": "You open Excel. You search who paid. You don't know.",
  "biz.tl_w2": "Thomas hasn't opened his app for 8 days. You find out too late.",
  "biz.tl_w3": "Marie wants to quit. You didn't see it coming.",
  "biz.tl_w4": "2 hours of manual reports. 2 hours lost.",
  "biz.tl_w5": "2 clients gone. Without understanding why.",
  "biz.tl_with": "With RB Perform",
  "biz.tl_a1": "Dashboard open. MRR, retention, score: everything is there in 3 seconds.",
  "biz.tl_a2": "RB alert: Thomas at risk for 3 days. Message in 1 click. He stays.",
  "biz.tl_a3": "Marie gets her auto report. She sees her progress. She renews.",
  "biz.tl_a4": "Reports went out automatically. You did nothing.",
  "biz.tl_a5": "0 clients lost. +€150 recovered. You're CEO.",
  "business.tag": "Your business in numbers",
  "business.title": "What RB Perform<br/>changes. Concretely.",
  "business.intro": "Compute. Visualize. Decide.",
  "business.roi_title": "Calculate your potential<span style=\"color:#00C9A7\">.</span>",
  "business.roi_sub": "Set your numbers. See what you take home.",
  "business.roi_slider1": "Number of clients",
  "business.roi_clients_unit": "clients",
  "business.roi_slider2": "Monthly price",
  "business.roi_tarif_unit": "€ / month",
  "business.roi_mrr_label": "Your potential MRR",
  "business.roi_gain_label": "Revenue recovered / year",
  "business.roi_hours_label": "Hours saved / month",
  "demo.title": "Test. Judge. Decide.",
  "demo.sub": "15 minutes of full access. No account needed.<br/> <span style=\"color:rgba(255,255,255,0.55)\">No card required, no commitment.</span>",
  "demo.coach_tag": "Coach View · CEO Dashboard",
  "demo.coach_title": "You steer your business<br/>in real time.",
  "demo.coach_chip1": "Live MRR",
  "demo.coach_chip2": "AI Anti-Churn",
  "demo.coach_chip3": "CRM Pipeline",
  "demo.coach_cta": "Explore the coach demo →",
  "demo.client_tag": "Client View · Premium App",
  "demo.client_title": "Your client lives a<br/>premium experience.",
  "demo.client_chip1": "Interactive Programme",
  "demo.client_chip2": "AI Nutrition",
  "demo.client_chip3": "Full Tracking",
  "demo.client_cta": "Explore the client demo →",
  "demo.microcopy": "8 fictional clients · All features active · No card required · 15 min of access",
  "faq.tag": "Frequently asked",
  "faq.title": "Everything you want to know.",
  "faq.q1": "Do my clients pay fees?",
  "faq.a1": "Never. Your clients access their space for free. You pay your subscription, that's it. Zero fee on their side, ever.",
  "faq.q2": "Is it really 0% commission?",
  "faq.a2": "Truly. What you take in, you keep — fully. Trainerize takes up to 30%. Us: zero, forever. On €5,000 MRR you save €1,500/month vs Trainerize.",
  "faq.q3": "Can I cancel anytime?",
  "faq.a3": "Yes. In one click from your dashboard. No justification, no notice, no retention call. You leave, your data is exported in your format, end of story.",
  "faq.q4": "Do my clients need to download an app?",
  "faq.a4": "No App Store or Google Play — your client opens rbperform.app in their browser. They can install it on their home screen in 1 click (works on iPhone & Android), and the app behaves like a native app: push notifications, offline, full-screen.",
  "faq.q5": "How does the AI anti-churn work?",
  "faq.a5": "7 behavioral signals analyzed continuously per client. Risk score 0–100. You get a daily alert with the action to take. Average retention: 94% vs 75% without.",
  "faq.q6": "What's the Founding Coach offer?",
  "faq.a6": "The first 30 coaches pay <strong style=\"color:#00C9A7\">€199/month locked for life</strong>. After that, the price moves to €299, then €499. The 30 founding coaches keep €199 — forever, with all future features included.",
  "features.tag": "Why it's different",
  "features.title": "I built what<br>I wish I had had.</br>",
  "features.intro": "High-level athlete. Years of advising athletes around me. I know every problem coaches face — because I lived them.",
  "footer.tagline": "The system that turns<br/>every coach into a CEO.",
  "footer.legal_note": "© 2026 Rayan Bonte — Sole proprietor<br/> SIRET 990 637 803 00018<br/> 10 Rue Cardinale, 84000 Avignon",
  "footer.col_follow": "Follow",
  "footer.col_resources": "Resources",
  "footer.res_comparison": "Comparison",
  "footer.res_security": "Security",
  "footer.res_status": "Platform status",
  "footer.col_legal": "Legal",
  "footer.legal_mentions": "Legal notice",
  "footer.legal_rgpd": "Privacy & GDPR",
  "footer.legal_cgu": "Terms of service",
  "footer.manage_cookies": "Manage cookies",
  "footer.col_contact": "Contact",
  "footer.become_founder": "Become a Founding Coach →",
  "ft.f1_eyebrow": "MRR Dashboard + Forecast",
  "ft.f1_title": "You know what you'll earn next month. Not approximately.",
  "ft.f1_built": "A dashboard that computes your MRR in real time, predicts your 90-day revenue, and shows exactly which clients renew, which churn, which upgrade.",
  "ft.f1_result": "You open RB Perform in the morning. In <strong>3 seconds</strong> you know: how much you earn this month, who's leaving, who's renewing. No more guessing, no more Excel.",
  "ft.f1_stat_label": "Forecast",
  "ft.f2_eyebrow": "AI Anti-Churn Alerts",
  "ft.f2_title": "AI sees that your client is about to leave. 7 days before he does.",
  "ft.f2_built": "An algorithm analyzing 7 signals per client continuously: session frequency, RPE, weight, behavior, communication, satisfaction, momentum. Risk score 0–100, daily.",
  "ft.f2_result": "A coach loses on average <strong>25% of his clients per year</strong> without seeing it. With anti-churn alerts, you act 7 days before he decides. Retention shifts to 94%.",
  "ft.f2_stat_label": "Signals analyzed / client",
  "ft.f3_eyebrow": "Programme Builder",
  "ft.f3_title": "Your programmes build in minutes. Not hours on Excel.",
  "ft.f3_built": "Multi-week, drag-and-drop, integrated YouTube videos, motivation notes, live preview. You build a 12-week programme in 4 minutes, ready to send.",
  "ft.f3_result": "No more PDFs on WhatsApp. Your client opens his app, sees today's session, <strong>launches it, logs in real time</strong>. You see his loads, his RPE, his feedback — instantly.",
  "ft.f3_mock_label": "Week 1 · Push",
  "ft.f3_add_exercise": "+ Add an exercise",
  "ft.f4_eyebrow": "Business Score",
  "ft.f4_title": "One number. Your entire business health.",
  "ft.f4_built": "A 0 to 100 score computed in real time from your retention, MRR, client activity, churn rate, and momentum. You see at a glance if your month is solid.",
  "ft.f4_result": "You no longer rely on instinct to know if your business is solid. You have <strong>one number</strong> that tells the truth. Below 60: alert. Above 80: you're crushing.",
  "ft.f4_score_label": "Score",
  "ft.stat_break": "A coach uses on average <strong style=\"color:rgba(255,255,255,0.7)\">4.7 different tools</strong> to run their activity. RB Perform replaces them all.",
  "ft.f5_eyebrow": "Voice AI Nutrition",
  "ft.f5_title": "Your client says what he ate. AI does the rest.",
  "ft.f5_built": "\"A bowl of salmon pasta\" — 2 seconds, macros drop. No scanning, no manual search. The AI understands portions, ingredients, cooking — even from a voice memo.",
  "ft.f5_result": "You see <strong>what your client really eats</strong> — without asking him. Macros, calories, hydration, sleep. The full picture, automatically.",
  "ft.f5_vocal_label": "Voice AI",
  "ft.f5_vocal_quote": "\"A bowl of salmon pasta\"",
  "ft.f5_macro_kcal": "Calories",
  "ft.f5_macro_protein": "Protein",
  "ft.f5_macro_carbs": "Carbs",
  "ft.f5_macro_fat": "Fats",
  "ft.f6_eyebrow": "AI Analyzer · Mistral",
  "ft.f6_title": "Ask AI what your client isn't telling you.",
  "ft.f6_built": "One button. You click, AI analyzes everything: sessions, nutrition, weight, RPE, frequency, trends. You get a deep analysis + recommended actions, in 5 seconds.",
  "ft.f6_result": "You move from <strong>\"I think Thomas is fine\"</strong> to <strong>\"Thomas shows 3 disengagement signals — call him today\"</strong>. AI takes the noise off and gives you the signal.",
  "ft.f7_eyebrow": "Client App · iOS & Android",
  "ft.f7_title": "Your client opens his app. He lives a premium experience.",
  "ft.f7_built": "Installable in 1 click from Safari (iPhone) or Chrome (Android) — the app appears on the home screen like a native app. Push, offline, full-screen.",
  "ft.f7_result": "Your client no longer tells you \"I did my session\". <strong>You see it. Live.</strong> Loads, RPE, feedback. The whole session, in your dashboard, in real time.",
  "ft.f7_session_today": "Today's session",
  "ft.f7_session_title": "Push · Week 1",
  "ft.f7_exos": "Exos",
  "ft.f7_duration": "Duration",
  "ft.f7_start": "Start",
  "pricing.tag": "Coach pricing",
  "pricing.title": "What you don't know<br/>is killing you.",
  "pricing.sub": "Every month without visibility is a client leaving in silence.",
  "pricing.support": "7-day support",
  "pricing.fc_badge": "Founder Offer",
  "pricing.fc_title": "Today's price is your price <span style=\"color:#00C9A7\">for life</span>.",
  "pricing.fc_sub": "After this offer, the price moves to €299. No going back.",
  "pricing.fc_per_month": "/month",
  "pricing.fc_lock": "12 months · Locked for life",
  "pricing.fc_cta": "Join →",
  "pricing.fc_check1": "Unlimited clients",
  "pricing.fc_check2": "Pro features included",
  "pricing.fc_check3": "AI anti-churn",
  "pricing.fc_check4": "Price locked for life",
  "pricing.fc_check5": "Private Founders group",
  "pricing.fc_check6": "Roadmap vote",
  "pricing.fc_check7": "Early access",
  "pricing.fc_check8": "Founding badge",
  "pricing.starter_name": "Starter",
  "pricing.starter_desc": "For coaches starting their activity.",
  "pricing.per_month": "Per month",
  "pricing.starter_f1": "Up to 5 clients",
  "pricing.starter_f2": "Full coach dashboard",
  "pricing.starter_f3": "Unlimited programme builder",
  "pricing.starter_f4": "AI anti-churn",
  "pricing.starter_f5": "Messaging + push notifs",
  "pricing.starter_f6": "0% commission on your revenue",
  "pricing.cta_join": "Join →",
  "pricing.pro_badge": "Recommended",
  "pricing.pro_name": "Pro",
  "pricing.pro_desc": "For established coaches scaling up.",
  "pricing.pro_f1": "Up to 30 clients",
  "pricing.pro_f2": "All Starter +",
  "pricing.pro_f3": "Analytics + correlations",
  "pricing.pro_f4": "Advanced automations",
  "pricing.pro_f5": "Auto weekly reports",
  "pricing.elite_name": "Elite",
  "pricing.elite_desc": "For coaches who want it all — and more.",
  "pricing.elite_f1": "Unlimited clients",
  "pricing.elite_f2": "All Pro +",
  "pricing.elite_f3": "Priority support < 24h",
  "pricing.elite_f4": "1:1 onboarding at signup",
  "pricing.elite_f5": "Private Elite group",
  "sentinel.badge": "Sentinel active",
  "sentinel.title": "I built a Sentinel into your app<span>.</span>",
  "sentinel.sub": "To save your money. An AI that runs every morning at 7am — it scans your clients, your pricing, and surfaces what you need to act on. You wake up to the playbook of the day.",
  "sentinel.notif1": "<div class=\"sl-time\">07:31</div> <span class=\"sl-warn\">CHURN ALERT</span> — Client M.D. inactive 8 days",
  "sentinel.notif2": "<div class=\"sl-time\">07:32</div> <span class=\"sl-warn\">UPSELL DETECTED</span> — Client S.R. plan ending",
  "sentinel.notif3": "<div class=\"sl-time\">07:33</div> <span style=\"color:#818cf8;font-weight:700\">MARKET PRICE</span> — Your range is below market",
  "sentinel.notif4": "<div class=\"sl-time\">07:34</div> <span class=\"sl-ok\">TODAY'S PLAYBOOK</span> — 3 actions generated",
  "sentinel.total_label": "Recovered this month thanks to Sentinel",
  "sticky.label": "Founding Coach Program — <b>30 founders</b>",
  "sticky.cta": "Join the 30 Founding Coaches →"
}
};
function initLangToggle() {
var btns = document.querySelectorAll('.lang-toggle button');
if (!btns.length) return;
var saved = 'fr';
try { saved = localStorage.getItem('rb_lang') || 'fr'; } catch (e) {}
applyLang(saved);
btns.forEach(function(b) {
b.addEventListener('click', function() {
var lang = b.dataset.lang;
applyLang(lang);
try { localStorage.setItem('rb_lang', lang); } catch (e) {}
});
});
function applyLang(lang) {
var dict = I18N[lang] || I18N.fr;
document.querySelectorAll('[data-i18n]').forEach(function(el) {
var key = el.dataset.i18n;
if (dict[key] !== undefined) el.innerHTML = dict[key];
});
document.documentElement.lang = lang;
btns.forEach(function(b) {
var active = b.dataset.lang === lang;
b.classList.toggle('active', active);
b.setAttribute('aria-pressed', active ? 'true' : 'false');
});
}
}
function initStackingCards() {
var list = document.getElementById('stackList');
if (!list) return;
var cards = list.querySelectorAll('.stack-card');
if (cards.length < 2) return;
for (var i = 0; i < cards.length - 1; i++) {
(function(currentCard, nextCard) {
var observer = new IntersectionObserver(function(entries) {
entries.forEach(function(e) {
currentCard.classList.toggle('faded', e.isIntersecting);
});
}, {
rootMargin: '-40% 0px 0px 0px',
threshold: 0
});
observer.observe(nextCard);
})(cards[i], cards[i + 1]);
}
}
function initPauseOffscreen() {
if (!('IntersectionObserver' in window)) return;
var animElements = [
'.iphone-wrap',
'.plan.featured',
'.hero-mesh'
];
animElements.forEach(function(sel) {
document.querySelectorAll(sel).forEach(function(el) {
var observer = new IntersectionObserver(function(entries) {
entries.forEach(function(e) {
el.classList.toggle('anim-paused', !e.isIntersecting);
});
}, { threshold: 0 });
observer.observe(el);
});
});
}
function initHowSteps() {
var steps = document.getElementById('howSteps');
if (!steps) return;
var observer = new IntersectionObserver(function(entries) {
entries.forEach(function(e) {
if (e.isIntersecting) {
steps.classList.add('in');
observer.unobserve(steps);
}
});
}, { threshold: 0.3 });
observer.observe(steps);
}
function initFounderSig() {
var sig = document.getElementById('founderSig');
if (!sig) return;
var observer = new IntersectionObserver(function(entries) {
entries.forEach(function(e) {
if (e.isIntersecting) {
sig.classList.add('in');
observer.unobserve(sig);
}
});
}, { threshold: 0.5 });
observer.observe(sig);
}
function initQuiz() {
var opts = document.querySelectorAll('.quiz-opt');
var result = document.getElementById('quizResult');
if (!opts.length || !result) return;
var RESULTS = {
starter: {
tag: 'Plan recommandé',
title: 'Starter — 149€/mois',
desc: 'Parfait pour bâtir tes fondations : dashboard, programme builder, messagerie, jusqu\'à 5 clients. Tu démarres carré, sans surpayer.',
href: '/founding.html',
cta: 'Démarrer Starter'
},
pro: {
tag: 'Plan recommandé',
title: 'Pro — 299€/mois',
desc: 'Le plan le plus choisi. Anti-churn IA, analytics avancées, automatisations complètes, jusqu\'à 30 clients. C\'est le standard pour les coachs établis.',
href: '/founding.html',
cta: 'Démarrer Pro'
},
elite: {
tag: 'Plan recommandé',
title: 'Elite — 399€/mois',
desc: 'Pour scale sans limite : clients illimités, support prioritaire 7j/7, onboarding 1:1, domaine custom inclus. Le maximum.',
href: '/founding.html',
cta: 'Démarrer Elite'
}
};
opts.forEach(function(opt) {
opt.addEventListener('click', function() {
opts.forEach(function(o) { o.classList.remove('selected'); });
opt.classList.add('selected');
var key = opt.dataset.result;
var r = RESULTS[key];
if (!r) return;
result.innerHTML =
'<div class="r-tag">' + r.tag + '</div>' +
'<div class="r-title">' + r.title + '</div>' +
'<p class="r-desc">' + r.desc + '</p>' +
'<a href="' + r.href + '" class="btn btn-orange magnetic" target="_blank" rel="noopener">' + r.cta +
' <svg class="arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
'</a>';
result.classList.add('show');
var newBtn = result.querySelector('.magnetic');
if (newBtn && !noHover) {
newBtn.addEventListener('mousemove', function(e) {
var rect = newBtn.getBoundingClientRect();
var x = e.clientX - rect.left - rect.width / 2;
var y = e.clientY - rect.top - rect.height / 2;
newBtn.style.transform = 'translate(' + Math.max(-8, Math.min(8, x * 0.25)) + 'px, ' + Math.max(-8, Math.min(8, y * 0.25)) + 'px)';
});
newBtn.addEventListener('mouseleave', function() { newBtn.style.transform = ''; });
}
});
});
}
})();
(function() {
window.__SECTIONS__ = [
'hero','how',
'bento','features','pricing'
];
const sections = document.querySelectorAll('section');
const burger   = document.getElementById('burgerBtn');
const overlay  = document.getElementById('menuOverlay');
if (window.ScrollTrigger) {
ScrollTrigger.getAll().forEach(t => t.kill());
}
if (window.gsap) {
document.querySelectorAll('section *').forEach(el => {
gsap.set(el, { clearProps: "opacity,transform,visibility,y,x" });
});
}
function showSection(className) {
document.querySelectorAll('section').forEach(s => {
s.classList.remove('active');
s.classList.remove('gsap-override');
});
const target = document.querySelector('section.' + className);
if (target) {
target.classList.add('active');
target.classList.add('gsap-override');
target.scrollTop = 0;
}
window.__currentSection__ = className;
}
showSection('hero');
const heroArrow = document.querySelector('.hero-scroll, .hero .scroll-hint, [data-next], .hero a[href="#manifeste"], .hero-arrow');
if (heroArrow) {
heroArrow.addEventListener('click', (e) => {
e.preventDefault();
showSection('how');
});
}
document.querySelector('section.hero')?.addEventListener('click', (e) => {
const arrow = e.target.closest('a, button, [data-next]');
if (arrow && arrow.classList.contains('hero-arrow')) {
e.preventDefault();
showSection('how');
}
});
var activeSection = 'hero';
function updateMenuHighlight(target) {
activeSection = target;
document.querySelectorAll('.menu-chapter').forEach(function(link) {
var isActive = link.dataset.target === target;
link.style.opacity = '1';
link.querySelector('.ch-name').style.color = isActive ? '#00C9A7' : '#fff';
link.querySelector('.ch-num').style.color = isActive ? '#00C9A7' : 'rgba(255,255,255,0.3)';
});
}
document.querySelectorAll('.menu-chapter').forEach(function(link) {
link.addEventListener('click', function(e) {
e.preventDefault();
e.stopPropagation();
var target = link.dataset.target;
burger.classList.remove('open');
overlay.classList.remove('open');
document.body.style.overflow = '';
setTimeout(function() {
showSection(target);
updateMenuHighlight(target);
}, 350);
});
});
var heroEnter = document.getElementById('heroEnter');
if (heroEnter) {
heroEnter.addEventListener('click', function() {
showSection('how');
updateMenuHighlight('how');
});
}
updateMenuHighlight('hero');
})();
(function(){
const takenEl = document.getElementById('counter-taken');
const todayEl = document.getElementById('counter-today-n');
if (takenEl) {
const day = new Date().getDate();
const h   = new Date().getHours();
const taken = Math.min(37 + Math.floor(day / 8) + (h > 12 ? 1 : 0), 49);
const today = [2,2,3,3,4,4,5,5,6,6,7,7][Math.min(Math.floor(h / 2), 11)];
takenEl.textContent = taken;
if (todayEl) todayEl.textContent = today;
}
})();
(function(){
const clientsSlider = document.getElementById('roi-clients');
const tarifSlider   = document.getElementById('roi-tarif');
if (!clientsSlider || !tarifSlider) return;
const clientsVal = document.getElementById('roi-clients-val');
const tarifVal   = document.getElementById('roi-tarif-val');
const mrrEl      = document.getElementById('roi-mrr');
const mrrSub     = document.getElementById('roi-mrr-sub');
const lossEl     = document.getElementById('roi-loss');
const gainEl     = document.getElementById('roi-gain');
const multEl     = document.getElementById('roi-multiple');
const concEl     = document.getElementById('roi-conclusion');
function sliderToClients(v){ return Math.round(2 + Math.pow(v / 100, 2) * 98); }
function rbCost(c){ return c <= 5 ? 149 * 12 : 299 * 12; }
function rbPlan(c){ return c <= 5 ? 'Starter 149€' : 'Pro 299€'; }
function fmt(n){ return Math.round(n).toLocaleString('fr-FR'); }
function update(){
const raw     = +clientsSlider.value;
const clients = sliderToClients(raw);
const tarif   = +tarifSlider.value;
const mrr     = clients * tarif;
const annuel  = mrr * 12;
const clientsPerdus = Math.max(1, Math.round(clients * 0.25));
const perteTotale = clientsPerdus * tarif * 12;
const gainRB = Math.round(perteTotale * 0.8);
const cost = rbCost(clients);
const roiMult = cost > 0 ? (gainRB / cost).toFixed(1) : '0';
var hoursPerMonth = Math.round(3 + clients * 0.5);
var hoursEl = document.getElementById('roi-hours');
if (clientsVal) clientsVal.textContent = clients;
if (tarifVal)   tarifVal.textContent   = tarif;
if (hoursEl)    hoursEl.textContent    = '+' + hoursPerMonth + 'h';
if (mrrEl)      mrrEl.textContent      = fmt(mrr) + '€';
if (mrrSub)     mrrSub.textContent     = 'par mois · ' + fmt(annuel) + '€ / an';
if (gainEl)     gainEl.textContent     = '+' + fmt(gainRB) + '€';
if (multEl)     multEl.textContent     = '×' + roiMult;
if (concEl)     concEl.innerHTML       = 'Avec <strong>' + clients + ' clients</strong> à <strong>' + tarif + '€</strong>, tu perds <strong>' + clientsPerdus + ' client' + (clientsPerdus>1?'s':'') + '/an</strong> sans anti-churn. RB Perform en sauve 80% — soit <strong>+' + fmt(gainRB) + '€/an</strong> récupérés et <strong>+' + hoursPerMonth + 'h/mois</strong> gagnées.';
const pClients = raw;
const pTarif   = ((tarif - 50) / (500 - 50)) * 100;
clientsSlider.style.setProperty('--progress', pClients + '%');
tarifSlider.style.setProperty('--progress', pTarif + '%');
}
clientsSlider.addEventListener('input', update);
tarifSlider.addEventListener('input', update);
})();
(function(){
var end = new Date('2026-05-26T23:59:59').getTime();
var dEl = document.getElementById('fc-days');
var hEl = document.getElementById('fc-hours');
var mEl = document.getElementById('fc-mins');
var sEl = document.getElementById('fc-secs');
var cta = document.getElementById('foundingCTA');
if (!dEl) return;
function tick() {
var now = Date.now();
var diff = end - now;
if (diff <= 0) {
dEl.textContent = '00'; hEl.textContent = '00'; mEl.textContent = '00'; sEl.textContent = '00';
var wrap = document.getElementById('foundingCountdown');
if (wrap) wrap.innerHTML = '<div style="font-size:16px;font-weight:800;color:#ff6b6b;letter-spacing:0.1em;text-transform:uppercase">Offre expirée</div>';
if (cta) { cta.style.opacity = '0.4'; cta.style.cursor = 'not-allowed'; cta.onclick = function(e){ e.preventDefault(); }; }
return;
}
var d = Math.floor(diff / 86400000);
var h = Math.floor((diff % 86400000) / 3600000);
var m = Math.floor((diff % 3600000) / 60000);
var s = Math.floor((diff % 60000) / 1000);
dEl.textContent = String(d).padStart(2, '0');
hEl.textContent = String(h).padStart(2, '0');
mEl.textContent = String(m).padStart(2, '0');
sEl.textContent = String(s).padStart(2, '0');
}
tick();
setInterval(tick, 1000);
})();
(function(){
var content = document.getElementById('bmContent');
var crack = document.getElementById('bmCrack');
var glow = document.getElementById('bmGlow');
var ghost = document.getElementById('bmGhostNum');
var pulse = document.getElementById('bmPulse');
var particles = document.getElementById('bmParticles');
var flash = document.getElementById('bmFlash');
if (!content) return;
var clientsEl = document.getElementById('roi-clients');
var tarifEl = document.getElementById('roi-tarif');
var started = false;
var sliderTouched = false;
function getC(){ return clientsEl ? Math.round(2 + Math.pow(+clientsEl.value / 100, 2) * 98) : 10; }
function getT(){ return tarifEl ? +tarifEl.value : 150; }
function fmt(n){ return Math.round(n).toLocaleString('fr-FR'); }
function say(html, ms, dur){
var duration = dur || 0.9;
return new Promise(function(r){ setTimeout(function(){
var d = document.createElement('div');
d.innerHTML = html;
d.style.opacity = '0';
d.style.animation = 'bmFadeUp ' + duration + 's cubic-bezier(0.16,1,0.3,1) forwards';
content.appendChild(d); r();
}, ms); });
}
function clear(){ content.innerHTML = ''; }
function spawn(color, dir, n){
if(!particles) return; particles.innerHTML='';
for(var i=0;i<(n||25);i++){
var p=document.createElement('div'); p.className='bm-p';
p.style.left=Math.random()*100+'%';
p.style.background=color;
var s=2+Math.random()*3; p.style.width=s+'px'; p.style.height=s+'px';
p.style.animation=(dir==='down'?'bmFall':'bmRise')+' '+(3+Math.random()*4)+'s linear '+(Math.random()*2)+'s infinite';
particles.appendChild(p);
}
}
function clearP(){ if(particles) particles.innerHTML=''; }
function doCrack(){
if(!crack) return;
crack.style.opacity='1';
crack.querySelectorAll('.bm-crack-path').forEach(function(p){ p.style.animation='bmCrack1 1.2s ease forwards'; });
setTimeout(function(){ crack.querySelectorAll('.bm-crack-sub').forEach(function(p){ p.style.animation='bmCrack2 0.8s ease forwards'; }); },400);
}
function undoCrack(){
if(!crack) return; crack.style.opacity='0';
crack.querySelectorAll('path').forEach(function(p){ p.style.animation='none'; p.setAttribute('stroke-dashoffset',p.getAttribute('stroke-dasharray')); });
}
function showDormant(){
clear();
content.innerHTML = '<div style="text-align:center;padding:20px 0">' +
'<div style="font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.15);margin-bottom:16px">Black Mirror</div>' +
'<div style="font-family:\'Syne\',sans-serif;font-size:clamp(20px,3vw,28px);font-weight:900;color:rgba(255,255,255,0.4);line-height:1.3">Règle tes chiffres à gauche.<br>Puis regarde.</div></div>';
}
function run(){
if(started) return; started=true;
var c=getC(), t=getT();
var lost=Math.max(1,Math.round(c*0.25));
var lostY=lost*t*12;
var saved=Math.round(lostY*0.8);
clear(); undoCrack(); clearP();
if(glow) glow.style.opacity='0';
if(ghost){ ghost.textContent=''; ghost.style.filter='blur(12px)'; ghost.style.color='rgba(255,107,107,0.03)'; }
if(pulse){ pulse.style.animation='bmHeart 3s ease-in-out infinite'; pulse.style.background='radial-gradient(circle,rgba(255,255,255,0.015),#000 70%)'; }
say('<div style="font-family:\'Syne\',sans-serif;font-size:clamp(28px,5vw,44px);font-weight:900;color:#fff;line-height:1.1">Tu as '+c+' clients.</div>', 600, 0.8)
.then(function(){ return say('<div style="font-size:17px;color:rgba(255,255,255,0.4);margin-top:12px">Tu factures '+t+'€ par mois.</div>', 800, 0.7); })
.then(function(){ return say('<div style="font-size:16px;color:rgba(255,255,255,0.15);margin-top:14px">Tu penses que tout va bien.</div>', 1000, 0.8); })
.then(function(){ return new Promise(function(r){ setTimeout(r, 1200); }); })
.then(function(){ clear(); return say('<div style="font-size:14px;color:rgba(255,255,255,0.12);font-style:italic;letter-spacing:0.02em;line-height:1.7">En moyenne, un coach perd <span style="color:rgba(255,107,107,0.5);font-weight:700;font-style:normal">25%</span> de ses clients par an.</div>', 300, 1.0); })
.then(function(){ return say('<div style="font-family:\'Syne\',sans-serif;font-size:clamp(18px,3vw,26px);font-weight:900;color:rgba(255,107,107,0.4);margin-top:14px">Soit '+lost+' sur '+c+'.</div>', 1200, 0.9); })
.then(function(){ return new Promise(function(r){ setTimeout(function(){
if(pulse){ pulse.style.animation='bmHeartFast 1s ease-in-out infinite'; pulse.style.background='radial-gradient(circle,rgba(255,107,107,0.06),transparent 70%)'; }
doCrack();
if(ghost){ ghost.textContent='-'+fmt(lostY)+'€'; ghost.style.filter='blur(6px)'; }
r();
},1200); }); })
.then(function(){ return new Promise(function(r){ setTimeout(function(){ clear(); r(); },400); }); })
.then(function(){ return say('<div style="font-family:\'Syne\',sans-serif;font-size:clamp(20px,3.5vw,28px);font-weight:900;color:#ff6b6b;line-height:1.2">Tu vas perdre '+lost+' client'+(lost>1?'s':'')+' cette année.</div>', 200, 0.8); })
.then(function(){
if(ghost) ghost.style.filter='blur(0)';
return say('<div style="font-family:\'Bebas Neue\',sans-serif;font-size:clamp(72px,16vw,130px);color:#ff6b6b;line-height:1;margin:20px 0;animation:bmNumIn 0.8s cubic-bezier(0.16,1,0.3,1) forwards">'+fmt(lostY)+'€</div>', 700, 0.8);
})
.then(function(){ return say('<div style="font-size:15px;color:rgba(255,255,255,0.18);letter-spacing:0.05em">perdus. En silence.</div>', 600, 0.7); })
.then(function(){ return new Promise(function(r){ setTimeout(function(){
clear(); undoCrack(); clearP();
if(ghost){ ghost.textContent=''; ghost.style.filter='blur(12px)'; }
if(pulse){ pulse.style.animation='none'; pulse.style.background='transparent'; }
r();
},1400); }); })
.then(function(){ return say('<div style="font-family:\'Syne\',sans-serif;font-size:clamp(18px,3vw,26px);font-weight:900;color:rgba(255,255,255,0.25)">Et tu ne le sauras pas.</div>', 500, 1.0); })
.then(function(){ return new Promise(function(r){ setTimeout(function(){
clear();
if(glow) glow.style.opacity='1';
if(pulse){ pulse.style.animation='bmHeart 3s ease-in-out infinite'; pulse.style.background='radial-gradient(circle,rgba(0,201,167,0.06),transparent 70%)'; }
if(ghost){ ghost.style.color='rgba(0,201,167,0.03)'; ghost.textContent='+'+fmt(saved)+'€'; ghost.style.filter='blur(6px)'; }
r();
},800); }); })
.then(function(){ return say('<div style="font-family:\'Syne\',sans-serif;font-size:clamp(20px,3.5vw,28px);font-weight:900;color:#00C9A7;line-height:1.2">Sauf si tu vois avant eux.</div>', 400, 0.8); })
.then(function(){
if(ghost) ghost.style.filter='blur(0)';
return say('<div style="font-family:\'Bebas Neue\',sans-serif;font-size:clamp(64px,14vw,110px);color:#00C9A7;line-height:1;margin:20px 0;animation:bmNumIn 0.8s cubic-bezier(0.16,1,0.3,1) forwards">+'+fmt(saved)+'€</div>', 700, 0.8);
})
.then(function(){ return say('<div style="font-size:14px;color:rgba(255,255,255,0.22);margin-bottom:28px;letter-spacing:0.02em">par an. Récupérés avec RB Perform.</div>', 600, 0.7); })
.then(function(){ return say('<a href="javascript:void(0)" onclick="document.querySelector(\'[data-target=demo-section]\').click()" style="display:inline-block;padding:18px 40px;background:#00C9A7;color:#080C14;font-size:15px;font-weight:900;letter-spacing:0.04em;text-transform:uppercase;border-radius:12px;text-decoration:none;cursor:pointer;animation:bmGlow 2.5s ease-in-out infinite">Voir la démo</a>', 600, 0.8); })
.then(function(){ setTimeout(function(){ started=false; clearP(); }, 5000);
});
}
function abort(){
started = false;
clear(); undoCrack(); clearP();
if(ghost){ ghost.textContent=''; ghost.style.filter='blur(12px)'; }
if(glow) glow.style.opacity='0';
if(pulse){ pulse.style.animation='none'; pulse.style.background='transparent'; }
}
showDormant();
var clientsTouched = false;
var tarifTouched = false;
var idleTimer = null;
var hasPlayed = false;
function onSliderMove(isReplay){
if(idleTimer) clearTimeout(idleTimer);
if(started){ abort(); }
if(!hasPlayed && (!clientsTouched || !tarifTouched)) return;
idleTimer = setTimeout(function(){
hasPlayed = true;
clear();
say('<div style="font-family:\'Syne\',sans-serif;font-size:clamp(18px,3vw,24px);font-weight:900;color:rgba(255,255,255,0.25)">Analyse en cours...</div>', 0);
setTimeout(function(){ clear(); run(); }, 1500);
}, 1000);
}
if(clientsEl) clientsEl.addEventListener('input', function(){ clientsTouched=true; onSliderMove(); });
if(tarifEl) tarifEl.addEventListener('input', function(){ tarifTouched=true; onSliderMove(); });
var biz = document.querySelector('section.business');
if (biz) {
var mo = new MutationObserver(function(muts){
muts.forEach(function(m){
if (m.attributeName === 'class' && biz.classList.contains('active')) {
if (clientsTouched && tarifTouched && !started) setTimeout(run, 600);
else if (!clientsTouched || !tarifTouched) showDormant();
}
});
});
mo.observe(biz, { attributes: true });
}
})();
(function(){
var section = document.getElementById('tlSection');
if (!section) return;
var running = false;
function resetTimeline(){
var titleWrap = section.querySelector('.tl-title-wrap');
if (titleWrap) titleWrap.classList.remove('tl-visible');
var divInner = section.querySelector('.tl-divider-inner');
if (divInner) divInner.classList.remove('tl-active');
section.querySelectorAll('.tl-col').forEach(function(col){
col.classList.remove('tl-active');
col.style.animation = 'none';
});
section.querySelectorAll('.tl-item').forEach(function(item){
item.style.animation = 'none';
item.style.opacity = '0';
item.classList.remove('tl-impact');
var ghost = item.querySelector('.tl-ghost');
if (ghost) { ghost.classList.remove('tl-ghost-visible'); ghost.style.animation = 'none'; ghost.style.opacity = '0'; }
var hour = item.querySelector('.tl-hour');
if (hour) { hour.style.animation = 'none'; hour.style.opacity = ''; }
});
section.querySelectorAll('.tl-line-inner').forEach(function(l){ l.style.animation = 'none'; l.style.height = '0'; });
}
function runTimeline(){
if (running) return;
running = true;
resetTimeline();
void section.offsetHeight;
var titleWrap = section.querySelector('.tl-title-wrap');
setTimeout(function(){ if (titleWrap) titleWrap.classList.add('tl-visible'); }, 200);
var divInner = section.querySelector('.tl-divider-inner');
setTimeout(function(){ if (divInner) divInner.classList.add('tl-active'); }, 600);
var leftCol = section.querySelector('[data-tl-side="left"]');
var rightCol = section.querySelector('[data-tl-side="right"]');
var leftBase = 800;
var rightBase = 1200;
function animateCol(col, baseDelay){
if (!col) return;
setTimeout(function(){ col.classList.add('tl-active'); }, baseDelay);
var side = col.getAttribute('data-tl-side');
var anim = side === 'left' ? 'tlItemLeft' : 'tlItemRight';
var items = col.querySelectorAll('.tl-item');
items.forEach(function(item, i){
var delay = baseDelay + (i * 600) + 300;
var isImpact = item.getAttribute('data-tl-impact') === 'true';
setTimeout(function(){
var hour = item.querySelector('.tl-hour');
if (hour) { hour.style.animation = 'tlHourFade 0.6s cubic-bezier(0.16,1,0.3,1) forwards'; }
setTimeout(function(){
item.style.animation = anim + ' 0.9s cubic-bezier(0.16,1,0.3,1) forwards';
}, 150);
var ghost = item.querySelector('.tl-ghost');
if (ghost) {
setTimeout(function(){ ghost.classList.add('tl-ghost-visible'); }, 500);
}
if (isImpact) {
setTimeout(function(){ item.classList.add('tl-impact'); }, 400);
}
}, delay);
});
}
animateCol(leftCol, leftBase);
animateCol(rightCol, rightBase);
var totalItems = section.querySelectorAll('.tl-item').length;
setTimeout(function(){ running = false; }, rightBase + totalItems * 600 + 1500);
}
var biz = document.querySelector('section.business');
if (biz) {
var mo = new MutationObserver(function(muts){
muts.forEach(function(m){
if (m.attributeName === 'class') {
if (biz.classList.contains('active')) {
setTimeout(runTimeline, 400);
} else {
running = false;
resetTimeline();
}
}
});
});
mo.observe(biz, { attributes: true });
if (biz.classList.contains('active')) setTimeout(runTimeline, 400);
}
})();
(function(){
var featSec = document.querySelector('section.features');
if (!featSec) return;
var blocks = featSec.querySelectorAll('.ft-reveal');
var scoreArc = featSec.querySelector('.ft-score-arc');
var scoreNum = featSec.querySelector('.ft-score-num');
var macroCards = featSec.querySelectorAll('.ft-macro-card');
var typeEl = featSec.querySelector('.ft-type');
var triggered = {};
function isInView(el) {
var rect = el.getBoundingClientRect();
var secRect = featSec.getBoundingClientRect();
return rect.top < secRect.bottom - 80 && rect.bottom > secRect.top + 80;
}
function checkScroll() {
blocks.forEach(function(b, i) {
if (b.classList.contains('ft-visible')) return;
if (isInView(b)) {
b.style.animationDelay = '0.1s';
b.classList.add('ft-visible');
if (b.querySelector('.ft-score-arc') && !triggered.score) {
triggered.score = true;
setTimeout(function(){
var target = 78;
scoreArc.style.strokeDashoffset = 327 - (327 * target / 100);
var curr = 0;
(function step(){ curr++; scoreNum.textContent = curr; if(curr < target) requestAnimationFrame(step); })();
}, 400);
}
if (b.querySelector('.ft-macro-card') && !triggered.macros) {
triggered.macros = true;
macroCards.forEach(function(c, j){
setTimeout(function(){
c.style.transition = 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)';
c.style.opacity = '1';
c.style.transform = 'translateY(0)';
}, 600 + j * 250);
});
}
if (b.querySelector('.ft-type') && !triggered.type) {
triggered.type = true;
var lines = [
'> RPE en hausse (+2.1)',
'> 2 seances manquees / 10j',
'> Nutrition irreguliere',
'',
'\u26A0 Risque de decrochage : 72/100',
'',
'\u2192 Contact proactif recommande',
'\u2192 Revoir charges semaine 3',
'\u2192 Check-in telephone 15 min'
];
var text = lines.join('\n');
var idx = 0;
setTimeout(function type(){
if(idx <= text.length){ typeEl.textContent = text.substring(0, idx); idx++; setTimeout(type, 22 + Math.random() * 18); }
}, 500);
}
}
});
}
function resetAll() {
triggered = {};
blocks.forEach(function(b){ b.classList.remove('ft-visible'); });
if (scoreArc) { scoreArc.style.strokeDashoffset = '327'; }
if (scoreNum) { scoreNum.textContent = '0'; }
macroCards.forEach(function(c){ c.style.opacity = '0'; c.style.transform = 'translateY(8px)'; c.style.transition = 'none'; });
if (typeEl) { typeEl.textContent = ''; }
}
featSec.addEventListener('scroll', checkScroll, { passive: true });
var mo = new MutationObserver(function(muts){
muts.forEach(function(m){
if (m.attributeName === 'class') {
if (featSec.classList.contains('active')) {
resetAll();
setTimeout(checkScroll, 300);
} else {
resetAll();
}
}
});
});
mo.observe(featSec, { attributes: true });
})();
(function(){
var btn = document.getElementById('bttBtn');
if (!btn) return;
function getActiveSection(){
var s = document.querySelector('section.active');
return s || null;
}
document.querySelectorAll('section').forEach(function(s){
s.addEventListener('scroll', function(){
if (!s.classList.contains('active')) return;
if (s.scrollTop > 400) {
btn.classList.add('visible');
} else {
btn.classList.remove('visible');
}
}, { passive: true });
});
var mo = new MutationObserver(function(){
btn.classList.remove('visible');
});
document.querySelectorAll('section').forEach(function(s){
mo.observe(s, { attributes: true, attributeFilter: ['class'] });
});
btn.addEventListener('click', function(){
var s = getActiveSection();
if (s) s.scrollTo({ top: 0, behavior: 'smooth' });
});
})();