/**
 * VclouD 2.0 - Main Application
 * Каталог товарів з фільтрацією та пошуком
 */

// API URL — сервер на Render
const API_URL = 'https://vcloud-admin-server.onrender.com';

// State
let products = [];
let filteredProducts = [];
let currentPage = 1;
const PRODUCTS_PER_PAGE = 24;
let currentCategory = 'all';

// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const productsCount = document.getElementById('productsCount');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const loadMoreBtn = document.getElementById('loadMore');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    productsGrid.innerHTML = '<p style="color:#aaa;padding:40px;text-align:center;">⏳ Завантажую товари...</p>';
    try {
        const res = await fetch(`${API_URL}/api/public/products`);
        if (!res.ok) throw new Error('API error ' + res.status);
        const data = await res.json();
        products = data.products || [];
        console.log(`Loaded ${products.length} products from API`);
    } catch (err) {
        console.warn('API недоступне, використовую локальний products.js:', err.message);
        // Fallback до статичного файлу
        if (typeof window._staticProducts !== 'undefined') {
            products = window._staticProducts;
        } else {
            products = typeof window.products !== 'undefined' ? window.products : [];
        }
    }

    if (!products.length) {
        productsGrid.innerHTML = '<p style="color:#fff;padding:40px;text-align:center;">Товарів ще немає</p>';
        return;
    }

    filteredProducts = [...products];
    initEventListeners();
    applyFilters();
});

// Initialize event listeners
function initEventListeners() {
    // Search
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            currentPage = 1;
            applyFilters();
        }, 300));
    }

    // Sort
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            currentPage = 1;
            applyFilters();
        });
    }

    // Nav category links
    document.querySelectorAll('.nav-link[data-cat]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            currentCategory = link.dataset.cat;
            currentPage = 1;
            
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            applyFilters();
        });
    });
}

// Apply filters and render
function applyFilters() {
    const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const sortBy = sortSelect ? sortSelect.value : 'newest';

    // Filter
    filteredProducts = products.filter(product => {
        // Search - шукаємо по title, brand, description
        if (searchQuery) {
            const title = (product.title || '').toLowerCase();
            const brand = (product.brand || '').toLowerCase();
            const desc = (product.description || '').toLowerCase();
            
            if (!title.includes(searchQuery) && 
                !brand.includes(searchQuery) &&
                !desc.includes(searchQuery)) {
                return false;
            }
        }

        // Category
        if (currentCategory !== 'all' && product.category !== currentCategory) {
            return false;
        }

        return true;
    });

    // Sort
    filteredProducts.sort((a, b) => {
        switch (sortBy) {
            case 'price-asc':
                return (a.price || 0) - (b.price || 0);
            case 'price-desc':
                return (b.price || 0) - (a.price || 0);
            case 'name':
                return (a.title || '').localeCompare(b.title || '', 'uk');
            case 'newest':
            default:
                return (b.id || 0) - (a.id || 0);
        }
    });

    renderProducts();
}

// Render products
function renderProducts() {
    const start = 0;
    const end = currentPage * PRODUCTS_PER_PAGE;
    const productsToShow = filteredProducts.slice(start, end);

    if (productsToShow.length === 0) {
        productsGrid.innerHTML = '<p class="no-products">Товарів не знайдено</p>';
    } else {
        productsGrid.innerHTML = productsToShow.map(product => createProductCard(product)).join('');
    }
    
    // Update count
    if (productsCount) {
        productsCount.textContent = `(${filteredProducts.length})`;
    }

    // Show/hide load more
    if (loadMoreBtn) {
        if (end >= filteredProducts.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'flex';
        }
    }
}

// Create product card HTML
function createProductCard(product) {
    const imageUrl = product.image || 
        (product.images && product.images[0]) || 
        'https://via.placeholder.com/300x225?text=No+Image';
    
    const categoryIcons = {
        'clothing': '👕',
        'electronics': '📱',
        'accessories': '👜',
        'shoes': '👟',
        'other': '📦'
    };
    const categoryIcon = categoryIcons[product.category] || '📦';
    
    const priceFormatted = formatPrice(product.price, product.currency);
    const brandDisplay = product.brand || '';
    
    return `
        <a href="product.html?id=${product.id}" class="product-card">
            <div class="product-card-image">
                <img src="${imageUrl}" alt="${product.title}" loading="lazy" 
                     onerror="this.src='https://via.placeholder.com/300x225?text=No+Image'">
                ${product.olxUrl ? '<span class="product-badge olx">OLX</span>' : ''}
                ${product.images && product.images.length > 1 ? `<span class="product-badge photos">${product.images.length} 📷</span>` : ''}
            </div>
            <div class="product-card-content">
                <h3 class="product-card-title">${product.title}</h3>
                <div class="product-card-price">${priceFormatted}</div>
                ${brandDisplay ? `<div class="product-card-brand">${categoryIcon} ${brandDisplay}</div>` : ''}
            </div>
        </a>
    `;
}

// Format price
function formatPrice(price, currency = 'UAH') {
    if (!price || price === 0) return 'Ціна договірна';
    
    const formatted = new Intl.NumberFormat('uk-UA').format(price);
    
    switch (currency) {
        case 'USD':
            return `$${formatted}`;
        case 'EUR':
            return `€${formatted}`;
        default:
            return `${formatted} ₴`;
    }
}

// Load more products
function loadMore() {
    currentPage++;
    renderProducts();
    
    // Scroll to new products
    setTimeout(() => {
        const cards = productsGrid.querySelectorAll('.product-card');
        const newFirstCard = cards[(currentPage - 1) * PRODUCTS_PER_PAGE];
        if (newFirstCard) {
            newFirstCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

// Debounce helper
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
