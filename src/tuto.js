// Guide en images (Réglages → « Voir le guide ») : une étape par écran, avec
// un mini-écran dessiné dans le style de l'app et un point qui pulse là où
// il faut toucher. Rien n'est enregistré, tout est fictif.

const tap = '<span class="tp-tap" aria-hidden="true"></span>';

/** Étapes du guide. `h` = helpers de l'app : { icon, logo, nutri }. */
function steps({ icon, logo, nutri }) {
  const row = (left, right = '', cls = '') => `<div class="tp-row ${cls}"><span class="grow">${left}</span>${right}</div>`;
  return [
    {
      title: 'Bienvenue !',
      text: 'L\'app compare les vrais prix de Colruyt, Delhaize et Aldi près de chez toi, et te dit où faire tes courses pour payer le moins possible.',
      art: `<div class="tp-hero">${['colruyt', 'delhaize', 'aldi', 'lidl', 'carrefour'].map((c) => logo(c, 'lg')).join('')}</div>
        <div class="tp-steps"><span>1. Ta liste</span>${icon('arrow')}<span>2. Le meilleur plan</span>${icon('arrow')}<span>3. Tu fais tes courses</span></div>`,
    },
    {
      title: '1. Ton adresse',
      text: 'Touche « Choisir mon adresse » en haut. L\'app trouve les supermarchés autour de chez toi. Ton adresse est enregistrée seulement sur ton téléphone (elle passe par OpenStreetMap pour trouver les magasins).',
      art: `<div class="tp-top"><b>Grocery Opti</b><span class="tp-pill">${icon('pin')} Choisir mon adresse${tap}</span></div>
        <div class="tp-map">${icon('pin')}<span class="m1">${logo('colruyt', 'sm')}</span><span class="m2">${logo('aldi', 'sm')}</span><span class="m3">${logo('delhaize', 'sm')}</span></div>`,
    },
    {
      title: '2. Ajouter des produits',
      text: 'Dans « Liste », tape un produit. En haut : le produit général, comparé partout. En dessous : les articles précis de chaque magasin, avec leur vrai prix.',
      art: `<div class="tp-search">${icon('search')}<span class="grow">lait${tap}</span>${icon('mic')}${icon('scan')}</div>
        <div class="tp-card"><div class="tp-head">Produit général</div>${row('Lait demi-écrémé (1 L)', `<span class="tp-plus">${icon('plus')}</span>`)}
        <div class="tp-head">Article précis</div>${row(`${logo('delhaize', 'sm')} Lait demi-écrémé 1 L`, '<b>1,15 €</b>')}${row(`${logo('aldi', 'sm')} Lait entier 1 l`, '<b>0,99 €</b>')}</div>`,
    },
    {
      title: '3. Dicter ou scanner',
      text: 'Le micro : dis « ajoute 2 litres de lait, des œufs et du pain », vérifie puis « Ajouter ». Le code-barres : mets les barres dans le cadre (zoom avec le curseur ou deux doigts) ; le cadre devient vert quand c\'est lu. Sinon : photo, ou taper le code.',
      art: `<div class="tp-search">${icon('search')}<span class="grow muted">Ajouter un produit…</span><span class="tp-hl">${icon('mic')}${tap}</span><span class="tp-hl">${icon('scan')}</span></div>
        <div class="tp-bubble">« Ajoute 2 litres de lait, des œufs et du pain »</div>
        <div class="tp-barcode"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>`,
    },
    {
      title: '4. Le panier malin',
      text: 'Donne ton budget et réponds à quelques questions (6 en simple, 21 en complet). L\'app compose le meilleur panier : premier prix, marque du magasin ou grande marque.',
      art: `<div class="tp-banner">${icon('spark')}<span class="grow"><b>Panier malin</b><br><small>Donne un budget</small></span>${tap}</div>
        <div class="tp-card">${row('Budget', '<b>60 €</b>')}
        <div class="tp-tiers"><span class="on">Premier prix</span><span>Marque Colruyt</span><span>Grande marque</span></div></div>`,
    },
    {
      title: '5. Des plats à cuisiner',
      text: 'Dans « Plats », coche ce que ta cuisine possède (four, micro-ondes, air fryer…). L\'app propose des recettes faisables, avec leur prix, et ajoute les ingrédients à ta liste.',
      art: `<div class="tp-chips"><span class="on">Four</span><span class="on">Micro-ondes</span><span>Air fryer</span><span class="on">Plaques</span></div>
        <div class="tp-card">${row(`${icon('chef')} Gratin de pâtes`, '<b>2,10 €/pers.</b>')}${row(`${icon('chef')} Curry de pois chiches`, '<b>1,45 €/pers.</b>')}
        <div class="tp-btn">Ajouter à ma liste${tap}</div></div>`,
    },
    {
      title: '6. Où acheter ?',
      text: 'Touche « Où acheter au meilleur prix ? ». L\'app calcule le meilleur plan : un ou deux magasins, ou un retrait Collect, en comptant aussi le trajet et ton temps.',
      art: `<div class="tp-btn big">${icon('route')} Où acheter au meilleur prix ?${tap}</div>
        <div class="tp-card">${row(`${logo('aldi', 'sm')} Aldi`, '<b>23,40 €</b>')}${row(`${logo('colruyt', 'sm')} Colruyt`, '<b>11,85 €</b>')}
        ${row('<b>Total</b>', '<b class="tp-good">35,25 €</b>', 'tp-total')}</div>`,
    },
    {
      title: '7. Commander ou y aller',
      text: 'Pour un retrait, touche « Ouvrir » à côté de chaque produit et ajoute-le au panier du site (tu paies sur le site). Collect&Go : colle une fois l\'adresse d\'un produit, l\'app fait ensuite les liens directs. En magasin, la liste suit l\'ordre des rayons.',
      art: `<div class="tp-card">${row(`${logo('delhaize', 'sm')} Lait demi-écrémé`, `<span class="tp-mini">Ouvrir${tap}</span>`)}${row(`${logo('delhaize', 'sm')} Spaghetti 500 g`, '<span class="tp-mini">Ouvrir</span>')}
        ${row(`<span class="tp-check">${icon('check')}</span> Bananes`, '', 'tp-done')}</div>`,
    },
    {
      title: '8. Ton budget',
      text: 'Dans « Budget » : tes dépenses du mois, ce que l\'app t\'a fait économiser et où part ton argent, rayon par rayon. Photographie ton ticket : l\'app lit les prix payés et ajuste ses estimations. Ta liste se partage avec un lien ou un code QR.',
      art: `<div class="tp-card"><div class="tp-head">Octobre</div><div class="tp-meter"><span style="width:62%"></span></div>${row('186 € sur 300 €', '<b class="tp-good">−24 € économisés</b>')}</div>
        <div class="tp-btn soft">${icon('scan')} Scanner un ticket de caisse${tap}</div>`,
    },
    {
      title: '9. Prix et santé',
      text: 'Le Nutri-Score (A = le plus sain, E = le moins) s\'affiche quand il est connu. « Santé d\'abord » met les produits A et B en tête. « approx. » = prix estimé, sinon c\'est un vrai prix.',
      art: `<div class="tp-card"><div class="tp-head"><span class="grow">Article précis</span><span class="tp-mini on">Santé d'abord${tap}</span></div>
        ${row(`${logo('delhaize', 'sm')} Yaourt nature${nutri('A', 'sm')}`, '<b>2,49 €</b>')}${row(`${logo('colruyt', 'sm')} Yaourt grec${nutri('C', 'sm')}`, '<b>2,49 €</b>')}
        ${row('Huile d\'olive · Lidl', '<span class="pill warn">approx.</span>')}</div>`,
    },
    {
      title: 'C\'est parti !',
      text: 'Les prix se mettent à jour chaque nuit. Dans Réglages, tu peux changer le rayon de recherche, les frais de retrait et la valeur de ton temps. Ce guide reste disponible ici.',
      art: `<div class="tp-hero big">${icon('cart')}</div>`,
    },
  ];
}

/** Ouvre le guide. */
export function openTuto(helpers) {
  const list = steps(helpers);
  let i = 0;
  const wrap = document.createElement('div');
  wrap.className = 'modal tuto';
  document.body.append(wrap);
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
  const go = (n) => { i = Math.max(0, Math.min(list.length - 1, n)); draw(); };
  function draw() {
    const s = list[i];
    wrap.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-label="Guide d'utilisation">
      <div class="row"><span class="eyebrow grow">Guide · ${i + 1}/${list.length}</span><button class="btn ghost small" data-t="close" aria-label="Fermer">${helpers.icon('x')}</button></div>
      <div class="tp-screen">${s.art}</div>
      <div><h2 class="tp-title">${s.title}</h2><p class="tp-text">${s.text}</p></div>
      <div class="tp-dots">${list.map((_, k) => `<button data-t="dot" data-k="${k}" aria-label="Étape ${k + 1}" aria-current="${k === i}"></button>`).join('')}</div>
      <div class="row"><button class="btn ghost" data-t="prev" ${i === 0 ? 'disabled' : ''}>Précédent</button><span class="grow"></span>
        <button class="btn primary" data-t="${i === list.length - 1 ? 'close' : 'next'}">${i === list.length - 1 ? 'Terminer' : 'Suivant'}</button></div>
    </div>`;
  }
  function onKey(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') go(i + 1);
    else if (e.key === 'ArrowLeft') go(i - 1);
  }
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap) return close();
    const b = e.target.closest('[data-t]');
    if (!b) return;
    e.stopPropagation();
    const t = b.dataset.t;
    if (t === 'close') close();
    else if (t === 'next') go(i + 1);
    else if (t === 'prev') go(i - 1);
    else if (t === 'dot') go(Number(b.dataset.k));
  });
  // Glisser du doigt vers la gauche / la droite.
  let x0 = null;
  wrap.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  wrap.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1));
  });
  document.addEventListener('keydown', onKey);
  draw();
}
