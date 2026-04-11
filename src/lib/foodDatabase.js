// Base locale d'aliments courants francais — valeurs CIQUAL ANSES par 100g
// Cette base est interrogee EN PREMIER quand l'utilisateur cherche un aliment dans
// la modale "Logger un aliment". Elle couvre les aliments generiques (poulet, riz,
// pomme, oeuf...) qu'OpenFoodFacts ne trouve pas bien (OFF est surtout pour les
// produits de marque avec code-barre).
//
// Les resultats locaux apparaissent en premier, puis les resultats OpenFoodFacts
// (produits de marque) en complement.

export const LOCAL_FOODS = [
  // ===== FECULENTS CUITS =====
  { name: "Riz blanc cuit", brand: "", calories: 130, proteines: 2.7, glucides: 28, lipides: 0.3, _kw: ["riz", "rice", "blanc"] },
  { name: "Riz complet cuit", brand: "", calories: 123, proteines: 2.7, glucides: 25.5, lipides: 1, _kw: ["riz", "complet", "brown"] },
  { name: "Riz basmati cuit", brand: "", calories: 130, proteines: 2.7, glucides: 28, lipides: 0.3, _kw: ["riz", "basmati"] },
  { name: "Pates cuites", brand: "", calories: 158, proteines: 5.5, glucides: 31, lipides: 0.9, _kw: ["pates", "pasta", "spaghetti", "penne", "fusilli", "tagliatelle"] },
  { name: "Pates completes cuites", brand: "", calories: 149, proteines: 6, glucides: 27, lipides: 1.4, _kw: ["pates", "complet", "complete"] },
  { name: "Semoule cuite", brand: "", calories: 112, proteines: 4, glucides: 23, lipides: 0.4, _kw: ["semoule", "couscous"] },
  { name: "Pomme de terre cuite", brand: "", calories: 86, proteines: 1.7, glucides: 18, lipides: 0.1, _kw: ["pomme de terre", "patate", "potato"] },
  { name: "Patate douce cuite", brand: "", calories: 86, proteines: 1.6, glucides: 20, lipides: 0.1, _kw: ["patate douce", "sweet potato"] },
  { name: "Quinoa cuit", brand: "", calories: 120, proteines: 4.4, glucides: 21, lipides: 1.9, _kw: ["quinoa"] },
  { name: "Boulgour cuit", brand: "", calories: 83, proteines: 3, glucides: 18, lipides: 0.2, _kw: ["boulgour", "bulgur"] },
  { name: "Lentilles cuites", brand: "", calories: 116, proteines: 9, glucides: 20, lipides: 0.4, _kw: ["lentilles", "lentil"] },
  { name: "Pois chiches cuits", brand: "", calories: 164, proteines: 8.9, glucides: 27, lipides: 2.6, _kw: ["pois chiche", "chickpea"] },
  { name: "Haricots rouges cuits", brand: "", calories: 127, proteines: 8.7, glucides: 22, lipides: 0.5, _kw: ["haricot rouge", "kidney"] },
  { name: "Haricots blancs cuits", brand: "", calories: 139, proteines: 9.7, glucides: 25, lipides: 0.4, _kw: ["haricot blanc"] },

  // ===== PAINS ET CEREALES =====
  { name: "Pain blanc / baguette", brand: "", calories: 270, proteines: 8, glucides: 50, lipides: 3, _kw: ["pain", "baguette", "blanc"] },
  { name: "Pain complet", brand: "", calories: 230, proteines: 9, glucides: 41, lipides: 3, _kw: ["pain", "complet"] },
  { name: "Pain de mie", brand: "", calories: 280, proteines: 9, glucides: 49, lipides: 5, _kw: ["pain", "mie"] },
  { name: "Pain aux cereales", brand: "", calories: 245, proteines: 10, glucides: 41, lipides: 4.5, _kw: ["pain", "cereales"] },
  { name: "Biscotte", brand: "", calories: 410, proteines: 11, glucides: 76, lipides: 6, _kw: ["biscotte"] },
  { name: "Flocons d'avoine", brand: "", calories: 372, proteines: 13, glucides: 60, lipides: 7, _kw: ["avoine", "oats", "flocon", "porridge"] },
  { name: "Muesli", brand: "", calories: 360, proteines: 10, glucides: 65, lipides: 6, _kw: ["muesli", "granola"] },
  { name: "Cornflakes", brand: "", calories: 380, proteines: 7.5, glucides: 84, lipides: 0.4, _kw: ["cornflakes", "corn flakes", "cereales"] },

  // ===== VIANDES CUITES =====
  { name: "Blanc de poulet cuit", brand: "", calories: 165, proteines: 31, glucides: 0, lipides: 3.6, _kw: ["poulet", "chicken", "blanc"] },
  { name: "Cuisse de poulet cuite", brand: "", calories: 209, proteines: 26, glucides: 0, lipides: 11, _kw: ["poulet", "cuisse"] },
  { name: "Escalope de dinde cuite", brand: "", calories: 156, proteines: 30, glucides: 0, lipides: 3.5, _kw: ["dinde", "turkey", "escalope"] },
  { name: "Boeuf hache 5% cuit", brand: "", calories: 175, proteines: 27, glucides: 0, lipides: 7, _kw: ["boeuf", "beef", "hache", "steak"] },
  { name: "Boeuf hache 15% cuit", brand: "", calories: 220, proteines: 25, glucides: 0, lipides: 13, _kw: ["boeuf", "hache"] },
  { name: "Steak de boeuf cuit", brand: "", calories: 200, proteines: 29, glucides: 0, lipides: 9, _kw: ["boeuf", "steak", "entrecote", "rumsteak"] },
  { name: "Filet de porc cuit", brand: "", calories: 175, proteines: 30, glucides: 0, lipides: 6, _kw: ["porc", "filet", "pork"] },
  { name: "Cote de porc cuite", brand: "", calories: 230, proteines: 28, glucides: 0, lipides: 13, _kw: ["porc", "cote"] },
  { name: "Jambon blanc", brand: "", calories: 110, proteines: 19, glucides: 0.5, lipides: 3.5, _kw: ["jambon", "ham"] },
  { name: "Jambon de Bayonne / cru", brand: "", calories: 230, proteines: 28, glucides: 0.5, lipides: 13, _kw: ["jambon", "cru", "bayonne", "serrano"] },

  // ===== POISSONS CUITS =====
  { name: "Saumon cuit", brand: "", calories: 200, proteines: 22, glucides: 0, lipides: 12, _kw: ["saumon", "salmon"] },
  { name: "Saumon fume", brand: "", calories: 180, proteines: 22, glucides: 0, lipides: 10, _kw: ["saumon", "fume", "smoked"] },
  { name: "Thon naturel (boite)", brand: "", calories: 116, proteines: 26, glucides: 0, lipides: 1, _kw: ["thon", "tuna"] },
  { name: "Thon a l'huile (boite)", brand: "", calories: 198, proteines: 26, glucides: 0, lipides: 10, _kw: ["thon", "huile"] },
  { name: "Cabillaud cuit", brand: "", calories: 95, proteines: 22, glucides: 0, lipides: 0.7, _kw: ["cabillaud", "morue", "cod"] },
  { name: "Lieu cuit", brand: "", calories: 95, proteines: 21, glucides: 0, lipides: 1, _kw: ["lieu", "colin"] },
  { name: "Sardine a l'huile", brand: "", calories: 220, proteines: 25, glucides: 0, lipides: 13, _kw: ["sardine"] },
  { name: "Maquereau cuit", brand: "", calories: 240, proteines: 21, glucides: 0, lipides: 17, _kw: ["maquereau"] },
  { name: "Crevettes cuites", brand: "", calories: 99, proteines: 24, glucides: 0, lipides: 0.3, _kw: ["crevette", "shrimp", "gambas"] },

  // ===== OEUFS =====
  { name: "Oeuf entier cru", brand: "", calories: 155, proteines: 13, glucides: 1, lipides: 11, _kw: ["oeuf", "egg"] },
  { name: "Blanc d'oeuf", brand: "", calories: 52, proteines: 11, glucides: 0.7, lipides: 0.2, _kw: ["blanc", "oeuf", "egg white"] },
  { name: "Jaune d'oeuf", brand: "", calories: 322, proteines: 16, glucides: 3.6, lipides: 27, _kw: ["jaune", "oeuf", "yolk"] },
  { name: "Omelette nature", brand: "", calories: 165, proteines: 13, glucides: 0.7, lipides: 12, _kw: ["omelette"] },

  // ===== PRODUITS LAITIERS =====
  { name: "Lait demi-ecreme", brand: "", calories: 47, proteines: 3.2, glucides: 4.8, lipides: 1.6, _kw: ["lait", "milk", "demi"] },
  { name: "Lait entier", brand: "", calories: 64, proteines: 3.2, glucides: 4.7, lipides: 3.6, _kw: ["lait", "entier"] },
  { name: "Lait ecreme", brand: "", calories: 33, proteines: 3.4, glucides: 4.9, lipides: 0.1, _kw: ["lait", "ecreme"] },
  { name: "Lait d'amande", brand: "", calories: 24, proteines: 0.5, glucides: 0.3, lipides: 1.1, _kw: ["lait", "amande", "almond"] },
  { name: "Lait d'avoine", brand: "", calories: 47, proteines: 1, glucides: 7, lipides: 1.5, _kw: ["lait", "avoine", "oat"] },
  { name: "Yaourt nature", brand: "", calories: 60, proteines: 4, glucides: 5, lipides: 3, _kw: ["yaourt", "yogurt", "nature"] },
  { name: "Yaourt 0% nature", brand: "", calories: 38, proteines: 4.3, glucides: 4.5, lipides: 0.1, _kw: ["yaourt", "0%", "maigre"] },
  { name: "Yaourt grec", brand: "", calories: 110, proteines: 6, glucides: 4, lipides: 8, _kw: ["yaourt", "grec", "greek"] },
  { name: "Skyr nature", brand: "", calories: 60, proteines: 11, glucides: 4, lipides: 0.2, _kw: ["skyr"] },
  { name: "Fromage blanc 0%", brand: "", calories: 47, proteines: 8, glucides: 4, lipides: 0.1, _kw: ["fromage blanc", "0%"] },
  { name: "Fromage blanc 3%", brand: "", calories: 75, proteines: 7.5, glucides: 4, lipides: 3, _kw: ["fromage blanc"] },
  { name: "Petit-suisse 0%", brand: "", calories: 53, proteines: 9.4, glucides: 3.7, lipides: 0.2, _kw: ["petit suisse"] },

  // ===== FROMAGES =====
  { name: "Emmental", brand: "", calories: 380, proteines: 28, glucides: 0.5, lipides: 30, _kw: ["emmental", "gruyere"] },
  { name: "Comte", brand: "", calories: 410, proteines: 26, glucides: 0, lipides: 34, _kw: ["comte"] },
  { name: "Mozzarella", brand: "", calories: 280, proteines: 19, glucides: 1, lipides: 22, _kw: ["mozzarella"] },
  { name: "Feta", brand: "", calories: 265, proteines: 14, glucides: 4, lipides: 22, _kw: ["feta"] },
  { name: "Chevre frais", brand: "", calories: 207, proteines: 13, glucides: 3, lipides: 16, _kw: ["chevre", "goat"] },
  { name: "Camembert", brand: "", calories: 300, proteines: 20, glucides: 0.5, lipides: 24, _kw: ["camembert"] },
  { name: "Parmesan", brand: "", calories: 410, proteines: 36, glucides: 0, lipides: 29, _kw: ["parmesan", "parmigiano"] },
  { name: "Cheddar", brand: "", calories: 400, proteines: 25, glucides: 1.3, lipides: 33, _kw: ["cheddar"] },

  // ===== FRUITS =====
  { name: "Pomme", brand: "", calories: 52, proteines: 0.3, glucides: 14, lipides: 0.2, _kw: ["pomme", "apple"] },
  { name: "Banane", brand: "", calories: 89, proteines: 1.1, glucides: 23, lipides: 0.3, _kw: ["banane", "banana"] },
  { name: "Orange", brand: "", calories: 47, proteines: 0.9, glucides: 12, lipides: 0.1, _kw: ["orange"] },
  { name: "Fraise", brand: "", calories: 32, proteines: 0.7, glucides: 7.7, lipides: 0.3, _kw: ["fraise", "strawberry"] },
  { name: "Kiwi", brand: "", calories: 61, proteines: 1.1, glucides: 15, lipides: 0.5, _kw: ["kiwi"] },
  { name: "Mangue", brand: "", calories: 60, proteines: 0.8, glucides: 15, lipides: 0.4, _kw: ["mangue", "mango"] },
  { name: "Ananas", brand: "", calories: 50, proteines: 0.5, glucides: 13, lipides: 0.1, _kw: ["ananas", "pineapple"] },
  { name: "Raisin", brand: "", calories: 69, proteines: 0.7, glucides: 18, lipides: 0.2, _kw: ["raisin", "grape"] },
  { name: "Poire", brand: "", calories: 57, proteines: 0.4, glucides: 15, lipides: 0.1, _kw: ["poire", "pear"] },
  { name: "Peche", brand: "", calories: 39, proteines: 0.9, glucides: 9.5, lipides: 0.3, _kw: ["peche", "peach"] },
  { name: "Avocat", brand: "", calories: 160, proteines: 2, glucides: 9, lipides: 15, _kw: ["avocat", "avocado"] },
  { name: "Citron", brand: "", calories: 29, proteines: 1.1, glucides: 9, lipides: 0.3, _kw: ["citron", "lemon"] },
  { name: "Framboise", brand: "", calories: 52, proteines: 1.2, glucides: 12, lipides: 0.6, _kw: ["framboise", "raspberry"] },
  { name: "Myrtille", brand: "", calories: 57, proteines: 0.7, glucides: 14, lipides: 0.3, _kw: ["myrtille", "blueberry"] },

  // ===== FRUITS SECS / OLEAGINEUX =====
  { name: "Amandes", brand: "", calories: 580, proteines: 21, glucides: 22, lipides: 50, _kw: ["amande", "almond"] },
  { name: "Noix", brand: "", calories: 654, proteines: 15, glucides: 14, lipides: 65, _kw: ["noix", "walnut"] },
  { name: "Noisettes", brand: "", calories: 628, proteines: 15, glucides: 17, lipides: 61, _kw: ["noisette", "hazelnut"] },
  { name: "Cajou", brand: "", calories: 553, proteines: 18, glucides: 30, lipides: 44, _kw: ["cajou", "cashew"] },
  { name: "Pistaches", brand: "", calories: 562, proteines: 20, glucides: 28, lipides: 45, _kw: ["pistache", "pistachio"] },
  { name: "Dattes", brand: "", calories: 282, proteines: 2.5, glucides: 75, lipides: 0.4, _kw: ["datte", "date"] },
  { name: "Raisins secs", brand: "", calories: 299, proteines: 3.1, glucides: 79, lipides: 0.5, _kw: ["raisin sec", "raisin"] },
  { name: "Beurre de cacahuete", brand: "", calories: 588, proteines: 25, glucides: 20, lipides: 50, _kw: ["beurre", "cacahuete", "peanut"] },

  // ===== LEGUMES CUITS =====
  { name: "Brocolis cuits", brand: "", calories: 35, proteines: 2.4, glucides: 7, lipides: 0.4, _kw: ["brocoli", "broccoli"] },
  { name: "Courgette cuite", brand: "", calories: 17, proteines: 1.2, glucides: 3.1, lipides: 0.3, _kw: ["courgette", "zucchini"] },
  { name: "Carotte cuite", brand: "", calories: 35, proteines: 0.8, glucides: 8.2, lipides: 0.2, _kw: ["carotte", "carrot"] },
  { name: "Haricots verts cuits", brand: "", calories: 35, proteines: 1.9, glucides: 7.9, lipides: 0.3, _kw: ["haricot vert", "green bean"] },
  { name: "Epinards cuits", brand: "", calories: 23, proteines: 3, glucides: 3.8, lipides: 0.4, _kw: ["epinard", "spinach"] },
  { name: "Chou-fleur cuit", brand: "", calories: 25, proteines: 1.9, glucides: 5, lipides: 0.3, _kw: ["chou fleur", "cauliflower"] },
  { name: "Aubergine cuite", brand: "", calories: 35, proteines: 0.8, glucides: 8.7, lipides: 0.2, _kw: ["aubergine", "eggplant"] },
  { name: "Champignon cuit", brand: "", calories: 28, proteines: 3.1, glucides: 5, lipides: 0.5, _kw: ["champignon", "mushroom"] },
  { name: "Poivron cuit", brand: "", calories: 26, proteines: 0.9, glucides: 6, lipides: 0.2, _kw: ["poivron", "pepper"] },

  // ===== LEGUMES CRUS =====
  { name: "Tomate", brand: "", calories: 18, proteines: 0.9, glucides: 3.9, lipides: 0.2, _kw: ["tomate", "tomato"] },
  { name: "Concombre", brand: "", calories: 16, proteines: 0.7, glucides: 3.6, lipides: 0.1, _kw: ["concombre", "cucumber"] },
  { name: "Salade verte / laitue", brand: "", calories: 15, proteines: 1.4, glucides: 2.9, lipides: 0.2, _kw: ["salade", "laitue", "lettuce"] },

  // ===== MATIERES GRASSES =====
  { name: "Huile d'olive", brand: "", calories: 884, proteines: 0, glucides: 0, lipides: 100, _kw: ["huile", "olive", "oil"] },
  { name: "Huile de colza", brand: "", calories: 884, proteines: 0, glucides: 0, lipides: 100, _kw: ["huile", "colza", "rapeseed"] },
  { name: "Huile de tournesol", brand: "", calories: 884, proteines: 0, glucides: 0, lipides: 100, _kw: ["huile", "tournesol", "sunflower"] },
  { name: "Huile de coco", brand: "", calories: 862, proteines: 0, glucides: 0, lipides: 100, _kw: ["huile", "coco", "coconut"] },
  { name: "Beurre", brand: "", calories: 745, proteines: 0.7, glucides: 0.7, lipides: 82, _kw: ["beurre", "butter"] },
  { name: "Margarine", brand: "", calories: 700, proteines: 0.2, glucides: 1, lipides: 78, _kw: ["margarine"] },

  // ===== SUCRES & DOUCEURS =====
  { name: "Sucre blanc", brand: "", calories: 400, proteines: 0, glucides: 100, lipides: 0, _kw: ["sucre", "sugar"] },
  { name: "Miel", brand: "", calories: 320, proteines: 0.4, glucides: 80, lipides: 0, _kw: ["miel", "honey"] },
  { name: "Confiture", brand: "", calories: 280, proteines: 0.4, glucides: 70, lipides: 0, _kw: ["confiture", "jam"] },
  { name: "Chocolat noir 70%", brand: "", calories: 565, proteines: 8, glucides: 35, lipides: 42, _kw: ["chocolat", "noir", "dark", "chocolate"] },
  { name: "Chocolat au lait", brand: "", calories: 540, proteines: 7, glucides: 56, lipides: 31, _kw: ["chocolat", "lait", "milk"] },
  { name: "Pate a tartiner Nutella", brand: "", calories: 539, proteines: 6.3, glucides: 57, lipides: 30, _kw: ["nutella", "tartiner"] },

  // ===== BOISSONS =====
  { name: "Jus d'orange 100%", brand: "", calories: 45, proteines: 0.7, glucides: 10, lipides: 0.2, _kw: ["jus", "orange"] },
  { name: "Jus de pomme 100%", brand: "", calories: 46, proteines: 0.1, glucides: 11, lipides: 0.1, _kw: ["jus", "pomme"] },
  { name: "Coca-Cola", brand: "", calories: 42, proteines: 0, glucides: 10.6, lipides: 0, _kw: ["coca", "soda"] },
];

// Recherche dans la base locale.
// Match : si TOUS les mots de la query (split sur espace) apparaissent
// dans le nom ou les keywords (insensible a la casse).
// Trie les resultats par longueur de nom (les plus courts/precis en premier).
export function searchLocalFoods(query) {
  if (!query || query.trim().length < 2) return [];
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const results = LOCAL_FOODS.filter((f) => {
    const haystack = (f.name + " " + (f._kw || []).join(" ")).toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
  // Tri : ceux qui ont un mot dans le nom direct passent en premier
  return results.sort((a, b) => {
    const aDirect = words.every((w) => a.name.toLowerCase().includes(w));
    const bDirect = words.every((w) => b.name.toLowerCase().includes(w));
    if (aDirect && !bDirect) return -1;
    if (!aDirect && bDirect) return 1;
    return a.name.length - b.name.length;
  });
}
