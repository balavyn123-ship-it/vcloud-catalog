/**
 * VclouD 2.0 - Product Page
 * Сторінка товару з галереєю фото
 */

// Config
const TELEGRAM_USERNAME = 'your_telegram'; // Заміни на свій username

// State
let currentProduct = null;
let currentImageIndex = 0;
let productImages = [];

// DOM Elements
const mainImage = document.getElementById('mainImage');
const thumbnails = document.getElementById('thumbnails');
const titleEl = document.getElementById('title');
const priceEl = document.getElementById('price');
const descriptionEl = document.getElementById('description');
const brandEl = document.getElementById('brand');
const categoryEl = document.getElementById('category');
const telegramBtn = document.getElementById('telegramBtn');
const olxBtn = document.getElementById('olxBtn');
const similarProducts = document.getElementById('similarProducts');
const categoryLink = document.getElementById('categoryLink');
const productName = document.getElementById('productName');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProduct();
});

// Get product by ID
function getProductById(id) {
    if (typeof products === 'undefined' || !products.length) {
        console.error('Products not loaded');
        return null;
    }
    return products.find(p => p.id == id);
}

// Load product from URL
function loadProduct() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        showError('Товар не знайдено');
        return;
    }

    currentProduct = getProductById(productId);

    if (!currentProduct) {
        showError('Товар не знайдено (ID: ' + productId + ')');
        return;
    }

    renderProduct();
    renderSimilarProducts();
}

// Render product details
function renderProduct() {
    const product = currentProduct;

    // Page title
    document.title = `${product.title} - VclouD`;

    // Breadcrumbs
    const categoryNames = {
        'clothing': 'Одяг',
        'electronics': 'Техніка',
        'accessories': 'Аксесуари',
        'shoes': 'Взуття',
        'other': 'Інше'
    };
    const categoryName = categoryNames[product.category] || 'Інше';
    
    if (categoryLink) {
        categoryLink.textContent = categoryName;
        categoryLink.href = `index.html?cat=${product.category}`;
    }
    if (productName) {
        productName.textContent = product.title.slice(0, 40) + (product.title.length > 40 ? '...' : '');
    }

    // Title
    if (titleEl) titleEl.textContent = product.title;

    // Price
    if (priceEl) priceEl.innerHTML = formatPrice(product.price, product.currency);

    // Brand & Category
    if (brandEl) {
        const brandSpan = brandEl.querySelector('span');
        if (brandSpan) brandSpan.textContent = product.brand || 'Не вказано';
    }
    if (categoryEl) {
        const catSpan = categoryEl.querySelector('span');
        if (catSpan) catSpan.textContent = categoryName;
    }

    // Description
    if (descriptionEl) {
        let desc = product.description || 'Опис відсутній';
        // Форматуємо опис - розбиваємо на абзаци
        desc = desc.replace(/\.\s*/g, '.\n\n');
        descriptionEl.innerHTML = desc.split('\n\n').map(p => `<p>${p}</p>`).join('');
    }

    // Gallery
    renderGallery();

    // Telegram button
    if (telegramBtn) {
        const telegramMessage = encodeURIComponent(`Привіт! Цікавить товар: ${product.title}\n${window.location.href}`);
        telegramBtn.href = `https://t.me/${TELEGRAM_USERNAME}?text=${telegramMessage}`;
    }

    // OLX button
    if (olxBtn) {
        if (product.olxUrl) {
            olxBtn.style.display = 'inline-flex';
            olxBtn.href = product.olxUrl;
            olxBtn.target = '_blank';
        } else {
            olxBtn.style.display = 'none';
        }
    }
}

// Render gallery
function renderGallery() {
    const product = currentProduct;
    
    // Collect all images
    productImages = [];
    
    if (product.images && product.images.length > 0) {
        productImages = product.images;
    } else if (product.image) {
        productImages = [product.image];
    }
    
    if (productImages.length === 0) {
        productImages = ['https://via.placeholder.com/600x450?text=No+Image'];
    }

    currentImageIndex = 0;
    updateMainImage();

    // Render thumbnails
    if (thumbnails) {
        thumbnails.innerHTML = productImages.map((img, index) => `
            <div class="thumbnail ${index === 0 ? 'active' : ''}" onclick="selectImage(${index})">
                <img src="${img}" alt="Фото ${index + 1}" 
                     onerror="this.src='https://via.placeholder.com/100x75?text=Error'">
            </div>
        `).join('');
    }
}

// Update main image
function updateMainImage() {
    if (mainImage && productImages.length > 0) {
        mainImage.src = productImages[currentImageIndex];
        mainImage.alt = currentProduct.title;
        mainImage.onerror = function() {
            this.src = 'https://via.placeholder.com/600x450?text=Image+Error';
        };
    }

    // Update active thumbnail
    if (thumbnails) {
        const thumbs = thumbnails.querySelectorAll('.thumbnail');
        thumbs.forEach((thumb, index) => {
            thumb.classList.toggle('active', index === currentImageIndex);
        });
    }
}

// Select image
function selectImage(index) {
    currentImageIndex = index;
    updateMainImage();
}

// Next/Prev image
function nextImage() {
    currentImageIndex = (currentImageIndex + 1) % productImages.length;
    updateMainImage();
}

function prevImage() {
    currentImageIndex = (currentImageIndex - 1 + productImages.length) % productImages.length;
    updateMainImage();
}

// Format price
function formatPrice(price, currency = 'UAH') {
    if (!price || price === 0) return '<span class="price-negotiable">Ціна договірна</span>';
    
    const formatted = new Intl.NumberFormat('uk-UA').format(price);
    
    switch (currency) {
        case 'USD':
            return `<span class="price-value">$${formatted}</span>`;
        case 'EUR':
            return `<span class="price-value">€${formatted}</span>`;
        default:
            return `<span class="price-value">${formatted} ₴</span>`;
    }
}

// Render similar products
function renderSimilarProducts() {
    if (!similarProducts || !currentProduct) return;

    // Find similar by category and brand
    const similar = products.filter(p => 
        p.id !== currentProduct.id && 
        (p.category === currentProduct.category || p.brand === currentProduct.brand)
    ).slice(0, 4);

    if (similar.length === 0) {
        similarProducts.innerHTML = '<p style="color: var(--text-muted);">Схожих товарів не знайдено</p>';
        return;
    }

    similarProducts.innerHTML = similar.map(product => {
        const imageUrl = product.image || (product.images && product.images[0]) || 'https://via.placeholder.com/300x225';
        const priceFormatted = formatPriceSimple(product.price, product.currency);
        
        return `
            <a href="product.html?id=${product.id}" class="product-card">
                <div class="product-card-image">
                    <img src="${imageUrl}" alt="${product.title}" loading="lazy"
                         onerror="this.src='https://via.placeholder.com/300x225?text=No+Image'">
                </div>
                <div class="product-card-content">
                    <h3 class="product-card-title">${product.title}</h3>
                    <div class="product-card-price">${priceFormatted}</div>
                </div>
            </a>
        `;
    }).join('');
}

// Simple price format (no HTML)
function formatPriceSimple(price, currency = 'UAH') {
    if (!price || price === 0) return 'Ціна договірна';
    const formatted = new Intl.NumberFormat('uk-UA').format(price);
    switch (currency) {
        case 'USD': return `$${formatted}`;
        case 'EUR': return `€${formatted}`;
        default: return `${formatted} ₴`;
    }
}

// Copy link
function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Посилання скопійовано!');
    }).catch(() => {
        // Fallback
        const input = document.createElement('input');
        input.value = window.location.href;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        alert('Посилання скопійовано!');
    });
}

// Show error
function showError(message) {
    if (titleEl) titleEl.textContent = message;
    if (descriptionEl) descriptionEl.textContent = '';
    if (priceEl) priceEl.textContent = '';
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'ArrowRight') nextImage();
});
