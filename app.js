function getCurrencyInfo() {
  const sel = document.getElementById('currency-select');
  const opt = sel.options[sel.selectedIndex];
  return { symbol: opt.dataset.symbol, locale: opt.dataset.locale, code: opt.value };
}

function formatNum(n, curr) {
  const noDecimal = ['JPY'].includes(curr.code);
  return (parseFloat(n) || 0).toLocaleString(curr.locale, {
    minimumFractionDigits: noDecimal ? 0 : 2,
    maximumFractionDigits: noDecimal ? 0 : 2,
  });
}

function fmtAmount(n, curr) { return `${curr.symbol} ${formatNum(n, curr)}`; }

function getVal(id) { return (document.getElementById(id)?.value || '').trim(); }

function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function addItem() {
  const div = document.createElement('div');
  div.className = 'item-row';
  div.innerHTML = `
    <button class="remove-item" onclick="removeItem(this)" title="Remove">×</button>
    <div class="form-group">
      <label>Description</label>
      <input type="text" class="item-desc-input" placeholder="Service or product description" oninput="updatePreview()">
    </div>
    <div class="item-numbers">
      <div class="form-group">
        <label>Qty</label>
        <input type="number" class="item-qty" value="1" min="1" step="1" oninput="updatePreview()">
      </div>
      <div class="form-group">
        <label>Unit Price</label>
        <input type="number" class="item-price" value="0" min="0" step="0.01" oninput="updatePreview()">
      </div>
    </div>`;
  document.getElementById('items-container').appendChild(div);
  updatePreview();
}

function removeItem(btn) {
  if (document.querySelectorAll('.item-row').length === 1) return;
  btn.closest('.item-row').remove();
  updatePreview();
}

function getItems() {
  return Array.from(document.querySelectorAll('.item-row')).map(row => ({
    desc:  row.querySelector('.item-desc-input')?.value || '',
    qty:   parseFloat(row.querySelector('.item-qty')?.value  || 1),
    price: parseFloat(row.querySelector('.item-price')?.value || 0),
  }));
}

function updatePreview() {
  const curr  = getCurrencyInfo();
  const items = getItems();
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  const notes = getVal('inv-notes');

  const rows = items.map(i => `
    <tr>
      <td>${i.desc || '—'}</td>
      <td class="r">${i.qty}</td>
      <td class="r">${fmtAmount(i.price, curr)}</td>
      <td class="r"><strong>${fmtAmount(i.qty * i.price, curr)}</strong></td>
    </tr>`).join('');

  document.getElementById('invoice-preview').innerHTML = `
    <div class="inv-header">
      <div class="inv-title">Invoice</div>
      <table class="inv-meta-table">
        <tr><td class="lbl">Invoice No.</td><td class="val">${getVal('inv-number')}</td></tr>
        <tr><td class="lbl">Date</td><td class="val">${formatDate(getVal('inv-date'))}</td></tr>
      </table>
    </div>
    <div class="inv-parties">
      <div class="inv-party">
        <h4>Issuer</h4>
        <p><strong>${getVal('issuer-name')}</strong><br>${getVal('issuer-tax')}<br>
           ${getVal('issuer-address').replace(/\n/g,'<br>')}<br>
           ${getVal('issuer-email')}<br>${getVal('issuer-phone')}</p>
      </div>
      <div class="inv-party right">
        <h4>Recipient</h4>
        <p><strong>${getVal('recipient-name')}</strong><br>${getVal('recipient-tax')}<br>
           ${getVal('recipient-address').replace(/\n/g,'<br>')}<br>
           ${getVal('recipient-email')}<br>${getVal('recipient-phone')}</p>
      </div>
    </div>
    <table class="inv-table">
      <thead><tr>
        <th>Description</th><th class="r">Quantity</th>
        <th class="r">Unit Price</th><th class="r">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="inv-total-row subtotal">
      <span><strong>Subtotal</strong></span>
      <span><strong>${fmtAmount(total, curr)}</strong></span>
    </div>
    <div class="inv-total-row grand">
      <span>Total</span><span>${fmtAmount(total, curr)}</span>
    </div>
    ${notes ? `<div class="inv-notes">${notes.replace(/\n/g,'<br>')}</div>` : ''}
  `;
}

async function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' });
  const curr  = getCurrencyInfo();
  const items = getItems();
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  const pageW = doc.internal.pageSize.getWidth();
  const L = 18, R = pageW - 18;
  let y = 22;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.setTextColor(26, 26, 26);
  doc.text('Invoice', L, y + 4);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.setTextColor(130, 130, 130);
  doc.text('Invoice No.', pageW - 72, y);
  doc.text('Date',        pageW - 72, y + 7);
  doc.setTextColor(26, 26, 26);
  doc.text(getVal('inv-number'),           R, y,     { align: 'right' });
  doc.text(formatDate(getVal('inv-date')), R, y + 7, { align: 'right' });

  y += 22;
  doc.setDrawColor(220,220,220); doc.setLineWidth(0.2); doc.line(L, y, R, y);
  y += 10;

  const iL = [getVal('issuer-name'), getVal('issuer-tax'), ...getVal('issuer-address').split('\n'),
              getVal('issuer-email'), getVal('issuer-phone')].filter(Boolean);
  const rL = [getVal('recipient-name'), getVal('recipient-tax'), ...getVal('recipient-address').split('\n'),
              getVal('recipient-email'), getVal('recipient-phone')].filter(Boolean);
  const mid = pageW / 2 + 8;

  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(26,26,26);
  doc.text('ISSUER', L, y); doc.text('RECIPIENT', mid, y); y += 5;
  doc.setFontSize(9.5);
  iL.forEach((l,i) => { doc.setFont('helvetica', i===0?'bold':'normal'); doc.setTextColor(60,60,60); doc.text(l, L, y+i*5.8); });
  rL.forEach((l,i) => { doc.setFont('helvetica', i===0?'bold':'normal'); doc.setTextColor(60,60,60); doc.text(l, mid, y+i*5.8); });
  y += Math.max(iL.length, rL.length) * 5.8 + 12;

  doc.autoTable({
    startY: y,
    head: [['Description','Quantity','Unit Price','Total']],
    body: items.map(i => [i.desc, String(i.qty), fmtAmount(i.price,curr), fmtAmount(i.qty*i.price,curr)]),
    margin: { left: L, right: 18 },
    headStyles: { fillColor:[210,224,206], textColor:[60,60,60], fontStyle:'normal', fontSize:9.5 },
    bodyStyles: { textColor:[40,40,40], fontSize:9.5 },
    columnStyles: { 0:{cellWidth:'auto'}, 1:{halign:'right'}, 2:{halign:'right'}, 3:{halign:'right',fontStyle:'bold'} },
    alternateRowStyles: { fillColor:[255,255,255] },
    tableLineColor:[220,220,220], tableLineWidth:0.1,
  });

  y = doc.lastAutoTable.finalY;
  doc.setFillColor(210,224,206); doc.rect(L,y,R-L,10,'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(10.5); doc.setTextColor(40,40,40);
  doc.text('Subtotal', L+4, y+7); doc.text(fmtAmount(total,curr), R-2, y+7, {align:'right'});
  y += 10;

  doc.setDrawColor(200,200,200); doc.setLineWidth(0.3); doc.line(L,y,R,y); y += 1;
  doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(26,26,26);
  doc.text('Total', L+4, y+9); doc.text(fmtAmount(total,curr), R-2, y+9, {align:'right'});

  const notes = getVal('inv-notes');
  if (notes) {
    y += 20;
    doc.setDrawColor(220,220,220); doc.setLineWidth(0.2); doc.line(L,y,R,y); y += 7;
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(130,130,130);
    doc.text(doc.splitTextToSize(notes, R-L), L, y);
  }

  doc.save(`Invoice-${getVal('inv-number')}.pdf`);
}

document.querySelectorAll('input, textarea, select').forEach(el => {
  el.addEventListener('input',  updatePreview);
  el.addEventListener('change', updatePreview);
});

updatePreview();

/* ════════════════════════════════════
   INVOICE MANAGEMENT
════════════════════════════════════ */

let _savedInvoices = [];

function escHtml(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getFormData() {
  const curr = getCurrencyInfo();
  return {
    invNumber:        getVal('inv-number'),
    invDate:          getVal('inv-date'),
    currency:         curr.code,
    currencySymbol:   curr.symbol,
    issuerName:       getVal('issuer-name'),
    issuerTax:        getVal('issuer-tax'),
    issuerAddress:    document.getElementById('issuer-address').value,
    issuerEmail:      getVal('issuer-email'),
    issuerPhone:      getVal('issuer-phone'),
    recipientName:    getVal('recipient-name'),
    recipientTax:     getVal('recipient-tax'),
    recipientAddress: document.getElementById('recipient-address').value,
    recipientEmail:   getVal('recipient-email'),
    recipientPhone:   getVal('recipient-phone'),
    items:            getItems(),
    notes:            document.getElementById('inv-notes').value,
    total:            getItems().reduce((s, i) => s + i.qty * i.price, 0),
  };
}

function loadInvoiceIntoForm(data) {
  document.getElementById('inv-number').value = data.invNumber || '';
  document.getElementById('inv-date').value   = data.invDate   || '';

  const sel = document.getElementById('currency-select');
  for (const opt of sel.options) {
    if (opt.value === data.currency) { opt.selected = true; break; }
  }

  document.getElementById('issuer-name').value       = data.issuerName       || '';
  document.getElementById('issuer-tax').value        = data.issuerTax        || '';
  document.getElementById('issuer-address').value    = data.issuerAddress    || '';
  document.getElementById('issuer-email').value      = data.issuerEmail      || '';
  document.getElementById('issuer-phone').value      = data.issuerPhone      || '';
  document.getElementById('recipient-name').value    = data.recipientName    || '';
  document.getElementById('recipient-tax').value     = data.recipientTax     || '';
  document.getElementById('recipient-address').value = data.recipientAddress || '';
  document.getElementById('recipient-email').value   = data.recipientEmail   || '';
  document.getElementById('recipient-phone').value   = data.recipientPhone   || '';
  document.getElementById('inv-notes').value         = data.notes            || '';

  const container = document.getElementById('items-container');
  container.innerHTML = '';
  (data.items || []).forEach(item => {
    const div = document.createElement('div');
    div.className = 'item-row';
    div.innerHTML = `
      <button class="remove-item" onclick="removeItem(this)" title="Remove">×</button>
      <div class="form-group">
        <label>Description</label>
        <input type="text" class="item-desc-input" oninput="updatePreview()">
      </div>
      <div class="item-numbers">
        <div class="form-group">
          <label>Qty</label>
          <input type="number" class="item-qty" value="${item.qty || 1}" min="1" step="1" oninput="updatePreview()">
        </div>
        <div class="form-group">
          <label>Unit Price</label>
          <input type="number" class="item-price" value="${item.price || 0}" min="0" step="0.01" oninput="updatePreview()">
        </div>
      </div>`;
    div.querySelector('.item-desc-input').value = item.desc || '';
    container.appendChild(div);
  });

  updatePreview();
}

function renderInvoicesList(invoices) {
  _savedInvoices = invoices;
  const list  = document.getElementById('invoices-list');
  const badge = document.getElementById('invoices-badge');
  if (!list) return;

  badge.textContent = invoices.length;

  if (!invoices.length) {
    list.innerHTML = '<p class="invoices-empty">No saved invoices yet.</p>';
    return;
  }

  list.innerHTML = invoices.map((inv, idx) => `
    <div class="invoice-row">
      <div class="invoice-row-info">
        <span class="invoice-row-num">#${escHtml(inv.invNumber)}</span>
        <span class="invoice-row-recipient">${escHtml(inv.recipientName)}</span>
        <span class="invoice-row-date">${inv.invDate ? formatDate(inv.invDate) : '—'}</span>
        <span class="invoice-row-total">${escHtml(inv.currencySymbol)} ${(inv.total || 0).toLocaleString()}</span>
      </div>
      <div class="invoice-row-actions">
        <button class="btn-load-inv" onclick="loadInvoiceIntoForm(_savedInvoices[${idx}])">Load</button>
        <button class="btn-del-inv"  onclick="window.deleteInvoice('${escHtml(inv.id)}')">Delete</button>
      </div>
    </div>
  `).join('');
}

async function saveCurrentInvoice() {
  const btn = document.querySelector('.btn-save');
  btn.disabled    = true;
  btn.textContent = 'Saving…';
  try {
    await window.saveInvoice(getFormData());
    btn.textContent = 'Saved ✓';
  } catch(e) {
    btn.textContent = 'Error — retry';
    console.error(e);
  } finally {
    setTimeout(() => { btn.disabled = false; btn.textContent = '⬆\u00a0 Save Invoice'; }, 1800);
  }
}

function toggleInvoicesPanel() {
  const wrap = document.getElementById('invoices-list-wrap');
  const icon = document.getElementById('invoices-toggle-icon');
  const open = wrap.style.display !== 'none';
  wrap.style.display = open ? 'none' : 'block';
  icon.textContent   = open ? '▸' : '▾';
}
