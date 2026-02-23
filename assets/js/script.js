// script.js — Version finale fusionnée pour Florie
// - FR, commentaires, emojis optionnels
// - Placement intelligent (B2) : essaie rotation 0° puis 90° pour faire tenir
// - Ajout direct en liste, live sync, popup (4 boutons), lapin (saute / court / pop + son)
// - Largeur input => largeur du tissu ; Hauteur input => hauteur du tissu
// - Ne recrée pas les formes quand on change la taille du tissu
// - Evite le dépassement (on colle au bord si demandé)
// - Compatible avec ton HTML et CSS fournis

/* ============================================================
   CONFIG / Variables globales
   ============================================================ */
let tissuDiv = null;
let shapes = []; // array of shape elements
let CM_TO_PX = window.innerWidth < 768 ? 2 : 4; // px per cm
let widthLocked = false;
let pendingCreateParams = null; // for popup when shape would exceed
let dimensionsPrecedentes = { largeur: null, hauteur: null };

// couleurs pastel
const couleursPastel = ["#D8B4FF", "#E6C2F0", "#F4D5FF", "#EAD7FF", "#EAF3FF", "#FDE2F0"];

// son pop (tu as placé le fichier dans assets/sound/bubble-pop.mp3)
const popAudio = new Audio("./assets/sound/bubble-pop.mp3");

// mode placement intelligent (B2) : active
const PLACEMENT_INTELLIGENT = true;

/* ============================================================
   UTILS
   ============================================================ */
function getNomTissuNettoye() {
    const nom = (document.getElementById("nom-tissu")?.value || "").trim() || "decoupe-tissu";
    return nom.replace(/[^a-z0-9_\-]/gi, "_");
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

/* ============================================================
   Mise à jour label TISSU (titre affiché au-dessus du cadre)
   ============================================================ */
function mettreAJourLabelTissu() {
    if (!tissuDiv) return;
    const nom = document.getElementById("nom-tissu")?.value || "";
    const wCm = (parseFloat(document.getElementById("largeur")?.value) || 0).toFixed(2);
    const hCm = (parseFloat(document.getElementById("hauteur")?.value) || 0).toFixed(2);

    let label = document.getElementById("tissu-label");
    if (!label) {
        label = document.createElement("div");
        label.id = "tissu-label";
        label.style.position = "relative";
        label.style.marginBottom = "8px";
        label.style.fontFamily = "'Delius Swash Caps', cursive";
        label.style.color = "#5b2a86";
        label.style.fontSize = "18px";
        // insère avant le wrapper si possible
        const wrapper = document.getElementById("tissu-wrapper") || tissuDiv.parentElement;
        if (wrapper) wrapper.parentElement && wrapper.parentElement.insertBefore(label, wrapper);
    }
    label.textContent = `${nom} — ${wCm} × ${hCm} cm`;
}

/* ============================================================
   CREATE / UPDATE TISSU
   - mapping normal: largeur input => largeur div ; hauteur input => hauteur div
   - ne recrée pas les formes, ajuste seulement le conteneur
   ============================================================ */
function createTissu() {
    const nom = document.getElementById("nom-tissu")?.value || "";
    const widthCm = parseFloat(document.getElementById("largeur")?.value);
    const heightCm = parseFloat(document.getElementById("hauteur")?.value);

    if (!nom.trim()) {
        alert("🧵 Veuillez entrer un nom pour le tissu.");
        return;
    }
    if (isNaN(widthCm) || isNaN(heightCm) || widthCm <= 0 || heightCm <= 0) {
        alert("📏 Veuillez entrer des dimensions valides (cm).");
        return;
    }

    if (!tissuDiv) {
        tissuDiv = document.getElementById("tissu");
        if (!tissuDiv) {
            alert("Erreur : div #tissu introuvable");
            return;
        }
        if (getComputedStyle(tissuDiv).position === "static") tissuDiv.style.position = "relative";
    }

    const wPx = Math.round(widthCm * CM_TO_PX);
    const hPx = Math.round(heightCm * CM_TO_PX);

    // applique sans recréer
    tissuDiv.style.width = (wPx > 0 ? wPx : 1) + "px";
    tissuDiv.style.height = (hPx > 0 ? hPx : 1) + "px";
    tissuDiv.style.overflow = "hidden";

    dimensionsPrecedentes = { largeur: widthCm, hauteur: heightCm };

    mettreAJourLabelTissu();
    updateAllChecks();
}

/* ============================================================
   POPUP (obligatoire) — Montrer / cacher
   ============================================================ */
function showTissuPopup() {
    const popup = document.getElementById("tissu-popup");
    if (!popup) return;
    // disable largeur si verrou
    const btnW = document.getElementById("popup-width");
    if (btnW) btnW.disabled = !!widthLocked;
    popup.classList.remove("hidden");
    popup.classList.add("show");
    popup.style.display = "block";
}

function hideTissuPopup() {
    const popup = document.getElementById("tissu-popup");
    if (!popup) return;
    popup.classList.remove("show");
    popup.classList.add("hidden");
    popup.style.display = "none";
}

/* ============================================================
   AGRANDIR TISSU après popup
   - direction: "width" | "height" | "both"
   ============================================================ */
function agrandirTissu(direction) {
    if (!tissuDiv) return;
    const tRect = tissuDiv.getBoundingClientRect();
    let changed = false;

    if ((direction === "width" || direction === "both") && !widthLocked) {
        // calculer besoin maxRight basé sur formes
        let maxRight = tissuDiv.offsetWidth;
        shapes.forEach((s) => {
            if (!document.body.contains(s)) return;
            const r = s.getBoundingClientRect();
            const relRight = Math.ceil(r.right - tRect.left);
            if (relRight > maxRight) maxRight = relRight;
        });
        if (maxRight > tissuDiv.offsetWidth) {
            tissuDiv.style.width = maxRight + 10 + "px";
            document.getElementById("largeur").value = (tissuDiv.offsetWidth / CM_TO_PX).toFixed(2);
            changed = true;
        }
    }

    if (direction === "height" || direction === "both") {
        let maxBottom = tissuDiv.offsetHeight;
        shapes.forEach((s) => {
            if (!document.body.contains(s)) return;
            const r = s.getBoundingClientRect();
            const relBottom = Math.ceil(r.bottom - tRect.top);
            if (relBottom > maxBottom) maxBottom = relBottom;
        });
        if (maxBottom > tissuDiv.offsetHeight) {
            tissuDiv.style.height = maxBottom + 10 + "px";
            document.getElementById("hauteur").value = (tissuDiv.offsetHeight / CM_TO_PX).toFixed(
                2,
            );
            changed = true;
        }
    }

    if (changed) {
        mettreAJourLabelTissu();
        calculerTissuPerdu();
    }
}

/* popup button handlers */
document.getElementById("popup-width")?.addEventListener("click", () => {
    hideTissuPopup();
    agrandirTissu("width");
    if (pendingCreateParams) {
        const p = pendingCreateParams;
        _createShapeWithPlacement(p);
        pendingCreateParams = null;
    }
});

document.getElementById("popup-height")?.addEventListener("click", () => {
    hideTissuPopup();
    agrandirTissu("height");
    if (pendingCreateParams) {
        const p = pendingCreateParams;
        _createShapeWithPlacement(p);
        pendingCreateParams = null;
    }
});
document.getElementById("popup-both")?.addEventListener("click", () => {
    hideTissuPopup();
    agrandirTissu("both");
    if (pendingCreateParams) {
        const p = pendingCreateParams;
        _createShapeWithPlacement(p);
        pendingCreateParams = null;
    }
});
document.getElementById("popup-cancel")?.addEventListener("click", () => {
    pendingCreateParams = null;
    hideTissuPopup();
});

/* ============================================================
   Ajout forme : vérifie dépassement, sinon crée avec placement intelligent
   ============================================================ */
function ajouterForme() {
    if (!tissuDiv || !tissuDiv.style.width || !tissuDiv.style.height) {
        alert("⚠️ Créez d'abord le tissu.");
        return;
    }

    const forme = document.getElementById("forme")?.value || "rectangle";
    let lCm = parseFloat(document.getElementById("formLargeur")?.value) || 0;
    let hCm = parseFloat(document.getElementById("formHauteur")?.value) || 0;
    const nom = document.getElementById("formNom")?.value || forme;

    if (forme === "carre" || forme === "cercle") hCm = lCm;
    if (lCm <= 0 || hCm <= 0) {
        alert("Dimensions invalides.");
        return;
    }

    // Convert to px
    const wPx = Math.max(6, Math.round(lCm * CM_TO_PX));
    const hPx = Math.max(6, Math.round(hCm * CM_TO_PX));

    // If shape larger than tissu -> popup
    if (wPx > tissuDiv.offsetWidth || hPx > tissuDiv.offsetHeight) {
        pendingCreateParams = { forme, wPx, hPx, nom, lCm, hCm };
        showTissuPopup();
        return;
    }

    // create with placement attempt
    _createShapeWithPlacement({ forme, wPx, hPx, nom, lCm, hCm });
}

/* ============================================================
   Placement intelligent B2 (algorithm):
   - Scanne la zone du tissu par lignes (y), colonnes (x) en step = 4px
   - Pour chaque emplacement, vérifie collision avec bounding boxes existantes (rotations 0° puis 90°)
   - Si trouve, place la forme à cet emplacement, sinon place en (0,0) en dernier recours
   - Assure qu'elle colle au bord si possible (left 0 ou top 0) et qu'elle ne dépasse pas
   ============================================================ */
function _createShapeWithPlacement(params) {
    const { forme, wPx, hPx, nom } = params;
    // try rotations array (degrees)
    const rotationsToTry = [0, 90]; // B2: try 0 then 90 deg to fit
    let placed = false;
    let placedInfo = null;

    // precompute existing bounding boxes (relative to tissu)
    const existing = shapes
        .filter((s) => document.body.contains(s))
        .map((s) => {
            const rect = s.getBoundingClientRect();
            const tRect = tissuDiv.getBoundingClientRect();
            return {
                left: Math.round(rect.left - tRect.left),
                top: Math.round(rect.top - tRect.top),
                right: Math.round(rect.right - tRect.left),
                bottom: Math.round(rect.bottom - tRect.top),
            };
        });

    // search grid
    const step = Math.max(4, Math.round(Math.min(wPx, hPx) / 6)); // reasonable step
    const W = tissuDiv.clientWidth;
    const H = tissuDiv.clientHeight;

    outer: for (let rot of rotationsToTry) {
        const wTry = rot % 180 === 0 ? wPx : hPx;
        const hTry = rot % 180 === 0 ? hPx : wPx;

        for (let y = 0; y <= H - hTry; y += step) {
            for (let x = 0; x <= W - wTry; x += step) {
                // check collision with any existing
                let collision = false;
                for (let ex of existing) {
                    if (
                        !(
                            x + wTry <= ex.left ||
                            x >= ex.right ||
                            y + hTry <= ex.top ||
                            y >= ex.bottom
                        )
                    ) {
                        collision = true;
                        break;
                    }
                }
                if (!collision) {
                    placed = true;
                    placedInfo = { left: x, top: y, width: wTry, height: hTry, rotation: rot };
                    break outer;
                }
            }
        }
    }

    // if nothing found, place at (0, currentHeightUsed) to stack vertically without overlap
    if (!placed) {
        let yOffset = 4;
        for (let s of shapes) {
            if (!document.body.contains(s)) continue;
            yOffset = Math.max(yOffset, s.offsetTop + s.offsetHeight + 6);
        }
        // clamp to not exceed
        const left = 4;
        const top = clamp(yOffset, 4, Math.max(4, tissuDiv.clientHeight - hPx));
        placedInfo = { left, top, width: wPx, height: hPx, rotation: 0 };
        placed = true;
    }

    // create element
    const color = couleursPastel[Math.floor(Math.random() * couleursPastel.length)];
    const el = document.createElement("div");
    el.className = "shape";
    el.dataset.type = forme;
    el.dataset.name = nom || forme;
    el.dataset.wcm = (placedInfo.width / CM_TO_PX).toFixed(2);
    el.dataset.hcm = (placedInfo.height / CM_TO_PX).toFixed(2);
    el.dataset.rotation = (placedInfo.rotation || 0).toString();

    // style
    if (forme === "triangle") {
        // keep wrapper and triangle child
        el.style.width = placedInfo.width + "px";
        el.style.height = placedInfo.height + "px";
        el.style.background = "transparent";
        const tri = document.createElement("div");
        tri.className = "triangle-shape";
        tri.style.width = "0";
        tri.style.height = "0";
        tri.style.borderLeft = placedInfo.width / 2 + "px solid transparent";
        tri.style.borderRight = placedInfo.width / 2 + "px solid transparent";
        tri.style.borderBottom = placedInfo.height + "px solid " + color;
        el.appendChild(tri);
    } else {
        el.style.width = placedInfo.width + "px";
        el.style.height = placedInfo.height + "px";
        el.style.background = color;
        if (forme === "cercle") el.style.borderRadius = "50%";
    }

    // position
    el.style.position = "absolute";
    el.style.left = placedInfo.left + "px";
    el.style.top = placedInfo.top + "px";
    el.style.zIndex = 800;
    el.style.transform = `rotate(${placedInfo.rotation}deg)`;

    // append and setup interactions
    addResizeHandles(el);
    addRotateHandle(el);
    tissuDiv.appendChild(el);
    shapes.push(el);

    makeDraggable(el);
    ajouterClavier(el);
    mettreAJourLabelForme(el);
    ajouterALaListeLive(el); // immediate add to list
    verifierDepassement(el);
    calculerTissuPerdu();

    // dispatch event pour lapin
    dispatchFormeAjoutee();
}

/* ============================================================
   LISTE — ajout LIVE (nom / dims / rotation / duplicate / delete)
   - s'assure que l'élément est ajouté immédiatement à la liste
   ============================================================ */
function ajouterALaListeLive(el) {
    const ul = document.getElementById("liste-formes");
    if (!ul) return;

    // create li
    const li = document.createElement("li");
    li.className = "liste-item";

    // name input
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = el.dataset.name || "";
    nameInput.className = "li-name";
    nameInput.style.width = "120px";
    nameInput.addEventListener("input", () => {
        el.dataset.name = nameInput.value;
        mettreAJourLabelForme(el);
    });

    // width input (cm)
    const wInput = document.createElement("input");
    wInput.type = "number";
    wInput.step = "0.1";
    wInput.value = el.dataset.wcm || (el.offsetWidth / CM_TO_PX).toFixed(2);
    wInput.className = "li-dim";
    wInput.style.width = "70px";
    wInput.addEventListener("input", () => {
        const newWcm = parseFloat(wInput.value) || 0.1;
        const newWpx = Math.max(6, Math.round(newWcm * CM_TO_PX));
        el.style.width = newWpx + "px";
        el.dataset.wcm = newWcm.toFixed(2);
        if (el.dataset.type === "triangle") {
            const tri = el.querySelector(".triangle-shape");
            if (tri) {
                tri.style.borderLeft = el.offsetWidth / 2 + "px solid transparent";
                tri.style.borderRight = el.offsetWidth / 2 + "px solid transparent";
                tri.style.borderBottom =
                    el.offsetHeight + "px solid " + (el.style.background || "#666");
            }
        }
        mettreAJourLabelForme(el);
        verifierDepassement(el);
        calculerTissuPerdu();
    });

    // height input (cm)
    const hInput = document.createElement("input");
    hInput.type = "number";
    hInput.step = "0.1";
    hInput.value = el.dataset.hcm || (el.offsetHeight / CM_TO_PX).toFixed(2);
    hInput.className = "li-dim";
    hInput.style.width = "70px";
    hInput.addEventListener("input", () => {
        const newHcm = parseFloat(hInput.value) || 0.1;
        const newHpx = Math.max(6, Math.round(newHcm * CM_TO_PX));
        el.style.height = newHpx + "px";
        el.dataset.hcm = newHcm.toFixed(2);
        if (el.dataset.type === "triangle") {
            const tri = el.querySelector(".triangle-shape");
            if (tri) {
                tri.style.borderLeft = el.offsetWidth / 2 + "px solid transparent";
                tri.style.borderRight = el.offsetWidth / 2 + "px solid transparent";
                tri.style.borderBottom =
                    el.offsetHeight + "px solid " + (el.style.background || "#666");
            }
        }
        mettreAJourLabelForme(el);
        verifierDepassement(el);
        calculerTissuPerdu();
    });

    // rotation input
    const rotInput = document.createElement("input");
    rotInput.type = "number";
    rotInput.step = "1";
    rotInput.value = el.dataset.rotation || 0;
    rotInput.className = "li-rot";
    rotInput.style.width = "60px";
    rotInput.addEventListener("input", () => {
        const a = parseFloat(rotInput.value) || 0;
        el.dataset.rotation = a;
        el.style.transform = `rotate(${a}deg)`;
        const lbl = el.querySelector(".shape-label");
        if (lbl) lbl.style.transform = `rotate(${-a}deg)`;
        verifierDepassement(el);
        calculerTissuPerdu();
    });

    // duplicate
    const btnDup = document.createElement("button");
    btnDup.textContent = "📄";
    btnDup.title = "Dupliquer";
    btnDup.addEventListener("click", () => duplicateShape(el));

    // delete (pop kawaii + son)
    const btnDel = document.createElement("button");
    btnDel.textContent = "❌";
    btnDel.title = "Supprimer";
    btnDel.addEventListener("click", () => {
        popKawaiiAt(el);
        try {
            popAudio.currentTime = 0;
            popAudio.play();
        } catch (e) {
            /* ignore autoplay errors */
        }
        // remove DOM + list + shapes array
        el.remove();
        li.remove();
        shapes = shapes.filter((s) => s !== el);
        calculerTissuPerdu();
    });

    // click select highlight
    li.addEventListener("click", () => {
        // remove selected from others
        const all = ul.querySelectorAll("li");
        all.forEach((i) => i.classList.remove("selected"));
        li.classList.add("selected");
        // focus element and highlight
        el.focus && el.focus();
        // add outline on element for clarity
        el.classList.add("selected-shape");
        setTimeout(() => el.classList.remove("selected-shape"), 1400);
    });

    // assemble
    li.appendChild(nameInput);
    li.appendChild(wInput);
    li.appendChild(hInput);
    li.appendChild(rotInput);
    li.appendChild(btnDup);
    li.appendChild(btnDel);

    ul.appendChild(li);
    el._listItem = li;
}

/* helper to rebuild list (used by updateAllChecks) */
function updateListeFormes() {
    const ul = document.getElementById("liste-formes");
    if (!ul) return;
    ul.innerHTML = "";
    shapes.forEach((el) => {
        if (document.body.contains(el)) ajouterALaListeLive(el);
    });
}

/* ============================================================
   Drag & keyboard interactions (separate responsibilities)
   - makeDraggable : souris (drag)
   - ajouterClavier : déplacement clavier quand élément focusable
   ============================================================ */
function makeDraggable(el) {
    let offsetX = 0,
        offsetY = 0;

    function onMouseDown(e) {
        // ignore if clicked on handle or rotate handle
        if (
            e.target.classList.contains("resize-handle") ||
            e.target.classList.contains("rotate-handle")
        )
            return;
        const rect = el.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        selectedElement = el;
        el.focus();

        function onMouseMove(ev) {
            const tRect = tissuDiv.getBoundingClientRect();
            let left = ev.clientX - tRect.left - offsetX;
            let top = ev.clientY - tRect.top - offsetY;

            left = Math.max(0, left);
            top = Math.max(0, top);

            el.style.left = left + "px";
            el.style.top = top + "px";

            verifierDepassement(el);
            mettreAJourLabelForme(el);
            syncListItemWithShape(el);
            calculerTissuPerdu();
        }
        function onMouseUp() {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        }
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }

    el.addEventListener("mousedown", onMouseDown);

    // make focusable for keyboard controls
    el.tabIndex = 0;
    el.addEventListener("click", () => {
        selectedElement = el;
    });
}

/* keyboard mover for focused element */
/* ============================================================
   ⌨️ DÉPLACEMENT AU CLAVIER
   - Flèches : universel
   - ZQSD : claviers FR / droitiers
   - OKLM : claviers pour gauchers
   - Shift = déplacement plus rapide
   ============================================================ */
function ajouterClavier(el) {
    el.addEventListener("keydown", (e) => {
        // Pas d’élément sélectionné ? On sort
        if (!el) return;

        // Déplacement de base (px)
        const step = e.shiftKey ? 10 : 2;

        let top = parseInt(el.style.top) || 0;
        let left = parseInt(el.style.left) || 0;

        switch (e.key.toLowerCase()) {
            // 🔼 Flèches classiques
            case "arrowup":
                el.style.top = top - step + "px";
                break;
            case "arrowdown":
                el.style.top = top + step + "px";
                break;
            case "arrowleft":
                el.style.left = left - step + "px";
                break;
            case "arrowright":
                el.style.left = left + step + "px";
                break;

            // 🇫🇷 ZQSD (clavier français)
            case "z":
                el.style.top = top - step + "px";
                break;
            case "s":
                el.style.top = top + step + "px";
                break;
            case "q":
                el.style.left = left - step + "px";
                break;
            case "d":
                el.style.left = left + step + "px";
                break;

            // ✋ OKLM (gaucher)
            case "o":
                el.style.top = top - step + "px";
                break;
            case "l":
                el.style.top = top + step + "px";
                break;
            case "k":
                el.style.left = left - step + "px";
                break;
            case "m":
                el.style.left = left + step + "px";
                break;

            // 🔄 Rotation clavier (rapide)
            case "a":
                rotateElement(el, -5);
                break;
            case "e":
                rotateElement(el, 5);
                break;

            default:
                return;
        }

        // Après CHAQUE action clavier :
        verifierDepassement(el);
        mettreAJourLabelForme(el);
        syncListItemWithShape(el);
        calculerTissuPerdu();
    });
}
/* ============================================================
   📱 DÉPLACEMENT MOBILE PAR FLÈCHES
   - Complément du drag au doigt
   - Plus précis (5px)
   ============================================================ */
function moveSelectedMobile(dx, dy) {
    if (!selectedElement) return;

    const left = parseInt(selectedElement.style.left) || 0;
    const top = parseInt(selectedElement.style.top) || 0;

    selectedElement.style.left = left + dx + "px";
    selectedElement.style.top = top + dy + "px";
    verifierDepassement(selectedElement);
    mettreAJourLabelForme(selectedElement);
    syncListItemWithShape(selectedElement);
    calculerTissuPerdu();
}

// Bind boutons
document.getElementById("mob-up")?.addEventListener("click", () => moveSelectedMobile(0, -5));
document.getElementById("mob-down")?.addEventListener("click", () => moveSelectedMobile(0, 5));
document.getElementById("mob-left")?.addEventListener("click", () => moveSelectedMobile(-5, 0));
document.getElementById("mob-right")?.addEventListener("click", () => moveSelectedMobile(5, 0));

/* sync list values with shape (width/height) */
function syncListItemWithShape(el) {
    const li = el._listItem;
    if (!li) return;
    const inputs = li.querySelectorAll("input");
    if (inputs.length >= 3) {
        inputs[1].value = (el.offsetWidth / CM_TO_PX).toFixed(2);
        inputs[2].value = (el.offsetHeight / CM_TO_PX).toFixed(2);
    }
}

/* duplicate shape */
function duplicateShape(el) {
    if (!tissuDiv) return;
    const clone = el.cloneNode(true);
    // remove possible internal list reference
    clone._listItem = null;
    // strip handles to re-add clean ones
    clone.querySelectorAll(".resize-handle, .rotate-handle").forEach((n) => n.remove());
    clone.style.left = (parseInt(el.style.left) || 0) + 10 + "px";
    clone.style.top = (parseInt(el.style.top) || 0) + 10 + "px";
    tissuDiv.appendChild(clone);
    shapes.push(clone);
    addResizeHandles(clone);
    addRotateHandle(clone);
    makeDraggable(clone);
    ajouterClavier(clone);
    mettreAJourLabelForme(clone);
    ajouterALaListeLive(clone);
    dispatchFormeAjoutee();
    calculerTissuPerdu();
}

/* ============================================================
   Resize handles & rotate handle
   ============================================================ */
function addRotateHandle(el) {
    const rh = document.createElement("div");
    rh.className = "rotate-handle";
    rh.textContent = "⤿";
    el.appendChild(rh);

    let rotating = false;
    function onMouseDown(e) {
        e.stopPropagation();
        rotating = true;
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        function onMouseMove(ev) {
            if (!rotating) return;
            const angle = (Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * 180) / Math.PI;
            el.dataset.rotation = Math.round(angle);
            el.style.transform = `rotate(${angle}deg)`;
            const lbl = el.querySelector(".shape-label");
            if (lbl) lbl.style.transform = `rotate(${-angle}deg)`;
            verifierDepassement(el);
            mettreAJourLabelForme(el);
            syncListItemWithShape(el);
            calculerTissuPerdu();
        }
        function onMouseUp() {
            rotating = false;
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        }
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }
    rh.addEventListener("mousedown", onMouseDown);
}

function addResizeHandles(el) {
    const pos = ["tl", "tr", "bl", "br"];
    pos.forEach((p) => {
        const handle = document.createElement("div");
        handle.className = `resize-handle handle-${p}`;
        handle.dataset.pos = p;
        el.appendChild(handle);

        let resizing = false;
        let startX = 0,
            startY = 0,
            startW = 0,
            startH = 0,
            startLeft = 0,
            startTop = 0;

        function onMouseDown(e) {
            e.stopPropagation();
            resizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startW = el.offsetWidth;
            startH = el.offsetHeight;
            startLeft = parseInt(el.style.left) || 0;
            startTop = parseInt(el.style.top) || 0;

            function onMouseMove(ev) {
                if (!resizing) return;
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                const pp = handle.dataset.pos;
                let newW = startW,
                    newH = startH,
                    newLeft = startLeft,
                    newTop = startTop;

                if (pp === "br") {
                    newW = Math.max(6, startW + dx);
                    newH = Math.max(6, startH + dy);
                } else if (pp === "bl") {
                    newW = Math.max(6, startW - dx);
                    newH = Math.max(6, startH + dy);
                    newLeft = startLeft + dx;
                } else if (pp === "tr") {
                    newW = Math.max(6, startW + dx);
                    newH = Math.max(6, startH - dy);
                    newTop = startTop + dy;
                } else if (pp === "tl") {
                    newW = Math.max(6, startW - dx);
                    newH = Math.max(6, startH - dy);
                    newLeft = startLeft + dx;
                    newTop = startTop + dy;
                }

                el.style.width = newW + "px";
                el.style.height = newH + "px";
                el.style.left = newLeft + "px";
                el.style.top = newTop + "px";

                if (el.dataset.type === "triangle") {
                    const tri = el.querySelector(".triangle-shape");
                    if (tri) {
                        tri.style.borderLeft = newW / 2 + "px solid transparent";
                        tri.style.borderRight = newW / 2 + "px solid transparent";
                        tri.style.borderBottom =
                            newH + "px solid " + (el.style.background || "#666");
                    }
                }

                el.dataset.wcm = (el.offsetWidth / CM_TO_PX).toFixed(2);
                el.dataset.hcm = (el.offsetHeight / CM_TO_PX).toFixed(2);
                mettreAJourLabelForme(el);
                verifierDepassement(el);
                syncListItemWithShape(el);
                calculerTissuPerdu();
            }

            function onMouseUp() {
                resizing = false;
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
            }
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        }

        handle.addEventListener("mousedown", onMouseDown);
    });
}

/* ============================================================
   VERIFIER DEPASSEMENT
   - ajoute / enlève classe .outside
   ============================================================ */
function verifierDepassement(el) {
    if (!tissuDiv) return;
    const r = el.getBoundingClientRect();
    const p = tissuDiv.getBoundingClientRect();
    if (r.left < p.left || r.top < p.top || r.right > p.right || r.bottom > p.bottom)
        el.classList.add("outside");
    else el.classList.remove("outside");
}

/* ============================================================
   Calculer Tissu Inutilisé (approx par grille) — affiche lost-rects
   ============================================================ */
function calculerTissuPerdu() {
    if (!tissuDiv) return;
    const pertesUl = document.getElementById("liste-pertes");
    if (pertesUl) pertesUl.innerHTML = "";
    // remove previous lost rects
    tissuDiv.querySelectorAll(".lost-rect").forEach((n) => n.remove());

    if (shapes.length === 0) {
        document.getElementById("tissu-perdu").textContent = "Tissu inutilisé : -";
        return;
    }

    const cellSize = 12;
    const W = tissuDiv.clientWidth;
    const H = tissuDiv.clientHeight;
    const cols = Math.floor(W / cellSize);
    const rows = Math.floor(H / cellSize);
    const grid = Array.from({ length: rows }, () => new Uint8Array(cols));

    shapes.forEach((el) => {
        if (!document.body.contains(el)) return;
        const r = el.getBoundingClientRect();
        const t = tissuDiv.getBoundingClientRect();
        const left = Math.max(0, Math.floor((r.left - t.left) / cellSize));
        const top = Math.max(0, Math.floor((r.top - t.top) / cellSize));
        const right = Math.min(cols, Math.ceil((r.right - t.left) / cellSize));
        const bottom = Math.min(rows, Math.ceil((r.bottom - t.top) / cellSize));
        for (let y = top; y < bottom; y++) {
            for (let x = left; x < right; x++) {
                grid[y][x] = 1;
            }
        }
    });

    const visited = Array.from({ length: rows }, () => new Uint8Array(cols));
    const lostRects = [];

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (grid[y][x] === 0 && !visited[y][x]) {
                let maxW = 0;
                while (x + maxW < cols && grid[y][x + maxW] === 0 && !visited[y][x + maxW]) maxW++;
                let height = 1;
                while (y + height < rows) {
                    let ok = true;
                    for (let k = 0; k < maxW; k++) {
                        if (grid[y + height][x + k] === 1 || visited[y + height][x + k]) {
                            ok = false;
                            break;
                        }
                    }
                    if (!ok) break;
                    height++;
                }
                for (let yy = y; yy < y + height; yy++) {
                    for (let xx = x; xx < x + maxW; xx++) visited[yy][xx] = 1;
                }
                lostRects.push({
                    left: x * cellSize,
                    top: y * cellSize,
                    width: maxW * cellSize,
                    height: height * cellSize,
                });
            }
        }
    }

    // create lost-rect DOM and list
    lostRects.forEach((r, idx) => {
        if (r.width < 12 || r.height < 12) return;
        const div = document.createElement("div");
        div.className = "lost-rect";
        div.style.position = "absolute";
        div.style.left = r.left + "px";
        div.style.top = r.top + "px";
        div.style.width = r.width + "px";
        div.style.height = r.height + "px";
        const color = couleursPastel[idx % couleursPastel.length];
        div.style.background = color;
        div.style.opacity = "0.45";
        div.style.border = "1px dashed rgba(75,45,101,0.18)";
        div.style.borderRadius = "8px";
        div.style.zIndex = 300;

        const wCm = (r.width / CM_TO_PX).toFixed(2);
        const hCm = (r.height / CM_TO_PX).toFixed(2);
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.justifyContent = "center";
        div.style.fontSize = "12px";
        div.style.fontFamily = "'Delius Swash Caps', cursive";
        div.style.color = "#4b2d65";
        div.style.textShadow = "0 0 4px rgba(255,255,255,0.8)";
        div.textContent = `Inutilisé — ${wCm} × ${hCm} cm`;

        tissuDiv.appendChild(div);

        // list
        if (pertesUl) {
            const li = document.createElement("li");
            li.innerHTML = `<strong>Inutilisé ${idx + 1}</strong> — ${wCm} × ${hCm} cm`;
            li.style.background = color;
            li.style.borderRadius = "6px";
            li.style.padding = "6px";
            li.style.cursor = "pointer";
            li.addEventListener("click", () => {
                try {
                    tissuDiv.scrollTo({
                        left: Math.max(0, r.left - 20),
                        top: Math.max(0, r.top - 20),
                        behavior: "smooth",
                    });
                } catch (e) {}
            });
            pertesUl.appendChild(li);
        }
    });

    document.getElementById("tissu-perdu").textContent =
        `Morceaux inutilisés : ${lostRects.filter((r) => r.width >= 12 && r.height >= 12).length}`;
}

/* ============================================================
   EXPORT IMAGE & JSON
   - exporterImage: si any shape outside -> popup obligatoire
   ============================================================ */
function exporterImage() {
    if (!tissuDiv) {
        alert("Créez le tissu d'abord.");
        return;
    }
    const anyOutside = shapes.some((s) => s.classList.contains("outside"));
    if (anyOutside) {
        showTissuPopup();
        return;
    }
    shapes.forEach((s) => mettreAJourLabelForme(s));
    mettreAJourLabelTissu();

    html2canvas(document.getElementById("tissu-wrapper"), { backgroundColor: null })
        .then((canvas) => {
            const link = document.createElement("a");
            link.download = `${getNomTissuNettoye()}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        })
        .catch((err) => {
            console.error(err);
            alert("Erreur export image.");
        });
}

function exporterJSON() {
    if (!tissuDiv) {
        alert("Créez le tissu d'abord.");
        return;
    }
    const metadata = {
        nom: document.getElementById("nom-tissu")?.value || "",
        largeur_cm: parseFloat(document.getElementById("largeur")?.value) || 0,
        hauteur_cm: parseFloat(document.getElementById("hauteur")?.value) || 0,
        CM_TO_PX,
    };
    const formes = shapes
        .filter((s) => document.body.contains(s))
        .map((el) => {
            const rect = el.getBoundingClientRect();
            const tRect = tissuDiv.getBoundingClientRect();
            return {
                name: el.dataset.name || "",
                type: el.dataset.type || "",
                left: (parseInt(el.style.left) || Math.round(rect.left - tRect.left)) + "px",
                top: (parseInt(el.style.top) || Math.round(rect.top - tRect.top)) + "px",
                width: el.offsetWidth + "px",
                height: el.offsetHeight + "px",
                rotation: el.dataset.rotation || "0",
                background: el.style.background || "",
                wcm: el.dataset.wcm || (el.offsetWidth / CM_TO_PX).toFixed(2),
                hcm: el.dataset.hcm || (el.offsetHeight / CM_TO_PX).toFixed(2),
            };
        });
    const data = { metadata, formes };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${getNomTissuNettoye()}.json`;
    link.click();
}

/* ============================================================
   reset / helpers
   ============================================================ */
function reinitialiserTissu() {
    if (!tissuDiv) tissuDiv = document.getElementById("tissu");
    shapes.forEach((s) => s.remove());
    shapes = [];
    const ul = document.getElementById("liste-formes");
    if (ul) ul.innerHTML = "";
    const perteUl = document.getElementById("liste-pertes");
    if (perteUl) perteUl.innerHTML = "";
    const label = document.getElementById("tissu-label");
    if (label) label.remove();
    document.getElementById("nom-tissu").value = "";
    document.getElementById("largeur").value = "";
    document.getElementById("hauteur").value = "";
    if (tissuDiv) {
        tissuDiv.style.width = "";
        tissuDiv.style.height = "";
    }
    calculerTissuPerdu();
}

/* ============================================================
   Rotations simple
   ============================================================ */
function rotateElement(el, angle) {
    const current = parseInt(el.dataset.rotation || "0");
    const newAngle = current + angle;
    el.dataset.rotation = newAngle;
    el.style.transform = `rotate(${newAngle}deg)`;
    const lbl = el.querySelector(".shape-label");
    if (lbl) lbl.style.transform = `rotate(${-newAngle}deg)`;
}

/* ============================================================
   updateAllChecks
   ============================================================ */
function updateAllChecks() {
    shapes.forEach((s) => {
        verifierDepassement(s);
        mettreAJourLabelForme(s);
    });
    calculerTissuPerdu();
    updateListeFormes();
}

/* ============================================================
   🐰 LAPIN KAWAII — animations & comportement
   - lapinSauteFromTissu(): saute depuis coin sup gauche du tissu
   - lapinCourt(): traverse l'écran
   - popKawaiiAt(el): pop textuel + son (appelé à la suppression)
   - dispatchFormeAjoutee(): event pour déclencher lapin
   ============================================================ */
function dispatchFormeAjoutee() {
    document.dispatchEvent(new Event("forme-ajoutee"));
}

function lapinSauteFromTissu() {
    if (!tissuDiv) return;
    const tRect = tissuDiv.getBoundingClientRect();
    const lapin = document.createElement("div");
    lapin.className = "lapin-sauteur";
    // TODO: pour une image, remplace le textContent par <img src="chemin"> et mets le fichier dans assets/img/
    lapin.textContent = "🐰";
    lapin.style.position = "fixed";
    lapin.style.left = Math.max(8, tRect.left + 8) + "px";
    lapin.style.top = Math.max(8, tRect.top + 8) + "px";
    lapin.style.zIndex = 9999;
    lapin.style.fontSize = "36px";
    lapin.style.pointerEvents = "none";
    document.body.appendChild(lapin);

    lapin.animate(
        [
            { transform: "translateY(0) scale(1)" },
            { transform: "translateY(-60px) scale(1.25)" },
            { transform: "translateY(0) scale(1)" },
        ],
        { duration: 700, easing: "cubic-bezier(.2,.8,.2,1)" },
    );

    setTimeout(() => lapin.remove(), 900);
}

function lapinCourt() {
    const lapin = document.createElement("div");
    lapin.className = "lapin-coureur";
    lapin.textContent = "🐰";
    lapin.style.position = "fixed";
    lapin.style.left = "-80px";
    lapin.style.bottom = "14px";
    lapin.style.zIndex = 9999;
    lapin.style.fontSize = "32px";
    lapin.style.pointerEvents = "none";
    document.body.appendChild(lapin);

    const duration = 2200;
    lapin.animate(
        [
            { transform: "translateX(0) scale(1)" },
            { transform: "translateX(calc(100vw + 200px)) scale(1.05)" },
        ],
        { duration, easing: "linear" },
    );

    setTimeout(() => lapin.remove(), duration + 200);
}

function popKawaiiAt(el) {
    const r = el.getBoundingClientRect();
    const pop = document.createElement("div");
    pop.className = "pop-kawaii";
    pop.textContent = "POP! ✨";
    pop.style.position = "fixed";
    pop.style.left = r.left + r.width / 2 - 40 + "px";
    pop.style.top = r.top + r.height / 2 - 20 + "px";
    pop.style.zIndex = 10000;
    pop.style.padding = "6px 10px";
    pop.style.background = "rgba(255,255,255,0.95)";
    pop.style.border = "2px solid rgba(170,120,255,0.9)";
    pop.style.borderRadius = "10px";
    pop.style.fontFamily = "'Delius Swash Caps', cursive";
    pop.style.color = "#5b2a86";
    pop.style.boxShadow = "0 6px 18px rgba(90, 0, 140, 0.18)";
    document.body.appendChild(pop);

    pop.animate(
        [
            { opacity: 0, transform: "translateY(10px) scale(0.6)" },
            { opacity: 1, transform: "translateY(-8px) scale(1.05)" },
            { opacity: 0, transform: "translateY(-30px) scale(0.6)" },
        ],
        { duration: 700, easing: "ease-out" },
    );

    setTimeout(() => pop.remove(), 900);
}

// bind lapin to forme-ajoutee
document.addEventListener("forme-ajoutee", () => {
    lapinSauteFromTissu();
    setTimeout(() => lapinCourt(), 450);
});

/* ============================================================
   Initialisation DOM
   - connecte boutons, initialise tissuDiv, etc.
   ============================================================ */
window.addEventListener("DOMContentLoaded", () => {
    tissuDiv = document.getElementById("tissu");
    if (!tissuDiv) {
        console.error("Div #tissu introuvable");
        return;
    }

    // Setup buttons
    document.getElementById("btnCreateTissu")?.addEventListener("click", createTissu);
    document.getElementById("btnAddForme")?.addEventListener("click", () => {
        ajouterForme();
        updateListeFormes(); // ensure list complete
    });
    document.getElementById("btnExportImg")?.addEventListener("click", exporterImage);
    document.getElementById("btnExportJSON")?.addEventListener("click", exporterJSON);
    document.getElementById("btnReset")?.addEventListener("click", reinitialiserTissu);

    const fi = document.getElementById("import-json-file");
    if (fi) fi.addEventListener("change", importerJSON_sensible);

    const wlock = document.getElementById("width-lock");
    if (wlock) {
        wlock.addEventListener("click", () => {
            widthLocked = !widthLocked;
            wlock.textContent = widthLocked ? "🔒" : "🔓";
            wlock.title = widthLocked ? "Largeur verrouillée" : "Largeur déverrouillée";
        });
    }

    // inputs largeur/hauteur change taille div sans recréer formes
    document.getElementById("largeur")?.addEventListener("change", () => {
        const val = parseFloat(document.getElementById("largeur").value) || 0;
        if (val <= 0 || !tissuDiv) return;
        if (widthLocked) {
            alert("⚠️ Largeur verrouillée, déverrouillez pour modifier la largeur.");
            document.getElementById("largeur").value = dimensionsPrecedentes.largeur || "";
            return;
        }
        const newW = Math.round(val * CM_TO_PX);
        tissuDiv.style.width = newW + "px";
        mettreAJourLabelTissu();
        updateAllChecks();
    });

    document.getElementById("hauteur")?.addEventListener("change", () => {
        const val = parseFloat(document.getElementById("hauteur").value) || 0;
        if (val <= 0 || !tissuDiv) return;
        const newH = Math.round(val * CM_TO_PX);
        tissuDiv.style.height = newH + "px";
        mettreAJourLabelTissu();
        updateAllChecks();
    });

    // initial checks after small delay (if import happened before)
    setTimeout(() => {
        updateAllChecks();
    }, 120);
});

/* ============================================================
   Import JSON helper (safe)
   ============================================================ */
function importerJSON_sensible(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            const meta = data.metadata || {};
            if (meta.nom) document.getElementById("nom-tissu").value = meta.nom;
            if (meta.largeur_cm) document.getElementById("largeur").value = meta.largeur_cm;
            if (meta.hauteur_cm) document.getElementById("hauteur").value = meta.hauteur_cm;
            createTissu();
            // clear
            shapes.forEach((s) => s.remove());
            shapes = [];
            (data.formes || []).forEach((f) => {
                const wPx = parseInt(f.width) || Math.round((parseFloat(f.wcm) || 10) * CM_TO_PX);
                const hPx = parseInt(f.height) || Math.round((parseFloat(f.hcm) || 10) * CM_TO_PX);
                _createShapeWithPlacement({
                    forme: f.type || "rectangle",
                    wPx,
                    hPx,
                    nom: f.name || f.type,
                });
            });
            calculerTissuPerdu();
            updateListeFormes();
            mettreAJourLabelTissu();
            alert("✅ Import JSON terminé.");
        } catch (err) {
            console.error(err);
            alert("Erreur import JSON.");
        }
    };
    reader.readAsText(file);
}

/* ============================================================
   Label interne forme
   - Centré et rotation inverse pour rester lisible
   ============================================================ */
function mettreAJourLabelForme(el) {
    if (!el) return;
    const name = el.dataset.name || el.dataset.type || "Forme";
    const wcm = el.dataset.wcm || (el.offsetWidth / CM_TO_PX).toFixed(2);
    const hcm = el.dataset.hcm || (el.offsetHeight / CM_TO_PX).toFixed(2);

    let lbl = el.querySelector(".shape-label");
    if (!lbl) {
        lbl = document.createElement("div");
        lbl.className = "shape-label";
        lbl.style.pointerEvents = "none";
        lbl.style.position = "absolute";
        lbl.style.left = "50%";
        lbl.style.top = "50%";
        lbl.style.transform = "translate(-50%,-50%)";
        lbl.style.padding = "6px 10px";
        lbl.style.borderRadius = "8px";
        lbl.style.background = "rgba(70,20,110,0.75)";
        lbl.style.color = "#fff";
        lbl.style.fontFamily = "'Delius Swash Caps', cursive";
        lbl.style.fontSize = "12px";
        el.appendChild(lbl);
    }

    lbl.textContent = `${name} — ${wcm} × ${hcm} cm`;
    // adjust max width to avoid overflow
    lbl.style.maxWidth = Math.max(40, el.offsetWidth - 8) + "px";
    const angle = parseFloat(el.dataset.rotation || "0") || 0;
    lbl.style.transform = `translate(-50%,-50%) rotate(${-angle}deg)`;
}

/* ============================================================
   Final note: places where you can add images / emojis / sounds:
   - lapin : replace the emoji "🐰" in lapinSauteFromTissu / lapinCourt by an <img src="./assets/img/lapin.png">
     (place the image in ./assets/img/lapin.png)
   - pop sound : ./assets/sound/bubble-pop.mp3 (already referenced)
   - background : you said you put it in CSS, so OK.
   ============================================================ */

/* End of script.js */
