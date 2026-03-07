/**
 * VclouD Checkout v6 — NOWPayments інтеграція
 */

const API     = 'https://vcloud-admin-server.onrender.com';
const MONO_CARD = '5375 4141 1234 5678'; // замінити на реальну

// Локальні курси — тільки для попереднього розрахунку до отримання відповіді від API
const CRYPTO_RATES = {
    USDTTRC20: 41.5, BTC: 4180000, ETH: 91000, TON: 4.35
};
const CRYPTO_DECIMALS = { USDTTRC20: 2, BTC: 8, ETH: 6, TON: 4 };
const CRYPTO_LABELS   = {
    USDTTRC20: 'USDT TRC-20', BTC: 'Bitcoin', ETH: 'Ethereum', TON: 'TON'
};
// Тікер для NOWPayments API (їх формат)
const NWP_CURRENCY = {
    USDTTRC20: 'usdttrc20', BTC: 'btc', ETH: 'eth', TON: 'ton'
};

let selectedPayMethod = 'crypto';
let selectedCrypto    = 'USDTTRC20';
let timerInterval     = null;
let timerSeconds      = 30 * 60;
let currentOrderId    = null;
let pollInterval      = null;

// ── Init ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    prefillUserData();
    renderOrderSummary();
    selectPayTab('crypto');
    updateCryptoPreview();
    document.getElementById('monoCardNumber').textContent = MONO_CARD;
});

function prefillUserData() {
    const user = (typeof getUser === 'function') ? getUser() : null;
    if (!user) return;
    setVal('orderName',  user.name);
    setVal('orderEmail', user.email);
    setVal('orderPhone', user.phone);
}
function setVal(id, val) {
    const el = document.getElementById(id); if (el && val) el.value = val;
}

// ── Order summary ───────────────────────────────────────────────
function renderOrderSummary() {
    const itemsEl = document.getElementById('orderItems');
    const totalEl = document.getElementById('orderTotal');
    const cart    = (typeof getCart === 'function') ? getCart() : [];

    if (itemsEl) {
        itemsEl.innerHTML = !cart.length
            ? '<div style="color:var(--text-muted);font-size:14px;text-align:center;padding:16px 0;">Кошик порожній</div>'
            : cart.map(item => `
                <div style="display:flex;gap:10px;align-items:center;">
                    <img src="${item.image || 'https://placehold.co/44x44/1e1e1e/666?text=?'}"
                         style="width:44px;height:44px;object-fit:cover;border-radius:8px;border:1px solid var(--border-color);flex-shrink:0;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.title}</div>
                        <div style="font-size:12px;color:var(--text-muted);">× ${item.qty}</div>
                    </div>
                    <div style="font-weight:700;color:var(--price-color);font-size:13px;white-space:nowrap;">${fmtPrice(item.price * item.qty, item.currency || 'UAH')}</div>
                </div>`).join('');
    }
    const total = getTotal();
    if (totalEl) totalEl.textContent = fmtPrice(total, 'UAH');
    const cardHint = document.getElementById('cardTotalHint');
    if (cardHint) cardHint.textContent = fmtPrice(total, 'UAH');
}

function getTotal() {
    return (typeof getCartTotal === 'function') ? getCartTotal() : 0;
}

// ── Tabs ────────────────────────────────────────────────────────
function selectPayTab(method) {
    selectedPayMethod = method;
    document.querySelectorAll('.pay-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(method === 'crypto' ? 'tabCrypto' : 'tabCard')?.classList.add('active');
    document.getElementById('sectionCrypto').style.display = method === 'crypto' ? '' : 'none';
    document.getElementById('sectionCard').style.display   = method === 'card'   ? '' : 'none';
}

// ── Вибір монети ───────────────────────────────────────────────
function selectCoin(coin) {
    selectedCrypto = coin;
    document.querySelectorAll('.coin-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.coin-btn[data-coin="${coin}"]`)?.classList.add('active');
    updateCryptoPreview();
}

// Попередній розрахунок (до відповіді API)
function updateCryptoPreview() {
    const total  = getTotal();
    const rate   = CRYPTO_RATES[selectedCrypto] || 1;
    const dec    = CRYPTO_DECIMALS[selectedCrypto] || 4;
    const amount = total > 0 ? (total / rate).toFixed(dec) : '—';
    const ticker = selectedCrypto.replace('TRC20', '');

    const amMainEl = document.getElementById('cryptoAmountMain');
    const amUahEl  = document.getElementById('cryptoAmountUah');
    const amHintEl = document.getElementById('cryptoAmountHint');
    if (amMainEl) amMainEl.textContent = total > 0 ? `≈ ${amount} ${ticker}` : '—';
    if (amUahEl)  amUahEl.textContent  = total > 0 ? `${fmtPrice(total, 'UAH')} · ${CRYPTO_LABELS[selectedCrypto]}` : 'Кошик порожній';
    if (amHintEl) amHintEl.textContent = total > 0 ? `≈ ${amount} ${ticker}` : 'вказану суму';

    // Адреса — поки не отримано з API
    const addrEl = document.getElementById('cryptoAddrText');
    if (addrEl) addrEl.textContent = 'Заповніть форму і натисніть «Оплатити»';
}

// ── Копіювання ──────────────────────────────────────────────────
function copyAddr() {
    const addrEl = document.getElementById('cryptoAddrText');
    const btn    = document.getElementById('addrCopyBtn');
    const text   = addrEl?.textContent?.trim();
    if (!text || text.startsWith('Заповніть')) return;
    navigator.clipboard.writeText(text).then(() => {
        if (btn) { btn.textContent = '✓ Скопійовано'; btn.classList.add('copied'); }
        setTimeout(() => { if (btn) { btn.textContent = 'Копіювати'; btn.classList.remove('copied'); } }, 2500);
    });
}

function copyCardNumber() {
    navigator.clipboard.writeText(MONO_CARD.replace(/\s/g, '')).then(() => {
        const btn = event.target;
        const orig = btn.textContent;
        btn.textContent = '✅ Скопійовано!';
        setTimeout(() => btn.textContent = orig, 2500);
    });
}

// ── Головна кнопка «Оплатити» ───────────────────────────────────
async function placeOrder() {
    const lastName   = document.getElementById('orderLastName')?.value?.trim()   || '';
    const name       = document.getElementById('orderName')?.value?.trim()       || '';
    const middleName = document.getElementById('orderMiddleName')?.value?.trim() || '';
    const phone      = document.getElementById('orderPhone')?.value?.trim()      || '';
    const email      = document.getElementById('orderEmail')?.value?.trim()      || '';
    const city       = document.getElementById('orderCity')?.value?.trim()       || '';
    const novaPoshta = document.getElementById('orderNovaPoshta')?.value?.trim() || '';

    const fullName = [lastName, name, middleName].filter(Boolean).join(' ');

    if (!lastName)    return showError('Введіть прізвище');
    if (!name)        return showError('Введіть ім\'я');
    if (!phone)       return showError('Введіть телефон');
    if (!email)       return showError('Введіть email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('Невірний формат email');
    if (!city)        return showError('Введіть місто');
    if (!novaPoshta)  return showError('Введіть відділення Нової Пошти');
    clearError();

    const cart  = (typeof getCart === 'function') ? getCart() : [];
    if (!cart.length) return showError('Кошик порожній');

    const user  = (typeof getUser === 'function') ? getUser() : null;
    const total = getTotal();

    setBtnsLoading(true);

    if (selectedPayMethod === 'card') {
        await createOrderAndFinish({ name: fullName, email, phone, city, novaPoshta, cart, total, user, payMethod: 'card' });
        return;
    }

    // КРИПТО — спочатку створюємо замовлення в БД, потім інвойс в NOWPayments
    try {
        // 1. Створити замовлення
        const ordRes = await fetch(API + '/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic dmNsb3VkMjAyNg==' },
            body: JSON.stringify({
                user_id: user?.id || email, email,
                name: fullName, phone, city, nova_poshta: novaPoshta,
                items: cart, total_uah: total,
                payment_method: 'crypto',
                crypto_curr: selectedCrypto
            })
        });
        const ordJson = await ordRes.json();
        if (!ordRes.ok) throw new Error(ordJson.error || 'Помилка створення замовлення');
        currentOrderId = ordJson.id;

        // 2. Створити NOWPayments інвойс
        const nwpRes = await fetch(API + '/api/nowpayments/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic dmNsb3VkMjAyNg==' },
            body: JSON.stringify({
                order_id:          currentOrderId,
                amount_uah:        total,
                currency:          NWP_CURRENCY[selectedCrypto],
                email:             email,
                order_description: `VclouD замовлення #${currentOrderId}`
            })
        });
        const nwpJson = await nwpRes.json();
        if (!nwpRes.ok) throw new Error(nwpJson.error || 'NOWPayments помилка');

        // 3. Показати реальні дані платежу
        showPaymentDetails(nwpJson, total);
        startTimer();
        startPolling(nwpJson.payment_id);

    } catch (err) {
        showError('Помилка: ' + err.message);
        setBtnsLoading(false);
    }
}

// Показати реальну адресу і суму від NOWPayments
function showPaymentDetails(nwpData, totalUah) {
    const { pay_address, pay_amount, pay_currency } = nwpData;

    const addrEl   = document.getElementById('cryptoAddrText');
    const amMainEl = document.getElementById('cryptoAmountMain');
    const amUahEl  = document.getElementById('cryptoAmountUah');
    const amHintEl = document.getElementById('cryptoAmountHint');

    if (addrEl)   addrEl.textContent   = pay_address || '—';
    if (amMainEl) amMainEl.textContent  = `${pay_amount} ${pay_currency?.toUpperCase() || ''}`;
    if (amUahEl)  amUahEl.textContent   = `= ${fmtPrice(totalUah, 'UAH')} · Реальний курс NOWPayments`;
    if (amHintEl) amHintEl.textContent  = `${pay_amount} ${pay_currency?.toUpperCase() || ''}`;

    // QR
    generateQR(pay_address);

    // Змінюємо кнопку — тепер вона вже не "Оплатити", а "Я оплатив"
    const btn = document.getElementById('confirmCryptoBtn');
    if (btn) {
        btn.textContent = '✅ Я оплатив — підтвердити';
        btn.disabled = false;
        btn.onclick = () => confirmManualPaid();
    }

    // Ховаємо вибір монети — платіж вже створено
    const coinGrid = document.querySelector('.crypto-coin-grid');
    if (coinGrid) coinGrid.style.opacity = '0.4';

    setBtnsLoading(false);
}

// Автополінг статусу кожні 15 секунд
function startPolling(paymentId) {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
        try {
            const res  = await fetch(`${API}/api/nowpayments/status/${paymentId}`);
            const data = await res.json();
            const st   = data.payment_status;

            if (st === 'finished' || st === 'confirmed') {
                clearInterval(pollInterval);
                clearInterval(timerInterval);
                if (typeof clearCart === 'function') clearCart();
                window.location.href = `orders.html?new=1&order=${currentOrderId}&paid=1`;
            } else if (st === 'partially_paid') {
                showError('⚠️ Отримано часткову оплату. Доплатіть решту на ту саму адресу.');
            } else if (st === 'failed' || st === 'expired') {
                clearInterval(pollInterval);
                showError('❌ Платіж ' + st + '. Спробуйте знову.');
                setBtnsLoading(false);
            }
        } catch { /* мовчки */ }
    }, 15000);
}

// Ручне підтвердження (якщо автополінг не спрацював)
async function confirmManualPaid() {
    if (!currentOrderId) return;
    if (typeof clearCart === 'function') clearCart();
    clearInterval(pollInterval);
    clearInterval(timerInterval);
    window.location.href = `orders.html?new=1&order=${currentOrderId}`;
}

// Картка — просто зберегти замовлення
async function createOrderAndFinish({ name, email, phone, city, novaPoshta, cart, total, user, payMethod }) {
    try {
        const res = await fetch(API + '/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic dmNsb3VkMjAyNg==' },
            body: JSON.stringify({
                user_id: user?.id || email, email, name, phone,
                city, nova_poshta: novaPoshta,
                items: cart, total_uah: total,
                payment_method: payMethod
            })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Помилка сервера');
        if (typeof clearCart === 'function') clearCart();
        window.location.href = `orders.html?new=1&order=${json.id}`;
    } catch (err) {
        showError('Помилка: ' + err.message);
        setBtnsLoading(false);
    }
}

// ── QR ──────────────────────────────────────────────────────────
function generateQR(addr) {
    const canvas = document.getElementById('cryptoQR');
    if (!canvas || !addr) return;
    if (typeof QRCode === 'undefined') return;
    QRCode.toCanvas(canvas, addr, { width: 160, margin: 2, color: { dark: '#000', light: '#fff' } });
}

// ── Таймер ──────────────────────────────────────────────────────
function startTimer() {
    timerSeconds = 30 * 60;
    if (timerInterval) clearInterval(timerInterval);
    const el = document.getElementById('payTimer');
    timerInterval = setInterval(() => {
        timerSeconds--;
        if (!el) return;
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            el.textContent = 'Час вийшов';
            el.style.color = '#ef4444';
            return;
        }
        const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
        const s = (timerSeconds % 60).toString().padStart(2, '0');
        el.textContent = `${m}:${s}`;
        if (timerSeconds <= 300) el.style.color = '#ef4444';
    }, 1000);
}

// ── Helpers ──────────────────────────────────────────────────────
function setBtnsLoading(loading) {
    document.querySelectorAll('.confirm-paid-btn').forEach(b => {
        b.disabled = loading;
        if (loading) b.textContent = 'Обробка...';
    });
}

function fmtPrice(price, currency) {
    if (!price || isNaN(price)) return 'Ціна договірна';
    const f = new Intl.NumberFormat('uk-UA').format(Math.round(Number(price)));
    if (currency === 'USD') return '$' + f;
    if (currency === 'EUR') return '€' + f;
    return f + ' ₴';
}

function showError(msg) {
    const el = document.getElementById('orderError');
    if (el) { el.textContent = '❌ ' + msg; el.style.display = 'block'; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}

function clearError() {
    const el = document.getElementById('orderError');
    if (el) { el.textContent = ''; el.style.display = 'none'; }
}
