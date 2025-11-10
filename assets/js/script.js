let tissuDiv;
let shapes = [];
let selectedElement = null;
let dimensionsPrecedentes = { largeur: null, hauteur: null };

// Quelques jolies couleurs pastel pour nos formes
const couleursPastel = ["#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9", "#BAE1FF", "#CDC1FF"];

// Constante pour convertir des centimètres en pixels (1 cm = 4 px ici)
let CM_TO_PX = window.innerWidth < 768 ? 2 : 4; // 2px/cm sur mobile, 4px/cm sur ordi

// 🧵 Création du tissu
function createTissu() {
    // On récupère les dimensions saisies par l'utilisateur
    const nom = document.getElementById("nom-tissu").value;
    const width = parseFloat(document.getElementById("largeur").value);
    const height = parseFloat(document.getElementById("hauteur").value);
//permet d'alerter si il y a pas de nom renseigner 
if (!nom.trim()) {
        alert("Veuillez entrer un nom pour le tissu.");
        return;
    }
    // faire que si rien na changer ne pas mettre à jour automatiquement à jour le site
    if (
        dimensionsPrecedentes.largeur === width &&
        dimensionsPrecedentes.hauteur === height
    ) {
        alert("Les dimensions n'ont pas changé. Le tissu n'a pas été recréé.");
        return;
    }dimensionsPrecedentes = { largeur: width, hauteur: height };
    // On sélectionne le div "tissu" et on le vide
    tissuDiv = document.getElementById("tissu");
    tissuDiv.innerHTML = "";

    // On applique la taille du tissu convertie en pixels
    tissuDiv.style.width = width * CM_TO_PX + "px";
    tissuDiv.style.height = height * CM_TO_PX + "px";

    // On rend le div focusable pour pouvoir y capter les touches
    tissuDiv.tabIndex = 0;
    tissuDiv.focus();
}
// ➕ Ajout d’une nouvelle forme sur le tissu
function ajouterForme() {
    
    //rajouter que l'on doit absolument créer le tissu pour avoir les pièces
     if (!tissuDiv || tissuDiv.style.width === "" || tissuDiv.style.height === "") {
    alert("Veuillez d'abord créer le tissu avant d'ajouter des formes !");
    return;
}
    const forme = document.getElementById("forme").value;
    const l = parseFloat(document.getElementById("formLargeur").value) * CM_TO_PX;
    const h = parseFloat(document.getElementById("formHauteur").value) * CM_TO_PX;
    const nom = document.getElementById("formNom").value || forme; // Si pas de nom saisi, on prend le type de forme
    const couleur = couleursPastel[Math.floor(Math.random() * couleursPastel.length)];

    const elem = document.createElement("div"); // On crée un nouveau div pour la forme
    elem.className = "shape";
    elem.style.background = couleur;
    elem.style.left = "0px"; // Position de départ en haut à gauche
    elem.style.top = "0px";
    elem.dataset.rotation = "0"; // Stocke l’angle de rotation

    // On applique le style en fonction du type de forme
    if (forme === "carre") {
        elem.style.width = elem.style.height = l + "px";
    } else if (forme === "rectangle") {
        elem.style.width = l + "px";
        elem.style.height = h + "px";
    } else if (forme === "cercle") {
        elem.style.width = l + "px";
        elem.style.height = l + "px";
        elem.style.borderRadius = "50%"; // Cercle = bord arrondi à 100%
    } else if (forme === "triangle") {
        elem.style.width = "0";
        elem.style.height = "0";
        elem.style.borderLeft = l / 2 + "px solid transparent";
        elem.style.borderRight = l / 2 + "px solid transparent";
        elem.style.borderBottom = h + "px solid " + couleur;
        elem.style.background = "none";
    }

    // On rend la forme déplaçable à la souris et au clavier
    makeDraggable(elem);
    ajouterClavier(elem);

    // On ajoute la forme au tissu
    tissuDiv.appendChild(elem);

    // Et à la liste à droite (avec nom, taille, boutons)
    ajouterALaListe(nom, elem);

    // On vérifie si elle dépasse du tissu
    verifierDepassement(elem);
    shapes.push(elem);
    calculerTissuPerdu();
    if (document.getElementById("autoTissu").checked) {
        ajusterTissuAuto();
    }
}
//fonction pour calculer automatiquement le tissu perdu 
function calculerTissuPerdu() {
    const tissu = document.getElementById("tissu");
    const largeurTissu = tissu.offsetWidth;
    const hauteurTissu = tissu.offsetHeight;

    // Création de la grille : 1 case = 1 pixel
    let grille = Array.from({ length: hauteurTissu }, () => Array(largeurTissu).fill(0));

    // Pour chaque forme
    formes.forEach(forme => {
        const rect = forme.element.getBoundingClientRect();
        const tissuRect = tissu.getBoundingClientRect();
        
        // Position de la forme par rapport au tissu
        const x = Math.round(rect.left - tissuRect.left);
        const y = Math.round(rect.top - tissuRect.top);
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);

        for (let i = y; i < y + h; i++) {
            for (let j = x; j < j + w; j++) {
                if (i >= 0 && i < hauteurTissu && j >= 0 && j < largeurTissu) {
                    grille[i][j] = 1; // occupé
                }
            }
        }
    });

    // Compte les cases vides
    let tissuPerdu = 0;
    for (let i = 0; i < hauteurTissu; i++) {
        for (let j = 0; j < largeurTissu; j++) {
            if (grille[i][j] === 0) tissuPerdu++;
        }
    }

    // Affichage
    document.getElementById("perte").innerText = `${tissuPerdu} cm²`;
}
// fonction pour que les tissu se mette les un sous les autre
function empilerSousLesAutres(elem) {
    let yOffset = 0;
    shapes.forEach((el) => {
        yOffset += el.offsetHeight + 5; // 5px d'espacement
    });

    elem.style.top = yOffset + "px";
    elem.style.left = "0px";
}
// fonction pour que le tissu s'adapte au différente pièce
function ajusterTissuAuto() {
    let maxRight = 0;
    let maxBottom = 0;

    shapes.forEach((el) => {
        const right = el.offsetLeft + el.offsetWidth;
        const bottom = el.offsetTop + el.offsetHeight;
        if (right > maxRight) maxRight = right;
        if (bottom > maxBottom) maxBottom = bottom;
    });

    tissuDiv.style.width = maxRight + "px";
    tissuDiv.style.height = maxBottom + "px";

    document.getElementById("largeur").value = (maxRight / CM_TO_PX).toFixed(2);
    document.getElementById("hauteur").value = (maxBottom / CM_TO_PX).toFixed(2);
}
function updateShapeList() {
    const list = document.getElementById("shapeList");
    list.innerHTML = "";

    shapes.forEach((shape, index) => {
        const li = document.createElement("li");
        li.textContent = `Forme ${index + 1}`;
        li.addEventListener("click", () => {
            selectedShape = shape;
            li.classList.add("selected");
        });
        list.appendChild(li);
    });
}

// 📋 Ajout de la forme à la liste visible (avec ses infos)
function ajouterALaListe(nom, element) {
    const ul = document.getElementById("liste-formes");
    const li = document.createElement("li");

    // Récupération des dimensions en cm
    const largeur = element.offsetWidth / CM_TO_PX;
    const hauteur = element.offsetHeight / CM_TO_PX;

    li.textContent = `${nom} - ${largeur} x ${hauteur} cm `;

    // Bouton suppression
    const btnDelete = document.createElement("button");
    btnDelete.textContent = "❌";
    btnDelete.onclick = () => {
        element.remove();
        li.remove();
    };

    // Boutons rotation
    const btnRotateRight = document.createElement("button");
    btnRotateRight.textContent = "↪️";
    btnRotateRight.onclick = () => rotateElement(element, 15);

    const btnRotateLeft = document.createElement("button");
    btnRotateLeft.textContent = "↩️";
    btnRotateLeft.onclick = () => rotateElement(element, -15);

    // ➕ Ajout du clic pour sélection
    li.addEventListener("click", () => {
        // Supprime la classe 'selected' de tous les éléments
        const allItems = ul.querySelectorAll("li");
        allItems.forEach((item) => item.classList.remove("selected"));

        // Applique la classe 'selected' à l'élément cliqué
        li.classList.add("selected");

        // Met à jour la forme sélectionnée
        selectedShape = element;

        // Donne aussi le focus à l’élément correspondant sur le tissu
        element.focus();
    });

    li.appendChild(btnRotateRight);
    li.appendChild(btnRotateLeft);
    li.appendChild(btnDelete);
    ul.appendChild(li);
}

// 🐭 Déplacement des formes à la souris
function makeDraggable(el) {
    let offsetX, offsetY;

    el.addEventListener("mousedown", (e) => {
        offsetX = e.offsetX;
        offsetY = e.offsetY;
        selectedElement = el;
        el.focus();

        function onMouseMove(e) {
            el.style.left = e.pageX - tissuDiv.offsetLeft - offsetX + "px";
            el.style.top = e.pageY - tissuDiv.offsetTop - offsetY + "px";
            verifierDepassement(el);
        }

        function onMouseUp() {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        }

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    });

    el.tabIndex = 0;
    el.classList.add("draggable");

    el.addEventListener("click", () => {
        selectedElement = el;
        el.focus();
    });
}
function ajouterClavier(el) {
    el.addEventListener("keydown", (e) => {
        const step = 1;
        const top = parseInt(el.style.top);
        const left = parseInt(el.style.left);

        if (e.key === "ArrowUp") el.style.top = top - step + "px";
        else if (e.key === "ArrowDown") el.style.top = top + step + "px";
        else if (e.key === "ArrowLeft") el.style.left = left - step + "px";
        else if (e.key === "ArrowRight") el.style.left = left + step + "px";
        else if (e.key === "a" || e.key === "A") rotateElement(el, -15);
        else if (e.key === "e" || e.key === "E") rotateElement(el, 15);

        verifierDepassement(el);
    });
}
// 🔄 Fonction pour faire tourner une forme
function rotateElement(el, angle) {
    const current = parseInt(el.dataset.rotation || "0");
    const newAngle = current + angle;
    el.dataset.rotation = newAngle;
    el.style.transform = `rotate(${newAngle}deg)`;
}

// 🚧 Vérifie si une forme dépasse du tissu
function verifierDepassement(el) {
    const r = el.getBoundingClientRect(); // position réelle sur l'écran
    const parent = tissuDiv.getBoundingClientRect();

    if (
        r.left < parent.left ||
        r.top < parent.top ||
        r.right > parent.right ||
        r.bottom > parent.bottom
    ) {
        el.classList.add("outside"); // Ajoute une classe si ça dépasse
    } else {
        el.classList.remove("outside");
    }
}
// 📸 Export du tissu en image PNG
function exporterImage() {
    html2canvas(tissuDiv).then((canvas) => {
        const link = document.createElement("a");
    if (!tissuDiv || tissuDiv.style.width === "" || tissuDiv.style.height === "") {
        alert("Veuillez d'abord créer le tissu avant d'ajouter des formes !");
        return;
    }   
    const nomTissu = document.getElementById("nom-tissu").value.trim() || "decoupe-tissu";
link.download = `${nomTissu}.png`;     
    link.href = canvas.toDataURL();
            link.click();
        });
}
// 💾 Export des données en JSON (pour sauvegarder)
function exporterJSON() {
    const formes = Array.from(tissuDiv.children)
        .filter((c) => c.classList.contains("shape"))
        .map((el) => {
            return {
                left: el.style.left,
                top: el.style.top,
                width: el.style.width,
                height: el.style.height,
                type: el.className,
                rotation: el.dataset.rotation || "0",
                background: el.style.background,
            };
        });
    const blob = new Blob([JSON.stringify(formes, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
const nomTissu = document.getElementById("nom-tissu").value.trim() || "decoupe-tissu";
link.download = `${nomTissu}.json`;    link.click();
}
// // 📥 Import des données depuis un fichier JSON
// function importerJSON(event) {
//     const file = event.target.files[0];
//     if (!file) return;
//     const reader = new FileReader();
//     reader.onload = (e) => {
//         const data = JSON.parse(e.target.result);
//         data.forEach((f) => {
//             const elem = document.createElement("div");
//             elem.className = "shape";
//             elem.style.left = f.left;
//             elem.style.top = f.top;
//             elem.style.width = f.width;
//             elem.style.height = f.height;
//             elem.style.background = f.background;
//             if (f.type.includes("cercle")) elem.style.borderRadius = "50%";
//             makeDraggable(elem);
//             ajouterClavier(elem);
//             tissuDiv.appendChild(elem);
//             ajouterALaListe("Importé", elem);
//         });
//     };
//     reader.readAsText(file);
//}

// 🔄 Réinitialiser complètement le tissu
function reinitialiserTissu() {
    const formes = tissuDiv.querySelectorAll(".forme");
    formes.forEach((forme) => forme.remove());
    selectedElement = null;
}
// Ajout à makeDraggable
function makeDraggable(el) {
    let offsetX, offsetY;
    el.addEventListener("mousedown", (e) => {
        offsetX = e.offsetX;
        offsetY = e.offsetY;
        selectedElement = el;
        el.focus();

        function onMouseMove(e) {
            el.style.left = e.pageX - tissuDiv.offsetLeft - offsetX + "px";
            el.style.top = e.pageY - tissuDiv.offsetTop - offsetY + "px";
            verifierDepassement(el);
        }
        function onMouseUp() {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        }
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    });
    el.tabIndex = 0;
    el.classList.add("draggable");

    el.addEventListener("click", () => {
        selectedElement = el;
        el.focus();
    });
}

// Fonction pour déplacer la forme sélectionnée
if (window.innerWidth < 768) {
    document.getElementById("mobile-controls").style.display = "flex";
}
function isMobile() {
    return /Mobi|Android/i.test(navigator.userAgent);
}

if (isMobile()) {
    document.getElementById("mobile-controls").style.display = "block";
}


function moveSelectedElement(dx, dy) {
    if (!selectedElement) return;

    // Position actuelle
    const currentLeft = parseInt(selectedElement.style.left || 0);
    const currentTop = parseInt(selectedElement.style.top || 0);

    // Nouvelle position
    selectedElement.style.left = `${currentLeft + dx}px`;
    selectedElement.style.top = `${currentTop + dy}px`;
}

// Attache les événements aux flèches mobile
document.getElementById("upArrow").addEventListener("click", () => moveSelectedElement(0, -10));
document.getElementById("downArrow").addEventListener("click", () => moveSelectedElement(0, 10));
document.getElementById("leftArrow").addEventListener("click", () => moveSelectedElement(-10, 0));
document.getElementById("rightArrow").addEventListener("click", () => moveSelectedElement(10, 0));
