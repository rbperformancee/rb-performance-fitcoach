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
'nav.features':'Features','nav.pricing':'Tarifs','nav.login':'Connexion',
'hero.eyebrow':'SaaS de coaching premium','hero.countdown_label':'Lancement officiel dans','hero.countdown_unit':'jours',
'how.tag':'Comment ça marche','how.title':'3 étapes.<br/>Pas une de plus.',
'how.s1_title':'Crée ton compte','how.s1_desc':"Configure ton branding (logo, couleurs), ton lien de paiement et ton premier code d'invitation. 2 minutes chrono.",
'how.s2_title':'Invite tes clients','how.s2_desc':"Partage ton code 6 chiffres ou ton lien d'invitation personnalisé. Tes clients s'inscrivent en 30 secondes.",
'how.s3_title':'Pilote et performe','how.s3_desc':"Crée des programmes, suis l'activité, anticipe le churn, fais grandir ton business. RB s'occupe du reste.",
'stack.tag':'Pensé pour les coachs sérieux','stack.title':'Plus qu\'une app.<br/>Un système.',
'stack.c1_tag':'Performance','stack.c1_title':'Score business<br/>en temps réel.','stack.c1_desc':'Un seul chiffre qui résume la santé de ton activité. Calculé live à partir de la rétention, du MRR, de l\'activité client et du momentum. Tu sais en 2 secondes si ton mois est solide.',
'stack.c2_tag':'Anticipation','stack.c2_title':'L\'IA voit avant toi.','stack.c2_desc':'7 signaux par client analysés en continu. Quand un score de churn dépasse 60, tu reçois une alerte avec l\'action recommandée. Tu sauves les clients que d\'autres laissent partir.',
'stack.c3_tag':'Suivi','stack.c3_title':'Tu vois tout.<br/>Ton client ne fait rien.','stack.c3_desc':'Nutrition IA vocale, scanner code-barre, poids, sommeil, pas — tout se logue automatiquement. Ton client dit "un bol de pâtes au saumon" et les macros tombent en 2 secondes.',
'founder.role':'Mot du fondateur','founder.message':'J\'ai construit RB Perform parce que les outils existants <strong>volaient les coachs</strong> — 30% de commission, interfaces décennales, support inexistant. J\'ai voulu un système qui te donne <strong>les armes des CEO</strong>, sans te prendre un centime sur tes revenus. Tu paies pour la techno, point. Le reste, c\'est à toi.',
'quiz.tag':'Trouve ton plan en 5 secondes','quiz.q':'Tu coaches combien de clients&nbsp;?','quiz.opt1':'Je démarre','quiz.opt2':'J\'établis','quiz.opt3':'Je scale'
},
en: {
'nav.features':'Features','nav.pricing':'Pricing','nav.login':'Sign in',
'hero.eyebrow':'Premium coaching SaaS','hero.countdown_label':'Official launch in','hero.countdown_unit':'days',
'how.tag':'How it works','how.title':'3 steps.<br/>Not one more.',
'how.s1_title':'Create your account','how.s1_desc':'Set up your branding (logo, colors), your payment link and your first invitation code. 2 minutes flat.',
'how.s2_title':'Invite your clients','how.s2_desc':'Share your 6-digit code or personalized invitation link. Your clients sign up in 30 seconds.',
'how.s3_title':'Steer and perform','how.s3_desc':'Build programs, track activity, anticipate churn, grow your business. RB handles the rest.',
'stack.tag':'Built for serious coaches','stack.title':'More than an app.<br/>A system.',
'stack.c1_tag':'Performance','stack.c1_title':'Real-time<br/>business score.','stack.c1_desc':'One number that sums up your business health. Live-computed from retention, MRR, client activity and momentum. You know in 2 seconds if your month is solid.',
'stack.c2_tag':'Anticipation','stack.c2_title':'AI sees before you.','stack.c2_desc':'7 signals per client analyzed continuously. When a churn score exceeds 60, you get an alert with the recommended action. You save clients others let go.',
'stack.c3_tag':'Tracking','stack.c3_title':'You see everything.<br/>Your client does nothing.','stack.c3_desc':'Voice AI nutrition, barcode scanner, weight, sleep, steps — everything logs automatically. Your client says "a bowl of salmon pasta" and macros drop in 2 seconds.',
'founder.role':'Founder note','founder.message':'I built RB Perform because the existing tools were <strong>robbing coaches</strong> — 30% commission, dated interfaces, non-existent support. I wanted a system that gives you <strong>CEO-level weapons</strong>, without taking a cent of your revenue. You pay for the tech, period. The rest is yours.',
'quiz.tag':'Find your plan in 5 seconds','quiz.q':'How many clients do you coach?','quiz.opt1':'Starting out','quiz.opt2':'Established','quiz.opt3':'Scaling'
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
title: 'Starter — 199€/mois',
desc: 'Parfait pour bâtir tes fondations : dashboard, programme builder, messagerie, jusqu\'à 10 clients. Tu démarres carré, sans surpayer.',
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
title: 'Elite — 499€/mois',
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
function rbCost(c){ return c <= 5 ? 199 * 12 : 299 * 12; }
function rbPlan(c){ return c <= 5 ? 'Starter 199€' : 'Pro 299€'; }
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
var end = new Date('2026-05-16T23:59:59').getTime();
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