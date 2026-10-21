/* AutoParts Hub — browser-local demo only. No backend, authentication, or real payments. */
(function () {
  'use strict';
  // === Demo catalog and browser-local state ===
  // Keep these storage keys unchanged so existing saved demo data remains usable.
  const KEYS = {
    products: 'aph_products_v1',
    cart: 'aph_cart_v1',
    orders: 'aph_orders_v1',
    profile: 'aph_profile_v1',
  };
  const fits = [
    'Toyota Corolla 2010–2018',
    'Nissan Note 2012–2020',
    'Mazda Demio 2014–2020',
  ];
  const seedProducts = [
    {
      id: 'bp-001',
      brand: 'Brembo-style',
      number: 'BRK-COR-101',
      name: 'Front Brake Pad Set',
      category: 'Brakes',
      description: 'Low-dust replacement front pad set for everyday stopping confidence.',
      price: 4500,
      stock: 12,
      image: 'assets/brakes.jpg',
      fits: [fits[0]],
    },
    {
      id: 'bp-002',
      brand: 'RoadSafe',
      number: 'BRK-NOT-204',
      name: 'Rear Brake Pad Set',
      category: 'Brakes',
      description: 'Sample rear brake pad set for selected compact vehicles.',
      price: 3900,
      stock: 8,
      image: 'assets/brakes.jpg',
      fits: [fits[1]],
    },
    {
      id: 'fl-001',
      brand: 'Mann-style',
      number: 'FLT-COR-310',
      name: 'Oil Filter',
      category: 'Filters',
      description: 'Spin-on oil filter sample for scheduled oil changes.',
      price: 1800,
      stock: 25,
      image: 'assets/filter.jpg',
      fits: [fits[0], fits[2]],
    },
    {
      id: 'fl-002',
      brand: 'ClearFlow',
      number: 'FLT-NOT-118',
      name: 'Oil Filter',
      category: 'Filters',
      description: 'Spin-on oil filter sample for scheduled oil changes.',
      price: 1200,
      stock: 30,
      image: 'assets/filter.jpg',
      fits: [fits[1]],
    },
    {
      id: 'en-001',
      brand: 'Denso-style',
      number: 'ENG-COR-510',
      name: 'Iridium Spark Plug Set',
      category: 'Engine',
      description:
        'Iridium spark plug set for reliable ignition; confirm engine variant before ordering.',
      price: 3200,
      stock: 6,
      image: 'assets/engine.jpg',
      fits: [fits[0]],
    },
    {
      id: 'su-001',
      brand: 'KYB-style',
      number: 'SUS-DMI-220',
      name: 'Rear Shock Absorber',
      category: 'Suspension',
      description:
        'Sample rear shock absorber for improved ride control; confirm fitment before ordering.',
      price: 2750,
      stock: 14,
      image: 'assets/suspension.jpg',
      fits: [fits[2]],
    },
    {
      id: 'el-001',
      brand: 'VoltStart',
      number: 'ELC-COR-700',
      name: '12V Battery',
      category: 'Electrical',
      description: 'Demo 12V maintenance-free battery; confirm dimensions and terminals.',
      price: 14500,
      stock: 4,
      image: 'assets/battery.jpg',
      fits: [fits[0], fits[1]],
    },
    {
      id: 'lu-001',
      brand: 'LubePro',
      number: 'FLD-ALL-5W30',
      name: '5W-30 Engine Oil 4L',
      category: 'Fluids',
      description: 'Sample full-synthetic style oil for compatible petrol engines.',
      price: 6200,
      stock: 18,
      image: 'assets/oil.jpg',
      fits: [],
    },
  ];
  // === DOM, persistence, and display helpers ===
  const $ = (id) => document.getElementById(id);
  // Unavailable storage or invalid JSON falls back to the supplied default.
  const read = (key, fallback) => {
    try {
      const x = localStorage.getItem(key);
      return x ? JSON.parse(x) : fallback;
    } catch (_) {
      return fallback;
    }
  };
  // Storage errors are intentionally ignored; the demo continues in memory.
  const save = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  };
  // Seed the catalog only when no saved catalog is available.
  let products = read(KEYS.products, null) || seedProducts;
  let activeVehicle = null;
  let toastTimer;
  if (!read(KEYS.products, null)) save(KEYS.products, products);
  let cart = read(KEYS.cart, []),
    orders = read(KEYS.orders, []);
  const money = (n) => 'KSh ' + Number(n || 0).toLocaleString('en-KE');
  // Escape text inserted into HTML. This is not a general JavaScript/URL sanitizer.
  const esc = (v) =>
    String(v == null ? '' : v).replace(
      /[&<>'"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]
    );
  const slug = (s) => String(s || '').toLowerCase();
  // All dialog views share the same modal and replace its contents.
  const modal = () => $('modal');
  function show(html, title) {
    const m = modal();
    if (!m) return;
    const c = $('modalContent');
    c.innerHTML =
      '<div class="modal-header"><h2>' +
      esc(title || '') +
      '</h2><button class="btn btn-light" type="button" onclick="closeModal()">Close</button></div>' +
      html;
    if (!m.open) m.showModal();
  }
  function closeModal() {
    const m = modal();
    if (m && m.open) m.close();
  }
  // === Catalog filtering and product views ===
  function currentFilters() {
    return {
      q: slug($('searchInput')?.value),
      cat: $('categoryFilter')?.value || 'all',
      price: $('priceFilter')?.value || 'all',
      stock: !!$('stockFilter')?.checked,
      sort: $('sortSelect')?.value || 'featured',
    };
  }
  // Sample fit strings are expected to contain a vehicle name and a year range.
  // An empty fits array does not match an active vehicle; fitment is not verified.
  function vehicleFits(p, vehicle) {
    if (!vehicle) return true;
    return p.fits.some(
      (f) =>
        f.startsWith(vehicle.wanted) &&
        vehicle.year >= Number(f.match(/(\d{4})/)[1]) &&
        vehicle.year <= Number(f.match(/(\d{4})[–-](\d{4})/)[2])
    );
  }
  // filter() creates a new array, so sorting does not reorder the stored catalog.
  function filtered() {
    const f = currentFilters();
    let list = products.filter(
      (p) =>
        vehicleFits(p, activeVehicle) &&
        (!f.q ||
          [p.name, p.category, p.number, p.brand].some((x) => slug(x).includes(f.q))) &&
        (f.cat === 'all' || p.category === f.cat) &&
        (!f.stock || p.stock > 0) &&
        (f.price === 'all' || p.price <= Number(f.price))
    );
    if (f.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (f.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    return list;
  }
  function renderProducts() {
    const grid = $('products');
    if (!grid) return;
    const list = filtered();
    if ($('resultCount'))
      $('resultCount').textContent =
        list.length + (list.length === 1 ? ' result' : ' results');
    grid.innerHTML = list.length
      ? list
          .map(
            (p) =>
              '<article class="product-card"><div class="product-image"><img src="' +
              esc(p.image) +
              '" alt="' +
              esc(p.name) +
              '"></div><div class="product-body"><div class="product-brand">' +
              esc(p.brand) +
              ' · ' +
              esc(p.number) +
              '</div><button class="product-title" type="button" onclick="openProduct(\'' +
              esc(p.id) +
              '\')">' +
              esc(p.name) +
              '</button><p>' +
              esc(p.description) +
              '</p><div class="product-fit">' +
              (p.fits?.length
                ? 'Sample fit: ' + esc(p.fits.join(', '))
                : 'Sample fit: unknown — confirm compatibility') +
              '</div><div class="product-bottom"><strong class="price">' +
              money(p.price) +
              '</strong><span class="stock-tag ' +
              (p.stock ? '' : 'out') +
              '">' +
              (p.stock ? esc(p.stock) + ' in stock' : 'Out of stock') +
              '</span></div><button class="btn btn-dark add-button" type="button" ' +
              (p.stock ? '' : 'disabled') +
              ' onclick="addToCart(\'' +
              esc(p.id) +
              '\')">Add to cart</button></div></article>'
          )
          .join('')
      : '<div class="empty">No parts match these filters. Try resetting your search.</div>';
  }
  function searchProducts() {
    renderProducts();
  }
  function chooseCategory(category) {
    if ($('categoryFilter')) $('categoryFilter').value = category || 'all';
    renderProducts();
    $('shop')?.scrollIntoView({ behavior: 'smooth' });
  }
  function resetFilters() {
    activeVehicle = null;
    if ($('searchInput')) $('searchInput').value = '';
    if ($('categoryFilter')) $('categoryFilter').value = 'all';
    if ($('priceFilter')) $('priceFilter').value = 'all';
    if ($('stockFilter')) $('stockFilter').checked = false;
    if ($('sortSelect')) $('sortSelect').value = 'featured';
    ['makeSelect', 'modelSelect', 'yearSelect'].forEach((id) => {
      if ($(id)) $(id).value = '';
    });
    if ($('vehicleNote'))
      $('vehicleNote').textContent =
        'Compatibility uses sample data. Always confirm the part number and fitment before a real purchase.';
    renderProducts();
  }
  function openProduct(id) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    show(
      '<div class="detail"><img class="detail-image" src="' +
        esc(p.image) +
        '" alt="' +
        esc(p.name) +
        '"><div><p class="product-brand">' +
        esc(p.brand) +
        '</p><h3>' +
        esc(p.name) +
        '</h3><p>' +
        esc(p.description) +
        '</p><p><strong>Part number:</strong> ' +
        esc(p.number) +
        '<br><strong>Category:</strong> ' +
        esc(p.category) +
        '<br><strong>Price:</strong> ' +
        money(p.price) +
        '<br><strong>Stock:</strong> ' +
        esc(p.stock) +
        '</p><p><strong>Sample fits only:</strong> ' +
        (p.fits?.length ? esc(p.fits.join(', ')) : 'Unknown / confirm with a mechanic') +
        ('</p>' +
          '<button class="btn btn-dark" ') +
        (p.stock ? '' : 'disabled') +
        ' onclick="addToCart(\'' +
        esc(p.id) +
        '\');closeModal()">Add to cart</button></div></div>',
      'Part details'
    );
  }
  // === Cart state and feedback ===
  // Ignore cart entries whose products no longer exist when displaying line items.
  function cartItems() {
    return cart
      .map((i) => ({ ...i, product: products.find((p) => p.id === i.id) }))
      .filter((i) => i.product);
  }
  function updateCartCount() {
    const n = cart.reduce((s, i) => s + i.qty, 0);
    if ($('cartCount')) $('cartCount').textContent = n;
  }
  function showToast(message) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }
  function addToCart(id) {
    const p = products.find((x) => x.id === id);
    if (!p || p.stock < 1) return;
    const item = cart.find((x) => x.id === id);
    if (item) {
      if (item.qty >= p.stock) {
        alert('Quantity exceeds current stock.');
        return;
      }
      item.qty++;
    } else cart.push({ id, qty: 1 });
    save(KEYS.cart, cart);
    updateCartCount();
    showToast(p.name + ' added to cart');
  }
  function changeQty(id, delta) {
    const item = cart.find((x) => x.id === id),
      p = products.find((x) => x.id === id);
    if (!item || !p) return;
    const next = item.qty + delta;
    if (next < 1) cart = cart.filter((x) => x.id !== id);
    else if (next <= p.stock) item.qty = next;
    else {
      alert('Quantity exceeds current stock.');
      return;
    }
    save(KEYS.cart, cart);
    updateCartCount();
    openCart();
  }
  function removeFromCart(id) {
    cart = cart.filter((x) => x.id !== id);
    save(KEYS.cart, cart);
    updateCartCount();
    openCart();
  }
  function cartTotals() {
    return cartItems().reduce((s, i) => s + i.product.price * i.qty, 0);
  }
  function openCart() {
    const items = cartItems();
    show(
      items.length
        ? '<div>' +
            items
              .map(
                (i) =>
                  '<div class="cart-row"><div><strong>' +
                  esc(i.product.name) +
                  '</strong><br><span class="muted">' +
                  money(i.product.price) +
                  ' each</span></div><div class="qty"><button class="btn btn-light" onclick="changeQty(\'' +
                  esc(i.id) +
                  '\',-1)">−</button><span>' +
                  i.qty +
                  '</span><button class="btn btn-light" onclick="changeQty(\'' +
                  esc(i.id) +
                  '\',1)">+</button><button class="btn btn-light" onclick="removeFromCart(\'' +
                  esc(i.id) +
                  '\')">Remove</button></div></div>'
              )
              .join('') +
            '</div><hr><p><strong>Total: ' +
            money(cartTotals()) +
            '</strong></p><button class="btn btn-dark" onclick="openCheckout()">Checkout</button>'
        : '<div class="empty">Your cart is empty.</div>',
      'Your cart'
    );
  }
  // === Simulated checkout and order creation ===
  function updateDeliveryAddress(select) {
    const address = select.form?.elements.deliveryAddress;
    if (!address) return;
    const delivery = select.value.startsWith('Delivery');
    address.required = delivery;
    address.placeholder = delivery
      ? 'e.g. Apartment, street, Nairobi'
      : 'Optional for collection';
  }
  function openCheckout() {
    if (!cartItems().length) {
      alert('Add an in-stock part first.');
      return;
    }
    show(
      '<form id="checkoutForm" onsubmit="submitOrder(event)">' +
        '<div class="form-grid">' +
        '<label class="field">Name' +
        '<input name="name" required maxlength="80" value="Customer">' +
        '</label>' +
        '<label class="field">Phone' +
        '<input name="phone" required pattern="(?:\\+254|0)(?:1|7)\\d{8}" placeholder="0712345678 or 0112345678">' +
        '</label>' +
        '<label class="field">Email' +
        '<input type="email" name="email" required maxlength="120" placeholder="example@gmail.com">' +
        '</label>' +
        '<label class="field">Delivery or collection' +
        '<select name="fulfilment" onchange="updateDeliveryAddress(this)">' +
        '<option>Delivery — Nairobi' +
        '</option>' +
        '<option>Collection — counter' +
        '</option>' +
        '</select>' +
        '</label>' +
        '<label class="field">Delivery address' +
        '<textarea name="deliveryAddress" required maxlength="240" placeholder="e.g. Apartment, street, Nairobi">' +
        '</textarea>' +
        '</label>' +
        '<label class="field">Notes' +
        '<textarea name="notes" maxlength="300" placeholder="Optional delivery notes">' +
        '</textarea>' +
        '</label>' +
        '</div>' +
        '<p>' +
        '<strong>Delivery fee: KSh 0' +
        '</strong>' +
        '</p>' +
        '<p>' +
        '<strong>Order total: ' +
        money(cartTotals()) +
        '</strong></p><button class="btn btn-dark" type="submit">Place order</button></form>',
      'checkout'
    );
  }
  // Revalidate quantities, form fields, and stock before mutating local demo data.
  // Creating an order reduces local stock only; no payment or network request occurs.
  function submitOrder(e) {
    e.preventDefault();
    const form = e.target,
      data = new FormData(form),
      items = cartItems();
    if (
      !items.length ||
      cart.length !== items.length ||
      cart.some((i) => !Number.isInteger(i.qty) || i.qty < 1)
    ) {
      alert('Your cart is empty or contains an invalid quantity.');
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (items.some((i) => i.qty > i.product.stock)) {
      alert('Stock changed. Please review your cart.');
      return;
    }
    const ref = 'APH-' + String(Date.now()).slice(-7);
    const order = {
      ref,
      created: new Date().toISOString(),
      status: 'Pending',
      payment: 'Pending (demo)',
      contact: {
        name: String(data.get('name')),
        phone: String(data.get('phone')),
        email: String(data.get('email')),
      },
      deliveryAddress: String(data.get('deliveryAddress') || ''),
      fulfilment: String(data.get('fulfilment')),
      notes: String(data.get('notes') || ''),
      items: items.map((i) => ({
        id: i.id,
        name: i.product.name,
        price: i.product.price,
        qty: i.qty,
      })),
      total: cartTotals(),
      sample: false,
    };
    products.forEach((p) => {
      const fresh = items.find((i) => i.id === p.id);
      if (fresh) p.stock -= fresh.qty;
    });
    orders.unshift(order);
    cart = [];
    save(KEYS.products, products);
    save(KEYS.orders, orders);
    save(KEYS.cart, cart);
    updateCartCount();
    renderProducts();
    show(
      '<div class="notice"><h3>Order created</h3><p>Reference: <strong>' +
        esc(ref) +
        ('</strong>' +
          '</p>' +
          '<p>Status: Pending · Payment: Pending' +
          '</p>' +
          '<p>No money was charged and no external network request was made.' +
          '</p>' +
          '</div>' +
          '<button class="btn btn-dark" onclick="openTracker()">View tracker' +
          '</button>'),
      'Order received'
    );
  }
  // === Sample vehicle selection ===
  function findParts() {
    const make = $('makeSelect')?.value || '',
      model = $('modelSelect')?.value || '',
      year = Number($('yearSelect')?.value || 0),
      wanted = make + ' ' + model;
    activeVehicle = make && model && year ? { make, model, year, wanted } : null;
    if ($('categoryFilter')) $('categoryFilter').value = 'all';
    const match = activeVehicle
      ? products.filter((p) => vehicleFits(p, activeVehicle))
      : [];
    if ($('vehicleNote'))
      $('vehicleNote').textContent = activeVehicle
        ? match.length
          ? 'Showing sample parts for ' +
            wanted +
            ' ' +
            year +
            '. Fitment is not verified.'
          : 'No sample parts match ' + wanted + ' ' + year + '. Try another vehicle.'
        : 'Choose a sample make, model and year to see possible matches.';
    renderProducts();
    $('shop')?.scrollIntoView({ behavior: 'smooth' });
  }
  // === Browser-local tracking, profile, and enquiries ===
  // The fixed sample order is displayed alongside orders created in this browser.
  function openTracker() {
    const demo = {
      ref: 'APH-DEMO-001',
      status: 'Ready for collection',
      payment: 'Paid (demo)',
      created: 'Sample order',
      items: [],
    };
    const list = [demo, ...orders];
    show(
        list
          .map(
            (o) =>
              '<div class="cart-row"><div><strong>' +
              esc(o.ref) +
              '</strong><br><span class="muted">' +
              esc(o.created) +
              '</span></div><div><span class="tag">' +
              esc(o.status) +
              '</span><br>' +
              esc(o.payment || 'Pending') +
              '<br>' +
              money(o.total || 0) +
              '</div></div>'
          )
          .join(''),
      'Order tracker'
    );
  }
  function openAccount() {
    const profile = read(KEYS.profile, {
      name: 'Customer',
      email: 'example@gmail.com',
      phone: '0712345678',
    });
    show(
        '<form onsubmit="saveProfile(event)">' +
        '<div class="form-grid">' +
        '<label class="field">Name' +
        '<input name="name" maxlength="80" value="' +
        esc(profile.name) +
        '"></label><label class="field">Email<input name="email" type="email" maxlength="120" value="' +
        esc(profile.email) +
        '"></label><label class="field">Phone<input name="phone" maxlength="20" value="' +
        esc(profile.phone) +
        '"></label></div><button class="btn btn-dark">Login</button></form><hr><h3>Order history</h3>' +
        (orders.length
          ? orders
              .map(
                (o) =>
                  '<p><strong>' +
                  esc(o.ref) +
                  '</strong> · ' +
                  esc(o.status) +
                  ' · ' +
                  money(o.total) +
                  '</p>'
              )
              .join('')
          : '<p class="muted">No orders yet.</p>'),
      'Customer profile'
    );
  }
  function saveProfile(e) {
    e.preventDefault();
    const d = new FormData(e.target);
    save(KEYS.profile, {
      name: String(d.get('name')),
      email: String(d.get('email')),
      phone: String(d.get('phone')),
    });
    openAccount();
  }
  function openEnquiry() {
    show(
      '<form onsubmit="submitEnquiry(event)">' +
        '<div class="form-grid">' +
        '<label class="field">Name' +
        '<input name="name" maxlength="80" required>' +
        '</label>' +
        '<label class="field">Email' +
        '<input type="email" name="email" maxlength="120" required>' +
        '</label>' +
        '<label class="field">Part number or vehicle' +
        '<input name="subject" maxlength="120" required>' +
        '</label>' +
        '<label class="field">Question' +
        '<textarea name="message" maxlength="500" required>' +
        '</textarea>' +
        '</label>' +
        '</div>' +
        '<button class="btn btn-dark">Send enquiry' +
        '</button>' +
        '</form>',
      'Parts enquiry'
    );
  }
  function submitEnquiry(e) {
    e.preventDefault();
    const d = new FormData(e.target);
    const qs = read('aph_enquiries', []);
    qs.unshift({
      name: String(d.get('name')),
      email: String(d.get('email')),
      subject: String(d.get('subject')),
      message: String(d.get('message')),
      created: new Date().toISOString(),
    });
    save('aph_enquiries', qs);
    show(
      '<div class="notice"><h3>Enquiry sent successfuly</h3><p>We will get back to you in no time.</p></div>',
      'Enquiry sent'
    );
  }
  // === Unauthenticated demo catalog and order editor ===
  // These controls are not an access-control or authentication boundary.
  function openAdmin() {
    const statusOpts = [
      'Pending',
      'Confirmed',
      'Ready for collection',
      'Out for delivery',
      'Completed',
      'Cancelled',
    ];
    show(
        '<h3>Products' +
        '</h3>' +
        '<div class="admin-table">' +
        products
          .map(
            (p) =>
              '<div class="cart-row"><div><strong>' +
              esc(p.name) +
              '</strong><br><span class="muted">' +
              esc(p.number) +
              ' · ' +
              esc(p.category) +
              '</span></div><div><button class="btn btn-light" onclick="editProduct(\'' +
              esc(p.id) +
              '\')">Edit</button><button class="btn btn-light" onclick="deleteProduct(\'' +
              esc(p.id) +
              '\')">Delete</button></div></div>'
          )
          .join('') +
        '</div><h3>Add product</h3>' +
        productForm() +
        '<h3>Orders</h3>' +
        ['APH-DEMO-001', ...orders.map((o) => o.ref)]
          .map((ref) => {
            const o =
              ref === 'APH-DEMO-001'
                ? { ref, status: 'Ready for collection', total: 0, sample: true }
                : orders.find((x) => x.ref === ref);
            return (
              '<div class="cart-row"><div><strong>' +
              esc(o.ref) +
              '</strong>' +
              (o.sample ? ' <span class="tag">sample</span>' : '') +
              '<br>' +
              money(o.total) +
              '</div><select class="field" onchange="setOrderStatus(\'' +
              esc(o.ref) +
              '\',this.value)">' +
              statusOpts
                .map(
                  (s) =>
                    '<option ' +
                    (s === o.status ? 'selected' : '') +
                    '>' +
                    s +
                    '</option>'
                )
                .join('') +
              '</select></div>'
            );
          })
          .join(''),
      'Admin workspace'
    );
  }
  // The same form is used for adding a product and editing an existing product.
  function productForm(p) {
    p = p || {};
    return (
      '<form onsubmit="saveProduct(event)" data-id="' +
      esc(p.id || '') +
      '"><div class="form-grid"><label class="field">Name<input name="name" required maxlength="100" value="' +
      esc(p.name || '') +
      '"></label><label class="field">Brand<input name="brand" maxlength="60" value="' +
      esc(p.brand || '') +
      '"></label><label class="field">Part number<input name="number" required maxlength="50" value="' +
      esc(p.number || '') +
      '"></label><label class="field">Category<input name="category" required maxlength="40" value="' +
      esc(p.category || '') +
      '"></label><label class="field">Price (KSh)<input type="number" name="price" min="0" required value="' +
      esc(p.price || 0) +
      '"></label><label class="field">Stock<input type="number" name="stock" min="0" required value="' +
      esc(p.stock || 0) +
      '"></label><label class="field">Image path<input name="image" maxlength="160" value="' +
      esc(p.image || 'assets/brakes.jpg') +
      '"></label><label class="field">Sample fits<input name="fits" maxlength="250" value="' +
      esc((p.fits || []).join(', ')) +
      '"></label><label class="field">Description<textarea name="description" maxlength="300">' +
      esc(p.description || '') +
      '</textarea></label></div><button class="btn btn-dark">' +
      (p.id ? 'Save changes' : 'Add product') +
      '</button></form>'
    );
  }
  function editProduct(id) {
    const p = products.find((x) => x.id === id);
    if (p) show(productForm(p), 'Edit product');
  }
  function saveProduct(e) {
    e.preventDefault();
    const f = e.target,
      d = new FormData(f),
      id = f.dataset.id || 'prod-' + Date.now();
    const p = {
      id,
      name: String(d.get('name')),
      brand: String(d.get('brand')),
      number: String(d.get('number')),
      category: String(d.get('category')),
      price: Math.max(0, Number(d.get('price')) || 0),
      stock: Math.max(0, Math.floor(Number(d.get('stock')) || 0)),
      image: String(d.get('image')) || 'assets/brakes.jpg',
      fits: String(d.get('fits'))
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
      description: String(d.get('description')),
    };
    const i = products.findIndex((x) => x.id === id);
    if (i < 0) products.push(p);
    else products[i] = p;
    save(KEYS.products, products);
    renderProducts();
    openAdmin();
  }
  function deleteProduct(id) {
    if (!confirm('Delete this demo product?')) return;
    products = products.filter((p) => p.id !== id);
    cart = cart.filter((i) => i.id !== id);
    save(KEYS.products, products);
    save(KEYS.cart, cart);
    updateCartCount();
    renderProducts();
    openAdmin();
  }
  // The built-in sample order is display-only; persist changes to real demo entries.
  function setOrderStatus(ref, status) {
    if (ref === 'APH-DEMO-001') return;
    const o = orders.find((x) => x.ref === ref);
    if (o) {
      o.status = status;
      save(KEYS.orders, orders);
    }
  }
  // === Event binding and startup ===
  // Preserve the original sample model mapping and fixed 2008–2025 year options.
  function populateVehicleOptions() {
    const make = $('makeSelect'),
      model = $('modelSelect'),
      year = $('yearSelect');
    if (!make || !model || !year) return;
    const models = { Toyota: 'Corolla', Nissan: 'Note', Mazda: 'Demio' };
    make.addEventListener('change', () => {
      const value = models[make.value] || '';
      model.innerHTML =
        '<option value="">Select model</option>' +
        (value ? '<option>' + esc(value) + '</option>' : '');
      year.value = '';
    });
    year.innerHTML =
      '<option value="">Select year</option>' +
      Array.from(
        { length: 18 },
        (_, i) => '<option>' + String(2008 + i) + '</option>'
      ).join('');
  }
  function bind() {
    ['searchInput', 'categoryFilter', 'priceFilter', 'stockFilter', 'sortSelect'].forEach(
      (id) => $(id)?.addEventListener('input', renderProducts)
    );
    populateVehicleOptions();
    if ($('modal'))
      $('modal').addEventListener('click', (e) => {
        if (e.target === $('modal')) closeModal();
      });
    renderProducts();
    updateCartCount();
  }
  // Inline event handlers in the page and generated HTML depend on these globals.
  // Keep the exported names intact when refactoring internal code.
  Object.assign(window, {
    renderProducts,
    searchProducts,
    chooseCategory,
    findParts,
    resetFilters,
    openProduct,
    addToCart,
    openCart,
    openCheckout,
    updateDeliveryAddress,
    openTracker,
    openAccount,
    openAdmin,
    openEnquiry,
    closeModal,
    changeQty,
    removeFromCart,
    submitOrder,
    saveProfile,
    submitEnquiry,
    editProduct,
    saveProduct,
    deleteProduct,
    setOrderStatus,
  });
  // Bind once the DOM is available, including when this script loads after parsing.
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
