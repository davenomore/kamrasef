document.addEventListener('DOMContentLoaded', () => {
    // Firebase Auth Elements
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');

    // Current user
    let currentUser = null;

    // Pantry Elements
    const itemNameInput = document.getElementById('item-name');
    const itemQuantityInput = document.getElementById('item-quantity');
    const itemUnitInput = document.getElementById('item-unit');
    const itemCategoryInput = document.getElementById('item-category');
    const addBtn = document.getElementById('add-btn');
    const pantryList = document.getElementById('pantry-list');

    // Shopping List Elements
    const shoppingListItemsContainer = document.getElementById('shopping-list-items');
    const clearListBtn = document.getElementById('clear-list-btn');
    const addCheckedToPantryBtn = document.getElementById('add-checked-to-pantry-btn');

    // Recipe Elements
    const recipeSelect = document.getElementById('recipe-select');
    const checkRecipeBtn = document.getElementById('check-recipe-btn');
    const cookRecipeBtn = document.getElementById('cook-recipe-btn');
    const editRecipeBtn = document.getElementById('edit-recipe-btn');
    const newRecipeBtn = document.getElementById('new-recipe-btn');
    const recipeModal = document.getElementById('recipe-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const saveRecipeBtn = document.getElementById('save-recipe-btn');
    const addIngredientRowBtn = document.getElementById('add-ingredient-row-btn');
    const recipeIngredientsList = document.getElementById('recipe-ingredients-list');
    const newRecipeNameInput = document.getElementById('new-recipe-name');
    const recipeCategorySelect = document.getElementById('recipe-category');
    const generateInspirationBtn = document.getElementById('generate-inspiration-btn');
    const inspirationResult = document.getElementById('inspiration-result');
    const inspirationDish = document.getElementById('inspiration-dish');
    const inspirationDescription = document.getElementById('inspiration-description');
    let editingRecipeId = null;

    // State
    let pantryItems = [];
    let shoppingList = [];
    let recipes = [];

    // Initialize Firebase Auth State Listener
    initializeAuth();
    generateInspiration(true); // Auto-generate inspiration on load (silent)

    const expiryBtn = document.getElementById('expiry-btn');
    const expiryContainer = document.getElementById('expiry-date-container');
    const itemExpiryInput = document.getElementById('item-expiry');
    const aiChefBtn = document.getElementById('ai-chef-btn');
    const inspirationDetails = document.getElementById('inspiration-details');

    const searchInput = document.getElementById('search-input');

    // Event Listeners
    addBtn.addEventListener('click', addItem);
    if (expiryBtn) {
        expiryBtn.addEventListener('click', () => {
            expiryContainer.classList.toggle('hidden');
        });
    }
    if (aiChefBtn) {
        aiChefBtn.addEventListener('click', generateAiRecipe);
    }
    itemNameInput.addEventListener('input', suggestCategory); // Add suggestion listener
    clearListBtn.addEventListener('click', clearShoppingList);
    addCheckedToPantryBtn.addEventListener('click', addCheckedToPantry);

    // Search Listener
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderItems(pantryItems, false); // Show all, collapsed
            return;
        }

        const filteredItems = pantryItems.filter(item =>
            item.name.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query)
        );
        renderItems(filteredItems, true); // Show filtered, expanded
    });

    // Mobile Navigation
    const navAddItem = document.getElementById('nav-add-item');
    const navRecipe = document.getElementById('nav-recipe');
    const navInspiration = document.getElementById('nav-inspiration');

    const addItemSection = document.querySelector('.add-item-section');
    const recipeSection = document.querySelector('.recipe-section');
    const inspirationSection = document.querySelector('.inspiration-section');

    // Make globally accessible for debugging/inline calls if needed
    window.switchMobileSection = function (sectionName) {
        console.log('Switching to mobile section:', sectionName); // Debug log

        // Remove active class from all buttons and sections
        [navAddItem, navRecipe, navInspiration].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        [addItemSection, recipeSection, inspirationSection].forEach(sec => {
            if (sec) sec.classList.remove('active');
        });

        // Add active class to selected
        if (sectionName === 'add-item' && navAddItem && addItemSection) {
            navAddItem.classList.add('active');
            addItemSection.classList.add('active');
        } else if (sectionName === 'recipe' && navRecipe && recipeSection) {
            navRecipe.classList.add('active');
            recipeSection.classList.add('active');
        } else if (sectionName === 'inspiration' && navInspiration && inspirationSection) {
            navInspiration.classList.add('active');
            inspirationSection.classList.add('active');
        }
    };

    if (navAddItem && navRecipe && navInspiration) {
        // Use both click and touchstart for better mobile response
        ['click', 'touchstart'].forEach(evt => {
            navAddItem.addEventListener(evt, (e) => {
                if (e.cancelable) e.preventDefault(); // Prevent double firing
                window.switchMobileSection('add-item');
            }, { passive: false });

            navRecipe.addEventListener(evt, (e) => {
                if (e.cancelable) e.preventDefault();
                window.switchMobileSection('recipe');
            }, { passive: false });

            navInspiration.addEventListener(evt, (e) => {
                if (e.cancelable) e.preventDefault();
                window.switchMobileSection('inspiration');
            }, { passive: false });
        });

        // Initialize active state for mobile
        if (window.innerWidth <= 768) {
            // Ensure one is active
            if (!document.querySelector('.nav-btn.active')) {
                window.switchMobileSection('add-item');
            }
        }
    }

    // Recipe Event Listeners
    checkRecipeBtn.addEventListener('click', checkRecipe);
    cookRecipeBtn.addEventListener('click', cookRecipe);
    editRecipeBtn.addEventListener('click', editRecipe);
    newRecipeBtn.addEventListener('click', openRecipeModal);
    closeModalBtn.addEventListener('click', closeRecipeModal);
    addIngredientRowBtn.addEventListener('click', addIngredientRow);
    saveRecipeBtn.addEventListener('click', saveNewRecipe);
    newRecipeNameInput.addEventListener('input', suggestRecipeCategory); // Auto-suggest category

    // Inspiration Event Listener
    generateInspirationBtn.addEventListener('click', () => generateInspiration(false));

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === recipeModal) closeRecipeModal();
    });

    // Allow adding with Enter key on inputs
    [itemNameInput, itemQuantityInput, itemUnitInput, itemCategoryInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addItem();
        });
    });

    // --- Pantry Functions ---

    function addItem() {
        const nameInput = itemNameInput.value.trim();
        const quantityInput = itemQuantityInput.value.trim();
        const unitInput = itemUnitInput.value.trim();
        let categoryInput = itemCategoryInput.value.trim();

        if (!nameInput) {
            alert('Kérlek add meg a termék nevét!');
            return;
        }

        const name = nameInput;
        const quantity = parseFloat(quantityInput);
        const unit = unitInput;
        const category = categoryInput || 'Egyéb';
        const expiry = itemExpiryInput.value;

        if (name && !isNaN(quantity) && unit) {
            // Check if item already exists
            const existingItemIndex = pantryItems.findIndex(item => item.name.toLowerCase() === name.toLowerCase() && item.unit === unit);

            if (existingItemIndex > -1) {
                // Update existing item
                pantryItems[existingItemIndex].quantity += quantity;
                // Update expiry only if new one is provided
                if (expiry) {
                    pantryItems[existingItemIndex].expiry = expiry;
                }
            } else {
                // Add new item
                const newItem = {
                    id: Date.now(), // Keep original ID generation
                    name: capitalizeFirstLetter(name),
                    quantity: quantity,
                    unit: unit,
                    category: capitalizeFirstLetter(category),
                    expiry: expiry
                };
                pantryItems.push(newItem);
            }

            saveData();
            renderItems();
            updateCategoryDatalist();

            // Clear inputs
            itemNameInput.value = '';
            itemQuantityInput.value = '';
            itemUnitInput.value = '';
            itemCategoryInput.value = '';
            itemExpiryInput.value = '';
            expiryContainer.classList.add('hidden');
        } else {
            alert('Kérlek töltsd ki a kötelező mezőket (Név, Mennyiség, Mértékegység)!');
        }
    }

    function deleteItem(id) {
        pantryItems = pantryItems.filter(item => item.id !== id);
        saveData();
        renderItems();
    }

    function clearInputs() {
        itemNameInput.value = '';
        itemQuantityInput.value = '';
        itemUnitInput.value = '';
        itemCategoryInput.value = '';
        itemNameInput.focus();
    }

    function renderItems(itemsToRender = pantryItems, shouldExpand = false) {
        pantryList.innerHTML = '';

        if (itemsToRender.length === 0) {
            pantryList.innerHTML = `
                <div class="empty-state">
                    <p>${pantryItems.length === 0 ? 'Még nincsenek termékek a kamrában.' : 'Nincs találat a keresésre.'}</p>
                </div>
            `;
            return;
        }

        // Group items by category
        const groupedItems = {};
        itemsToRender.forEach(item => {
            if (!groupedItems[item.category]) {
                groupedItems[item.category] = [];
            }
            groupedItems[item.category].push(item);
        });

        // Sort categories alphabetically
        const sortedCategories = Object.keys(groupedItems).sort();

        // Category Icons Map (Minimalist SVGs)
        const categoryIcons = {
            'Tészták': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2 12 4"/><path d="M12 20 12 22"/><path d="M20 12 22 12"/><path d="M2 12 4 12"/><path d="M9 2v10"/><path d="M15 2v10"/><path d="M12 2v10"/></svg>', // Pasta/Spaghetti
            'Fűszerek': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>', // Star/Sparkle
            'Zöldségek': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c-4 0-8 4-8 9 0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9 0-5-4-9-8-9z"/><path d="M12 22V11"/></svg>', // Leaf
            'Gyümölcsök': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 4a2 2 0 0 1 2 2"/></svg>', // Apple-ish
            'Konzervek': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>', // Database/Can
            'Tejtermékek': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2z"/><circle cx="8" cy="8" r="2"/><circle cx="16" cy="16" r="2"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="12" cy="12" r="2"/></svg>', // Better Cheese Block
            'Pékáru': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 20.5C10 21.3 10.7 22 11.5 22h1c.8 0 1.5-.7 1.5-1.5V18h-2.5v2.5z"/><path d="M7 18h10v-5.8c0-2.2-1.8-4-4-4h-2c-2.2 0-4 1.8-4 4v5.8z"/><path d="M7 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h2"/></svg>', // Bread/Toast
            'Húsok': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 5c-1.5 0-2.8 0.6-3.8 1.6l-8.4 8.4c-0.9 0.9-1.4 2.1-1.4 3.4 0 2.7 2.2 4.9 4.9 4.9 1.3 0 2.5-0.5 3.4-1.4l8.4-8.4c1-1 1.6-2.3 1.6-3.8 0-2.7-2.2-4.9-4.9-4.9z"/><path d="M16 8L8 16"/></svg>', // Drumstick/Meat
            'Italok': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>', // Coffee Cup
            'Snack': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>', // Target/Snack
            'Szószok': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.2 7.8l-7.7 7.7a4 4 0 0 1-5.7-5.7l7.7-7.7c0.9-0.9 2.4-0.9 3.3 0l2.4 2.4c0.9 0.9 0.9 2.4 0 3.3z"/><path d="M12 12l4 4"/></svg>', // Bottle
            'Sütés': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v2"/><path d="M12 8v2"/><path d="M17 8v2"/><path d="M7 4h.01"/><path d="M12 4h.01"/><path d="M17 4h.01"/></svg>', // Cake
            'Gabonafélék': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V8a5 5 0 0 1 5-5c2.5 0 5 2.24 5 5v8"/><path d="M12 22V11"/><path d="M12 8a2 2 0 0 0-2-2"/><path d="M12 8a2 2 0 0 1 2-2"/><path d="M12 12a2 2 0 0 0-2-2"/><path d="M12 12a2 2 0 0 1 2-2"/><path d="M12 16a2 2 0 0 0-2-2"/><path d="M12 16a2 2 0 0 1 2-2"/></svg>', // Wheat/Grain
            'Egyéb': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>' // Box
        };

        sortedCategories.forEach(category => {
            const items = groupedItems[category];
            const icon = categoryIcons[category] || categoryIcons['Egyéb'];

            // Create category section
            const categorySection = document.createElement('div');
            categorySection.className = 'category-group';

            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'category-title';
            categoryHeader.innerHTML = `
                <div class="category-title-content">
                    <span class="category-icon">${icon}</span>
                    ${category}
                    <span class="category-count">${items.length}</span>
                    <svg class="category-chevron ${shouldExpand ? '' : 'rotated'}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>
            `;

            const itemsGrid = document.createElement('div');
            itemsGrid.className = `items-grid ${shouldExpand ? '' : 'hidden'}`;

            // Toggle functionality
            categoryHeader.addEventListener('click', () => {
                itemsGrid.classList.toggle('hidden');
                const chevron = categoryHeader.querySelector('.category-chevron');
                chevron.classList.toggle('rotated');
            });

            // Sort items alphabetically within category
            items.sort((a, b) => a.name.localeCompare(b.name));

            items.forEach(item => {
                const itemCard = document.createElement('div');
                itemCard.className = 'item-card';
                itemCard.innerHTML = `
                    <div class="item-details">
                        <span class="item-name">${item.name}</span>
                        <span class="item-quantity">${item.quantity} ${item.unit}</span>
                        ${item.expiry ? `<span class="item-expiry" title="Lejárat: ${item.expiry}">🕒 ${item.expiry}</span>` : ''}
                    </div>
                    <div class="item-actions">
                        <button class="add-to-list-btn" title="Hozzáadás a bevásárlólistához">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                        </button>
                        <button class="delete-btn" title="Törlés">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                `;

                // Add event listeners
                const deleteBtn = itemCard.querySelector('.delete-btn');
                deleteBtn.addEventListener('click', () => deleteItem(item.id));

                const addToListBtn = itemCard.querySelector('.add-to-list-btn');
                addToListBtn.addEventListener('click', () => addToShoppingList(item));

                itemsGrid.appendChild(itemCard);
            });

            categorySection.appendChild(categoryHeader);
            categorySection.appendChild(itemsGrid);
            pantryList.appendChild(categorySection);
        });
    }

    // --- Shopping List Functions ---

    function addToShoppingList(item) {
        // Check if already exists
        const exists = shoppingList.some(listItem => listItem.name === item.name);
        if (exists) {
            return;
        }

        const newItem = {
            id: Date.now() + Math.random(), // Ensure unique ID
            name: capitalizeFirstLetter(item.name),
            quantity: item.quantity || 1,
            unit: item.unit || 'db',
            category: item.category || 'Egyéb',
            bought: false
        };

        shoppingList.push(newItem);
        saveData();
        renderShoppingList();
    }

    function toggleBought(id) {
        shoppingList = shoppingList.map(item => {
            if (item.id === id) {
                return { ...item, bought: !item.bought };
            }
            return item;
        });
        saveData();
        renderShoppingList();
    }

    function removeFromShoppingList(id) {
        const itemToRemove = shoppingList.find(item => item.id === id);
        if (itemToRemove) {
            // Add back to pantry
            const pantryItem = {
                id: Date.now(),
                name: itemToRemove.name,
                quantity: itemToRemove.quantity || 1,
                unit: itemToRemove.unit || 'db',
                category: itemToRemove.category || 'Egyéb'
            };

            // Check if item already exists in pantry to merge
            const existingPantryItem = pantryItems.find(p =>
                p.name.toLowerCase() === pantryItem.name.toLowerCase() &&
                p.unit === pantryItem.unit
            );

            if (existingPantryItem) {
                existingPantryItem.quantity = parseFloat(existingPantryItem.quantity) + parseFloat(pantryItem.quantity);
            } else {
                pantryItems.push(pantryItem);
            }
        }

        shoppingList = shoppingList.filter(item => item.id !== id);
        saveData();
        renderShoppingList();
        renderItems(); // Update pantry view
    }

    function addCheckedToPantry() {
        // Get all checked items
        const checkedItems = shoppingList.filter(item => item.bought === true);

        if (checkedItems.length === 0) {
            alert('Nincs kiválasztva egy termék sem! Jelöld be a vásárolt termékeket.');
            return;
        }

        // Add checked items to pantry
        checkedItems.forEach(item => {
            // Check if item already exists in pantry
            const existingItem = pantryItems.find(pItem =>
                pItem.name.toLowerCase() === item.name.toLowerCase()
            );

            if (existingItem) {
                // Item exists - add quantities (with unit conversion if needed)
                const existingNormalized = normalizeQuantity(
                    parseFloat(existingItem.quantity) || 0,
                    existingItem.unit,
                    item.name
                );
                const newNormalized = normalizeQuantity(
                    parseFloat(item.quantity) || 0,
                    item.unit,
                    item.name
                );

                const totalNormalized = existingNormalized + newNormalized;
                const totalInOriginalUnit = totalNormalized / normalizeQuantity(1, existingItem.unit, item.name);

                existingItem.quantity = totalInOriginalUnit;
            } else {
                // Item doesn't exist - add new
                pantryItems.push({
                    id: Date.now() + Math.random(),
                    name: item.name,
                    quantity: item.quantity,
                    unit: item.unit,
                    category: item.category || 'Egyéb',
                    expiry: ''
                });
            }
        });

        // Remove checked items from shopping list
        shoppingList = shoppingList.filter(item => item.bought !== true);

        // Save and render
        saveData();
        renderItems();
        renderShoppingList();

        alert(`${checkedItems.length} termék hozzáadva a készlethez!`);
    }

    function clearShoppingList() {
        if (confirm('Biztosan törölni szeretnéd a teljes bevásárlólistát?')) {
            shoppingList = [];
            saveData();
            renderShoppingList();
        }
    }

    function renderShoppingList() {
        shoppingListItemsContainer.innerHTML = '';

        if (shoppingList.length === 0) {
            shoppingListItemsContainer.innerHTML = `
                <div class="empty-state-small">
                    <p>A lista üres.</p>
                </div>
            `;
            return;
        }

        // Sort: Bought items last
        shoppingList.sort((a, b) => {
            if (a.bought === b.bought) return 0;
            return a.bought ? 1 : -1;
        });

        shoppingList.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = `shopping-item ${item.bought ? 'bought' : ''}`;

            // Default values if missing
            const qty = item.quantity || 1;
            const unit = item.unit || 'db';

            itemEl.innerHTML = `
                <div class="shopping-item-info">
                    <input type="checkbox" class="shopping-checkbox" ${item.bought ? 'checked' : ''}>
                    <span class="shopping-item-name">${item.name}</span>
                    <input type="number" class="shop-qty" value="${qty}" step="0.1" min="0">
                    <input type="text" class="shop-unit" value="${unit}" list="units">
                </div>
                <button class="btn-text delete-list-item" title="Eltávolítás">✕</button>
            `;

            const checkbox = itemEl.querySelector('.shopping-checkbox');
            checkbox.addEventListener('change', () => toggleBought(item.id));

            const qtyInput = itemEl.querySelector('.shop-qty');
            const unitInput = itemEl.querySelector('.shop-unit');

            qtyInput.addEventListener('change', (e) => updateShoppingItem(item.id, 'quantity', e.target.value));
            unitInput.addEventListener('change', (e) => updateShoppingItem(item.id, 'unit', e.target.value));

            // Prevent click propagation to checkbox when clicking inputs
            qtyInput.addEventListener('click', (e) => e.stopPropagation());
            unitInput.addEventListener('click', (e) => e.stopPropagation());

            const deleteBtn = itemEl.querySelector('.delete-list-item');
            deleteBtn.addEventListener('click', () => removeFromShoppingList(item.id));

            shoppingListItemsContainer.appendChild(itemEl);
        });
    }

    function updateShoppingItem(id, field, value) {
        const item = shoppingList.find(i => i.id === id);
        if (item) {
            item[field] = value;
            saveData();
        }
    }

    // --- Recipe Functions ---

    function renderRecipeSelect() {
        recipeSelect.innerHTML = '<option value="" disabled selected>Válassz receptet...</option>';

        // Group recipes by category
        const grouped = {};
        recipes.forEach(recipe => {
            const cat = recipe.category || 'Egyéb';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(recipe);
        });

        // Add optgroups
        const categories = ['Levesek', 'Tésztás ételek', 'Főzelékek', 'Húsos ételek', 'Köretek', 'Desszertek', 'Egyéb'];
        categories.forEach(cat => {
            if (!grouped[cat]) return;
            const optgroup = document.createElement('optgroup');
            optgroup.label = cat;
            grouped[cat].forEach(recipe => {
                const option = document.createElement('option');
                option.value = recipe.id;
                option.textContent = recipe.name;
                optgroup.appendChild(option);
            });
            recipeSelect.appendChild(optgroup);
        });
    }

    async function checkRecipe() {
        const recipeId = parseInt(recipeSelect.value);
        if (!recipeId) {
            alert('Kérlek válassz egy receptet!');
            return;
        }

        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe) return;

        // Show loading state
        const originalBtnText = checkRecipeBtn.innerHTML;
        checkRecipeBtn.innerHTML = '<svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg> Ellenőrzés...';
        checkRecipeBtn.disabled = true;

        try {
            let missingItems = [];

            recipe.ingredients.forEach(reqItem => {
                // Find item in pantry (case-insensitive check)
                const pantryItem = pantryItems.find(pItem => pItem.name && pItem.name.toLowerCase() === reqItem.name.toLowerCase());

                if (!pantryItem) {
                    // Item completely missing
                    missingItems.push(reqItem);
                } else {
                    // Item exists, check quantity with unit conversion
                    const pantryQty = parseFloat(pantryItem.quantity) || 0;
                    const recipeQty = parseFloat(reqItem.quantity) || 0;

                    // Convert both to comparable units
                    const pantryNormalized = normalizeQuantity(pantryQty, pantryItem.unit, reqItem.name);
                    const recipeNormalized = normalizeQuantity(recipeQty, reqItem.unit, reqItem.name);

                    if (pantryNormalized < recipeNormalized) {
                        missingItems.push(reqItem);
                    }
                }
            });

            if (missingItems.length > 0) {
                let message = `A következő hozzávalók hiányoznak vagy nincs belőlük elég a(z) ${recipe.name} recepthez:\n\n`;

                // Process missing items and add to shopping list
                for (const item of missingItems) {
                    message += `- ${item.name} (${item.quantity} ${item.unit})\\n`;

                    // Get category
                    let category = 'Egyéb';
                    const existingPantryItem = pantryItems.find(p => p.name && p.name.toLowerCase() === item.name.toLowerCase());
                    if (existingPantryItem && existingPantryItem.category !== 'Egyéb') {
                        category = existingPantryItem.category;
                    } else {
                        const keywordCategory = getCategoryFromKeywords(item.name.toLowerCase());
                        if (keywordCategory) {
                            category = keywordCategory;
                        } else {
                            const apiCategory = await fetchCategory(item.name);
                            if (apiCategory) {
                                category = apiCategory;
                            }
                        }
                    }

                    // Intelligens vásárlási mennyiség javaslat
                    const suggested = suggestShoppingQuantity(item.name, item.quantity, item.unit);

                    // Add to shopping list with suggested quantity
                    addToShoppingList({
                        name: item.name,
                        quantity: suggested.quantity,
                        unit: suggested.unit,
                        category: category
                    });
                }

                message += `\\nEzeket hozzáadtam a bevásárlólistához (javasolt vásárlási mennyiséggel).`;
                alert(message);
            } else {
                alert(`Minden hozzávaló megvan a(z) ${recipe.name} recepthez! Jó főzést! 👨‍🍳`);
            }
        } catch (error) {
            console.error('Error in checkRecipe:', error);
            alert('Hiba történt az ellenőrzés során: ' + error.message);
        } finally {
            // Restore button state
            checkRecipeBtn.innerHTML = originalBtnText;
            checkRecipeBtn.disabled = false;
        }
    }

    function openRecipeModal() {
        editingRecipeId = null;
        recipeModal.classList.remove('hidden');

        // Try to restore saved draft from sessionStorage
        const savedDraft = sessionStorage.getItem('recipeDraft');
        if (savedDraft) {
            try {
                const draft = JSON.parse(savedDraft);
                newRecipeNameInput.value = draft.name || '';
                recipeCategorySelect.value = draft.category || '';

                // Clear existing rows
                recipeIngredientsList.innerHTML = '';

                // Restore ingredients
                if (draft.ingredients && draft.ingredients.length > 0) {
                    draft.ingredients.forEach(ing => {
                        addIngredientRow(ing.name, ing.quantity, ing.unit);
                    });
                } else {
                    addIngredientRow(); // Add one empty row
                }
            } catch (e) {
                console.error('Failed to restore draft:', e);
                setupNewRecipeModal();
            }
        } else {
            setupNewRecipeModal();
        }

        // Auto-save on input changes
        enableAutoSave();
    }

    function setupNewRecipeModal() {
        newRecipeNameInput.value = '';
        recipeCategorySelect.value = '';
        recipeIngredientsList.innerHTML = '';
        addIngredientRow(); // Add one empty row by default
    }

    function enableAutoSave() {
        const autoSave = () => {
            const ingredients = [];
            const rows = recipeIngredientsList.querySelectorAll('.ingredient-row');
            rows.forEach(row => {
                const name = row.querySelector('.ing-name').value.trim();
                const quantity = parseFloat(row.querySelector('.ing-qty').value) || 0;
                const unit = row.querySelector('.ing-unit').value.trim();
                if (name) {
                    ingredients.push({ name, quantity, unit });
                }
            });

            const draft = {
                name: newRecipeNameInput.value.trim(),
                category: recipeCategorySelect.value,
                ingredients: ingredients
            };

            sessionStorage.setItem('recipeDraft', JSON.stringify(draft));
        };

        // Save on every input change
        newRecipeNameInput.addEventListener('input', autoSave);
        recipeCategorySelect.addEventListener('change', autoSave);

        // We need to add listeners to ingredient rows dynamically
        // Use event delegation on the parent container
        recipeIngredientsList.addEventListener('input', autoSave);
    }

    function closeRecipeModal() {
        recipeModal.classList.add('hidden');
        // Don't clear the draft here - only clear on successful save
    }

    function editRecipe() {
        const recipeId = parseInt(recipeSelect.value);
        if (!recipeId) {
            alert('Kérlek válassz egy receptet a szerkesztéshez!');
            return;
        }

        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe) return;

        editingRecipeId = recipeId;
        recipeModal.classList.remove('hidden');
        recipeIngredientsList.innerHTML = '';
        newRecipeNameInput.value = recipe.name;
        recipeCategorySelect.value = recipe.category || 'Egyéb';
        document.querySelector('.modal-header h2').textContent = 'Recept szerkesztése';

        recipe.ingredients.forEach(ing => {
            addIngredientRow(ing.name, ing.quantity, ing.unit);
        });
    }

    function cookRecipe() {
        const recipeId = parseInt(recipeSelect.value);
        if (!recipeId) {
            alert('Kérlek válassz egy receptet!');
            return;
        }

        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe) return;

        // Check availability first with unit conversion
        let missingItems = [];
        recipe.ingredients.forEach(reqItem => {
            const pantryItem = pantryItems.find(pItem => pItem.name.toLowerCase() === reqItem.name.toLowerCase());

            if (!pantryItem) {
                missingItems.push(reqItem);
            } else {
                // Use unit conversion for accurate comparison
                const pantryQty = parseFloat(pantryItem.quantity) || 0;
                const recipeQty = parseFloat(reqItem.quantity) || 0;

                const pantryNormalized = normalizeQuantity(pantryQty, pantryItem.unit, reqItem.name);
                const recipeNormalized = normalizeQuantity(recipeQty, reqItem.unit, reqItem.name);

                if (pantryNormalized < recipeNormalized) {
                    missingItems.push(reqItem);
                }
            }
        });

        if (missingItems.length > 0) {
            const proceed = confirm(`Figyelem! Néhány hozzávaló hiányzik vagy nincs elég belőle:\n${missingItems.map(i => `- ${i.name}`).join('\n')}\n\nEnnek ellenére elkészíted (levonod a készletből)?`);
            if (!proceed) return;
        }

        // Deduct ingredients with unit conversion
        recipe.ingredients.forEach(reqItem => {
            const pantryItem = pantryItems.find(pItem => pItem.name.toLowerCase() === reqItem.name.toLowerCase());
            if (pantryItem) {
                const pantryQty = parseFloat(pantryItem.quantity) || 0;
                const recipeQty = parseFloat(reqItem.quantity) || 0;

                // Convert recipe quantity to pantry units for deduction
                const pantryNormalized = normalizeQuantity(pantryQty, pantryItem.unit, reqItem.name);
                const recipeNormalized = normalizeQuantity(recipeQty, reqItem.unit, reqItem.name);

                // Calculate new quantity in original pantry units
                const newNormalized = pantryNormalized - recipeNormalized;
                const newQty = (newNormalized / normalizeQuantity(1, pantryItem.unit, reqItem.name));

                pantryItem.quantity = Math.max(0, newQty); // Don't go negative
            }
        });

        // Remove items with 0 quantity
        pantryItems = pantryItems.filter(item => parseFloat(item.quantity) > 0);

        saveData();
        renderItems();
        alert(`A(z) ${recipe.name} elkészítve! A hozzávalókat levontuk a kamrából.`);
    }

    function closeRecipeModal() {
        recipeModal.classList.add('hidden');
    }

    function addIngredientRow(name = '', qty = '', unit = '') {
        // If name is an event object, ignore it
        if (typeof name === 'object' && name !== null) {
            name = '';
            qty = '';
            unit = '';
        }

        const row = document.createElement('div');
        row.className = 'ingredient-row';
        row.innerHTML = `
            <input type="text" placeholder="Alapanyag" class="ing-name" value="${name}">
            <input type="number" placeholder="Menny." class="ing-qty" step="0.1" value="${qty}">
            <input type="text" placeholder="Egység" class="ing-unit" value="${unit}">
            <button class="btn-text remove-row">✕</button>
        `;

        row.querySelector('.remove-row').addEventListener('click', () => row.remove());
        recipeIngredientsList.appendChild(row);
    }

    function saveNewRecipe() {
        const name = newRecipeNameInput.value.trim();
        const category = recipeCategorySelect.value || 'Egyéb';

        if (!name) {
            alert('Add meg a recept nevét!');
            return;
        }

        const ingredients = [];
        const rows = recipeIngredientsList.querySelectorAll('.ingredient-row');

        rows.forEach(row => {
            const ingName = row.querySelector('.ing-name').value.trim();
            const ingQty = parseFloat(row.querySelector('.ing-qty').value);
            const ingUnit = row.querySelector('.ing-unit').value.trim();

            if (ingName && ingQty && ingUnit) {
                ingredients.push({
                    name: capitalizeFirstLetter(ingName),
                    quantity: ingQty,
                    unit: ingUnit
                });
            }
        });

        if (ingredients.length === 0) {
            alert('Adj hozzá legalább egy hozzávalót!');
            return;
        }

        if (editingRecipeId) {
            // Update existing
            const index = recipes.findIndex(r => r.id === editingRecipeId);
            if (index !== -1) {
                recipes[index] = {
                    id: editingRecipeId,
                    name,
                    category,
                    ingredients
                };
            }
        } else {
            // Create new
            const newRecipe = {
                id: Date.now(),
                name,
                category,
                ingredients
            };
            recipes.push(newRecipe);
        }
        saveData();
        renderRecipeSelect();
        closeRecipeModal();
        // Clear the draft after successful save
        sessionStorage.removeItem('recipeDraft');
        alert('Recept sikeresen mentve!');
    }

    // --- Helper Functions ---

    // Normalize quantities to comparable units (grams for solids, ml for liquids)
    function normalizeQuantity(quantity, unit, itemName) {
        const qty = parseFloat(quantity) || 0;
        const unitLower = (unit || '').toLowerCase().trim();
        const nameLower = (itemName || '').toLowerCase();

        // Determine if item is liquid or solid
        const isLiquid = nameLower.includes('tej') || nameLower.includes('víz') ||
            nameLower.includes('olaj') || nameLower.includes('lé') ||
            unitLower.includes('liter') || unitLower.includes('ml') || unitLower.includes('dl');

        if (isLiquid) {
            // Convert to ml (milliliters)
            if (unitLower === 'liter' || unitLower === 'l') return qty * 1000;
            if (unitLower === 'dl') return qty * 100;
            if (unitLower === 'ml') return qty;
            return qty; // Unknown unit, assume ml
        } else {
            // Convert to grams
            if (unitLower === 'kg' || unitLower === 'kilogramm') return qty * 1000;
            if (unitLower === 'g' || unitLower === 'gramm') return qty;
            if (unitLower === 'dkg' || unitLower === 'dekagramm') return qty * 10;

            // Approximate conversions for tablespoons/teaspoons (very rough!)
            if (unitLower === 'ek' || unitLower === 'evőkanál') {
                // 1 tablespoon ≈ 15g (varies by ingredient, but this is rough)
                return qty * 15;
            }
            if (unitLower === 'tk' || unitLower === 'teáskanál') {
                // 1 teaspoon ≈ 5g
                return qty * 5;
            }
            if (unitLower === 'csipet') {
                // 1 pinch ≈ 1g
                return qty;
            }

            // For pieces (db), return as-is for comparison
            if (unitLower === 'db' || unitLower === 'darab') return qty;

            return qty; // Unknown unit, return as-is
        }
    }

    function capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Intelligens vásárlási mennyiség javaslat (helyettesíti az AI backend-et)
    function suggestShoppingQuantity(ingredientName, recipeQuantity, recipeUnit) {
        const name = ingredientName.toLowerCase();

        // Alapértelmezett tipikus vásárlási mennyiségek
        const typicalQuantities = {
            // Száraz alapanyagok (általában kg-ban kaphatók)
            'cukor': { quantity: 1, unit: 'kg' },
            'liszt': { quantity: 1, unit: 'kg' },
            'rizs': { quantity: 1, unit: 'kg' },
            'só': { quantity: 1, unit: 'kg' },
            'búzadara': { quantity: 500, unit: 'g' },
            'zabpehely': { quantity: 500, unit: 'g' },

            // Tejtermékek (literben/gramban)
            'tej': { quantity: 1, unit: 'l' },
            'tejföl': { quantity: 200, unit: 'g' },
            'joghurt': { quantity: 150, unit: 'g' },
            'vaj': { quantity: 250, unit: 'g' },
            'margarin': { quantity: 250, unit: 'g' },
            'sajt': { quantity: 200, unit: 'g' },

            // Tojás - 6 vagy 10 db a mennyiségtől függően
            'tojás': null, // Külön kezelés lentebb

            // Olajok
            'olaj': { quantity: 1, unit: 'l' },
            'olivaolaj': { quantity: 500, unit: 'ml' },

            // Fűszerek (csomag)
            'őrölt': { quantity: 1, unit: 'csomag' },
            'fahéj': { quantity: 1, unit: 'csomag' },
            'bors': { quantity: 1, unit: 'csomag' },
            'paprika': { quantity: 1, unit: 'csomag' },
            'köménymag': { quantity: 1, unit: 'csomag' },
            'vanília': { quantity: 1, unit: 'csomag' },
            'vaníliacukor': { quantity: 1, unit: 'csomag' },
            'sütőpor': { quantity: 1, unit: 'csomag' },
            'szódabikarbóna': { quantity: 1, unit: 'csomag' },

            // Egyéb
            'kakaó': { quantity: 100, unit: 'g' },
            'csoki': { quantity: 100, unit: 'g' },
            'csokoládé': { quantity: 100, unit: 'g' },
            'mazsola': { quantity: 200, unit: 'g' },
            'dió': { quantity: 200, unit: 'g' },
            'mandula': { quantity: 200, unit: 'g' }
        };

        // Tojás speciális kezelés
        if (name.includes('tojás')) {
            const qty = parseFloat(recipeQuantity) || 1;
            if (qty <= 6) {
                return { quantity: 6, unit: 'db' };
            } else {
                return { quantity: 10, unit: 'db' };
            }
        }

        // Keresés kulcsszavak alapján
        for (const [keyword, suggestion] of Object.entries(typicalQuantities)) {
            if (suggestion && name.includes(keyword)) {
                return suggestion;
            }
        }

        // Ha nem találunk egyezést, próbáljunk kategória alapján következtetni
        if (recipeUnit === 'g' || recipeUnit === 'dkg' || recipeUnit === 'kg') {
            // Száraz alapanyag - javasoljunk 500g vagy 1kg-ot
            if (recipeQuantity < 500) {
                return { quantity: 500, unit: 'g' };
            } else {
                return { quantity: 1, unit: 'kg' };
            }
        }

        if (recipeUnit === 'ml' || recipeUnit === 'dl' || recipeUnit === 'l') {
            // Folyékony - javasoljunk 500ml vagy 1l-t  
            if (recipeQuantity < 500) {
                return { quantity: 500, unit: 'ml' };
            } else {
                return { quantity: 1, unit: 'l' };
            }
        }

        // Alapértelmezett: használjuk a recept mennyiségét
        return { quantity: recipeQuantity, unit: recipeUnit };
    }


    // --- Helper Functions ---


    function updateCategoryDatalist() {
        const datalist = document.getElementById('categories');
        const defaultCategories = [
            'Tészták', 'Gabonafélék', 'Fűszerek', 'Zöldségek', 'Gyümölcsök',
            'Konzervek', 'Tejtermékek', 'Pékáru', 'Húsok', 'Nasi', 'Italok', 'Egyéb'
        ];

        // Get all unique categories from pantry items
        const usedCategories = pantryItems.map(item => item.category);

        // Merge and deduplicate
        const allCategories = [...new Set([...defaultCategories, ...usedCategories])].sort();

        datalist.innerHTML = '';
        allCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            datalist.appendChild(option);
        });
    }

    // Helper: Get category from Hungarian keywords
    function getCategoryFromKeywords(name) {
        const keywords = {
            'konzerv': 'Konzervek', 'püré': 'Konzervek', 'befőtt': 'Konzervek',
            'tej': 'Tejtermékek', 'vaj': 'Tejtermékek', 'sajt': 'Tejtermékek', 'joghurt': 'Tejtermékek', 'tejföl': 'Tejtermékek', 'túró': 'Tejtermékek',
            'kenyér': 'Pékáru', 'zsemle': 'Pékáru', 'kifli': 'Pékáru', 'kalács': 'Pékáru',
            'alma': 'Gyümölcsök', 'körte': 'Gyümölcsök', 'banán': 'Gyümölcsök', 'narancs': 'Gyümölcsök', 'citrom': 'Gyümölcsök',
            'répa': 'Zöldségek', 'krumpli': 'Zöldségek', 'burgonya': 'Zöldségek', 'hagyma': 'Zöldségek', 'paradicsom': 'Zöldségek', 'paprika': 'Zöldségek', 'uborka': 'Zöldségek', 'kukorica': 'Zöldségek',
            'csirke': 'Húsok', 'sertés': 'Húsok', 'marha': 'Húsok', 'sonka': 'Húsok', 'kolbász': 'Húsok', 'szalámi': 'Húsok', 'hús': 'Húsok', 'darálthús': 'Húsok', 'bacon': 'Húsok', 'virsli': 'Húsok',
            'tészta': 'Tészták', 'spagetti': 'Tészták', 'penne': 'Tészták', 'csiga': 'Tészták', 'metélt': 'Tészták',
            'rizs': 'Gabonafélék', 'tarhonya': 'Gabonafélék', 'kuszkusz': 'Gabonafélék', 'bulgur': 'Gabonafélék', 'köles': 'Gabonafélék', 'hajdina': 'Gabonafélék', 'zab': 'Gabonafélék', 'müzli': 'Gabonafélék', 'pehely': 'Gabonafélék', 'dara': 'Gabonafélék', 'lencse': 'Gabonafélék', 'bab': 'Gabonafélék',
            'liszt': 'Sütés', 'cukor': 'Sütés', 'só': 'Fűszerek', 'bors': 'Fűszerek', 'paprika': 'Fűszerek',
            'víz': 'Italok', 'üdítő': 'Italok', 'sör': 'Italok', 'bor': 'Italok',
            'chips': 'Nasi', 'ropi': 'Nasi', 'keksz': 'Nasi', 'csoki': 'Nasi', 'snack': 'Nasi', 'popcorn': 'Nasi', 'nápolyi': 'Nasi', 'cukorka': 'Nasi'
        };

        // Check for specific canned/preserved keywords first
        if (name.includes('konzerv') || name.includes('püré') || name.includes('befőtt')) {
            return 'Konzervek';
        }

        for (const [key, category] of Object.entries(keywords)) {
            if (name.includes(key)) {
                return category;
            }
        }
        return null;
    }

    // Helper: Get category from API tags
    function getCategoryFromApiTags(tags) {
        const categoryMap = {
            'en:dairies': 'Tejtermékek',
            'en:cheeses': 'Tejtermékek',
            'en:milks': 'Tejtermékek',
            'en:yogurts': 'Tejtermékek',
            'en:meats': 'Húsok',
            'en:poultries': 'Húsok',
            'en:fishes': 'Húsok',
            'en:seafood': 'Húsok',
            'en:fresh-vegetables': 'Zöldségek',
            'en:vegetables': 'Zöldségek',
            'en:fruits': 'Gyümölcsök',
            'en:fresh-fruits': 'Gyümölcsök',
            'en:beverages': 'Italok',
            'en:carbonated-drinks': 'Italok',
            'en:fruit-juices': 'Italok',
            'en:breads': 'Pékáru',
            'en:sandwiches': 'Pékáru',
            'en:biscuits': 'Nasi',
            'en:snacks': 'Nasi',
            'en:salty-snacks': 'Nasi',
            'en:sweet-snacks': 'Nasi',
            'en:canned-foods': 'Konzervek',
            'en:condiments': 'Fűszerek',
            'en:spices': 'Fűszerek',
            'en:sauces': 'Fűszerek',
            'en:pastas': 'Tészták',
            'en:cereals': 'Gabonafélék',
            'en:grains': 'Gabonafélék',
            'en:legumes': 'Gabonafélék',
            'en:rice': 'Gabonafélék'
        };

        for (const tag of tags) {
            if (categoryMap[tag]) return categoryMap[tag];

            // Priority Order
            if (tag.includes('dairy') || tag.includes('cheese') || tag.includes('yogurt') || tag.includes('milk')) return 'Tejtermékek';
            if (tag.includes('meat') || tag.includes('ham') || tag.includes('sausage') || tag.includes('poultry') || tag.includes('fish') || tag.includes('seafood')) return 'Húsok';
            if (tag.includes('bread') || tag.includes('biscuit') || tag.includes('sandwich')) return 'Pékáru';
            if (tag.includes('fruit') && !tag.includes('fruit-juices')) return 'Gyümölcsök';
            if (tag.includes('vegetables')) return 'Zöldségek';
            if (tag.includes('beverages') || tag.includes('drinks') || tag.includes('juices') || tag.includes('water')) return 'Italok';
            if (tag.includes('pasta')) return 'Tészták';
            if (tag.includes('cereal') || tag.includes('rice') || tag.includes('grain') || tag.includes('legume')) return 'Gabonafélék';
        }
        return null;
    }

    // Helper: Fetch category from API
    async function fetchCategory(name) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

        try {
            const response = await fetch(`https://hu.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=1`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const data = await response.json();
            if (data.products && data.products.length > 0) {
                const tags = data.products[0].categories_tags || [];
                return getCategoryFromApiTags(tags);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('Fetch category timed out for:', name);
            } else {
                console.error('Error fetching category:', error);
            }
        } finally {
            clearTimeout(timeoutId);
        }
        return null;
    }


    // Debounce utility
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    const debouncedFetchCategory = debounce(async (name) => {
        if (name.length < 3) return;
        const category = await fetchCategory(name);
        if (category) {
            itemCategoryInput.value = category;
        }
    }, 500);

    // AI kategorizálás kikapcsolva (nincs backend)
    function suggestCategory() {
        const name = itemNameInput.value.toLowerCase().trim();
        if (name.length < 2) return;

        // Használjuk csak a lokális kulcsszavakat
        let category = getCategoryFromKeywords(name);

        if (category) {
            itemCategoryInput.value = category;
        }
    }

    // Local recipe category keywords (fast lookup)
    function getRecipeCategoryFromKeywords(name) {
        const lower = name.toLowerCase();

        // Levesek
        if (lower.includes('leves') || lower.includes('gulyás') || lower.includes('pörkölt') ||
            lower.includes('soup') || lower.includes('ragu')) {
            return 'Levesek';
        }

        // Tésztás ételek
        if (lower.includes('tészta') || lower.includes('spагetti') || lower.includes('lasagne') ||
            lower.includes('penne') || lower.includes('pasta') || lower.includes('makaróni') ||
            lower.includes('pizza')) {
            return 'Tésztás ételek';
        }

        // Főzelékek
        if (lower.includes('főzelék') || lower.includes('borsó') || lower.includes('spenót') ||
            lower.includes('tök') || lower.includes('káposzta')) {
            return 'Főzelékek';
        }

        // Húsos ételek
        if (lower.includes('csirke') || lower.includes('hús') || lower.includes('marhа') ||
            lower.includes('sertés') || lower.includes('bárány') || lower.includes('hal') ||
            lower.includes('rántott') || lower.includes('pecsenye') || lower.includes('szelet')) {
            return 'Húsos ételek';
        }

        // Köretek
        if (lower.includes('rizs') || lower.includes('burgonya') || lower.includes('krumpli') ||
            lower.includes('hasábburgonya') || lower.includes('püré')) {
            return 'Köretek';
        }

        // Desszertek
        if (lower.includes('torta') || lower.includes('süti') || lower.includes('palacsinta') ||
            lower.includes('rétes') || lower.includes('pite') || lower.includes('desszert') ||
            lower.includes('fagylalt') || lower.includes('puding') || lower.includes('krémes') ||
            lower.includes('brownie') || lower.includes('muffin') || lower.includes('sütemény')) {
            return 'Desszertek';
        }

        return null;
    }

    function suggestRecipeCategory() {
        const name = newRecipeNameInput.value.trim();
        if (!name || name.length < 3) return;

        // Használjuk csak a lokális kulcsszavakat (nincs AI backend)
        const category = getRecipeCategoryFromKeywords(name);
        if (category) {
            recipeCategorySelect.value = category;
        }
    }

    // --- Inspiration Functions ---

    // Hungarian meal name translations
    const mealTranslations = {
        'Beef and Mustard Pie': 'Marhahús-mustáros pite',
        'Chicken Alfredo Primavera': 'Alfredo csirke zöldségekkel',
        'Corba': 'Korba leves',
        'Dal fry': 'Dal curry',
        'Honey Teriyaki Salmon': 'Mézes teriyaki lazac',
        'Kedgeree': 'Kedgeree (Hal-rizs)',
        'Lamb Biryani': 'Bárány biryani',
        'Lasag ne': 'Lasagne',
        'Massaman Beef curry': 'Massaman marhacurry',
        'Piri-piri chicken and slaw': 'Piri-piri csirke káposztasalátával',
        'Recheado Masala Fish': 'Recheado fűszeres hal',
        'Spaghetti Bolognese': 'Bolognai spagetti',
        'Tandoori chicken': 'Tandoori csirke',
        'Thai Green Curry': 'Thai zöld curry',
        'Tuna Nicoise': 'Tonnhalas niçoise saláta',
        // Add more as needed
    };

    async function generateAiRecipe() {
        if (pantryItems.length === 0) {
            alert('A kamra üres! Adj hozzá alapanyagokat először.');
            return;
        }

        inspirationResult.classList.remove('hidden');
        inspirationDish.textContent = 'Az AI séf gondolkodik... 🤖';
        inspirationDetails.innerHTML = '<div class="skeleton-loader"><div class="skeleton-item"></div><div class="skeleton-item"></div></div>';

        inspirationDish.textContent = 'Hiba történt 😕';
        inspirationDetails.innerHTML = `<p>A receptgenerálás funkció jelenleg nem elérhető.</p>`;
    }

    async function generateInspiration(silent = false) {
        const originalBtnContent = generateInspirationBtn.innerHTML;
        // Hourglass/Loading icon
        generateInspirationBtn.innerHTML = '<svg class="icon spinning" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4"></path><path d="M12 18v4"></path><path d="M4.93 4.93l2.83 2.83"></path><path d="M16.24 16.24l2.83 2.83"></path><path d="M2 12h4"></path><path d="M18 12h4"></path><path d="M4.93 19.07l2.83-2.83"></path><path d="M16.24 7.76l2.83-2.83"></path></svg>';
        generateInspirationBtn.disabled = true;
        inspirationResult.classList.add('hidden');

        try {
            // 1. Fetch random meal from TheMealDB API
            const response = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
            const data = await response.json();

            if (data.meals && data.meals.length > 0) {
                const meal = data.meals[0];
                let name = meal.strMeal;
                let category = meal.strCategory;
                const image = meal.strMealThumb;

                // 2. Translate Name and Category using local dictionary
                name = mealTranslations[name] || name; // Fallback to local dictionary if available

                // Display result
                inspirationDish.textContent = '';

                let html = `
                    <div class="random-recipe-card">
                        <div class="recipe-image-wrapper">
                            <img src="${image}" alt="${name}" class="recipe-image">
                        </div>
                        <div class="recipe-info">
                            <h3>${name}</h3>
                            <p class="recipe-category"><strong>Kategória:</strong> ${category}</p>
                            <a href="${meal.strSource || '#'}" target="_blank" class="recipe-link">
                                Recept <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </a>
                        </div>
                    </div>
                `;

                inspirationDetails.innerHTML = html;
                inspirationResult.classList.remove('hidden');
            } else {
                if (!silent) alert('Nem sikerült ételt találni. Próbáld újra!');
            }
        } catch (error) {
            console.error('Error generating inspiration:', error);
            if (!silent) alert('Hiba történt az inspiráció generálása során.');
        } finally {
            generateInspirationBtn.innerHTML = originalBtnContent;
            generateInspirationBtn.disabled = false;
        }
    }


    // Barcode Scanner Logic
    const scanBtn = document.getElementById('scan-btn');
    const scannerModal = document.getElementById('scanner-modal');
    const closeScannerBtn = document.getElementById('close-scanner-btn');
    let html5QrcodeScanner = null;

    if (scanBtn) {
        scanBtn.addEventListener('click', () => {
            scannerModal.classList.remove('hidden');
            startScanner();
        });
    }

    if (closeScannerBtn) {
        closeScannerBtn.addEventListener('click', () => {
            stopScanner();
            scannerModal.classList.add('hidden');
        });
    }

    function startScanner() {
        if (html5QrcodeScanner) {
            // Already running
            return;
        }

        html5QrcodeScanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
        );

        html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    }

    function stopScanner() {
        if (html5QrcodeScanner) {
            html5QrcodeScanner.clear().then(() => {
                html5QrcodeScanner = null;
            }).catch((error) => {
                console.error("Failed to clear html5QrcodeScanner. ", error);
            });
        }
    }

    async function onScanSuccess(decodedText, decodedResult) {
        // Handle the scanned code
        console.log(`Code matched = ${decodedText}`, decodedResult);

        // Stop scanning
        stopScanner();
        scannerModal.classList.add('hidden');

        // Query OpenFoodFacts
        try {
            const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${decodedText}.json`);
            const data = await response.json();

            if (data.status === 1) {
                const product = data.product;
                console.log('Product data:', product); // Debug log

                const productName = product.product_name_hu ||
                    product.product_name ||
                    product.generic_name_hu ||
                    product.generic_name ||
                    product.product_name_en;

                if (productName) {
                    document.getElementById('item-name').value = productName;
                    // Trigger category suggestion
                    suggestCategory(productName);

                } else {
                    alert('Termék neve nem található.');
                }
            } else {
                alert('Termék nem található az adatbázisban.');
            }
        } catch (error) {
            console.error('Error fetching product data:', error);
            alert('Hiba történt a termék keresése közben.');
        }
    }

    function onScanFailure(error) {
        // handle scan failure, usually better to ignore and keep scanning.
        // for example:
        // console.warn(`Code scan error = ${error}`);
    }

    // ===== FIREBASE AUTHENTICATION & DATABASE =====

    function initializeAuth() {
        // Check if Firebase is loaded
        if (!window.firebaseAuth) {
            console.error('Firebase not loaded yet');
            setTimeout(initializeAuth, 100);
            return;
        }

        // Login button handler
        loginBtn.addEventListener('click', handleLogin);

        // Logout button handler
        logoutBtn.addEventListener('click', handleLogout);

        // Listen to auth state changes
        window.firebaseOnAuthStateChanged(window.firebaseAuth, (user) => {
            if (user) {
                // User is signed in
                currentUser = user;
                showUserInfo(user);
                loadDataFromFirebase();
                setupRealtimeSync();
            } else {
                // User is signed out
                currentUser = null;
                showLoginButton();
                clearData();
            }
        });
    }

    async function handleLogin() {
        try {
            const provider = new window.firebaseGoogleProvider();
            const result = await window.firebaseSignInWithPopup(window.firebaseAuth, provider);
            console.log('Logged in:', result.user.displayName);
        } catch (error) {
            console.error('Login error:', error);
            alert('Bejelentkezési hiba: ' + error.message);
        }
    }

    async function handleLogout() {
        try {
            await window.firebaseSignOut(window.firebaseAuth);
            console.log('Logged out');
        } catch (error) {
            console.error('Logout error:', error);
            alert('Kijelentkezési hiba: ' + error.message);
        }
    }

    function showUserInfo(user) {
        loginBtn.classList.add('hidden');
        userInfo.classList.remove('hidden');
        userName.textContent = user.displayName || user.email;
        userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
    }

    function showLoginButton() {
        loginBtn.classList.remove('hidden');
        userInfo.classList.add('hidden');
    }

    function clearData() {
        pantryItems = [];
        shoppingList = [];
        recipes = [];
        renderItems();
        renderShoppingList();
        renderRecipeSelect();
    }

    async function loadDataFromFirebase() {
        if (!currentUser) return;

        try {
            const userRef = window.firebaseRef(window.firebaseDatabase, `users/${currentUser.uid}`);
            const snapshot = await window.firebaseGet(userRef);

            if (snapshot.exists()) {
                const data = snapshot.val();
                pantryItems = data.pantryItems || [];
                shoppingList = data.shoppingList || [];
                recipes = data.recipes || [];
            } else {
                // First time user - initialize empty data
                pantryItems = [];
                shoppingList = [];
                recipes = [];
            }

            renderItems();
            renderShoppingList();
            renderRecipeSelect();
            updateCategoryDatalist();
        } catch (error) {
            console.error('Error loading data from Firebase:', error);
            alert('Hiba az adatok betöltésekor: ' + error.message);
        }
    }

    let isSavingLocally = false; // Flag to prevent re-render during local saves

    function setupRealtimeSync() {
        if (!currentUser) return;

        const userRef = window.firebaseRef(window.firebaseDatabase, `users/${currentUser.uid}`);

        // Listen for real-time updates
        window.firebaseOnValue(userRef, (snapshot) => {
            // Skip update if we're currently saving locally
            if (isSavingLocally) {
                return;
            }

            if (snapshot.exists()) {
                const data = snapshot.val();
                pantryItems = data.pantryItems || [];
                shoppingList = data.shoppingList || [];
                recipes = data.recipes || [];

                renderItems();
                renderShoppingList();
                renderRecipeSelect();
                updateCategoryDatalist();
            }
        });
    }

    async function saveDataToFirebase() {
        if (!currentUser) {
            console.warn('No user logged in, cannot save data');
            return;
        }

        try {
            // Set flag to prevent real-time listener from re-rendering
            isSavingLocally = true;

            const userRef = window.firebaseRef(window.firebaseDatabase, `users/${currentUser.uid}`);
            await window.firebaseSet(userRef, {
                pantryItems,
                shoppingList,
                recipes,
                lastUpdated: new Date().toISOString()
            });
            console.log('Data saved to Firebase');
        } catch (error) {
            console.error('Error saving data to Firebase:', error);
            alert('Hiba az adatok mentésekor: ' + error.message);
        } finally {
            // Reset flag after save completes (with small delay to ensure Firebase processes it)
            setTimeout(() => {
                isSavingLocally = false;
            }, 100);
        }
    }

    // Replace old loadData and saveData functions
    async function loadData() {
        // This function is now handled by Firebase auth state listener
        // Keep it for compatibility but it does nothing
        console.log('loadData called - handled by Firebase');
    }

    function saveData() {
        // Debounce saves to Firebase
        if (saveData.timeout) clearTimeout(saveData.timeout);
        saveData.timeout = setTimeout(() => {
            saveDataToFirebase();
        }, 1000);
    }
});
