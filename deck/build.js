const pptxgen = require('pptxgenjs');

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.title = 'UK Trading Onboarding POC';

// ─── Palette ───────────────────────────────────────────
const C = {
  navy:    '0A2342',
  blue:    '065A82',
  teal:    '1C7293',
  mint:    '02C39A',
  ice:     'E8F4FD',
  white:   'FFFFFF',
  gray:    '64748B',
  light:   'F8FAFC',
  border:  'E2E8F0',
  text:    '1E293B',
  muted:   '94A3B8',
  amber:   'F59E0B',
  green:   '10B981',
  red:     'EF4444',
};

const shadow = () => ({ type: 'outer', color: '000000', blur: 8, offset: 2, angle: 135, opacity: 0.10 });

// ─── Slide helpers ─────────────────────────────────────
function titleSlide() {
  const sl = pres.addSlide();
  sl.background = { color: C.navy };

  // Left accent bar
  sl.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 5.625, fill: { color: C.mint } });

  // Tag line top right
  sl.addText('DEMO · POC', {
    x: 7.5, y: 0.4, w: 2.2, h: 0.35,
    fontSize: 9, color: C.mint, bold: true, align: 'right',
    fontFace: 'Calibri', charSpacing: 3, margin: 0,
  });

  // Main title
  sl.addText('AI-Powered UK Trading\nAccount Onboarding', {
    x: 0.6, y: 1.35, w: 9, h: 2,
    fontSize: 40, bold: true, color: C.white,
    fontFace: 'Calibri', align: 'left', valign: 'top', margin: 0,
  });

  // Subtitle
  sl.addText('Claude · MCP Servers · FCA Compliance · PostgreSQL · Next.js', {
    x: 0.6, y: 3.4, w: 8, h: 0.45,
    fontSize: 13, color: C.muted, fontFace: 'Calibri', align: 'left', margin: 0,
  });

  // Bottom stat strip
  const stats = [
    { n: '6', l: 'MCP Servers' },
    { n: '5', l: 'Products' },
    { n: '3', l: 'Databases' },
    { n: '100%', l: 'Deterministic Rules' },
  ];
  stats.forEach((s, i) => {
    const x = 0.6 + i * 2.35;
    sl.addShape(pres.shapes.RECTANGLE, { x, y: 4.5, w: 2.1, h: 0.85,
      fill: { color: C.blue }, shadow: shadow() });
    sl.addText(s.n, { x, y: 4.52, w: 2.1, h: 0.38,
      fontSize: 22, bold: true, color: C.mint, align: 'center', fontFace: 'Calibri', margin: 0 });
    sl.addText(s.l, { x, y: 4.88, w: 2.1, h: 0.3,
      fontSize: 9, color: C.muted, align: 'center', fontFace: 'Calibri', margin: 0 });
  });
  return sl;
}

// ─── Slide 1: Title ────────────────────────────────────
titleSlide();

// ─── Slide 2: Problem ──────────────────────────────────
{
  const sl = pres.addSlide();
  sl.background = { color: C.white };

  sl.addText('The Problem with Traditional Onboarding', {
    x: 0.5, y: 0.35, w: 9, h: 0.65,
    fontSize: 26, bold: true, color: C.navy, fontFace: 'Calibri', margin: 0,
  });

  const problems = [
    { icon: '⏱', title: 'Slow & Manual', body: 'Weeks of paper forms, wet signatures, and manual KYC checks. Customers drop off before completion.' },
    { icon: '⚠️', title: 'Compliance Risk', body: 'FCA rules (COBS 10.2, COBS 19) require precise journey steps per product. One mistake = regulatory exposure.' },
    { icon: '🔒', title: 'PII Scattered', body: 'Personal data stored in flat files or CRMs with no field-level encryption or access audit trail.' },
    { icon: '🤖', title: 'No Intelligence', body: 'Static forms can\'t adapt. Wrong questions asked, right ones missed. No memory across sessions.' },
  ];

  problems.forEach((p, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 4.75;
    const y = 1.25 + row * 2.0;

    sl.addShape(pres.shapes.RECTANGLE, { x, y, w: 4.35, h: 1.75,
      fill: { color: C.light }, line: { color: C.border, width: 1 }, shadow: shadow() });

    sl.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.1, h: 1.75, fill: { color: C.red } });

    sl.addText(p.icon + '  ' + p.title, { x: x + 0.18, y: y + 0.15, w: 4.0, h: 0.38,
      fontSize: 13, bold: true, color: C.text, fontFace: 'Calibri', margin: 0 });
    sl.addText(p.body, { x: x + 0.18, y: y + 0.52, w: 4.0, h: 1.1,
      fontSize: 11, color: C.gray, fontFace: 'Calibri', wrap: true, margin: 0 });
  });
}

// ─── Slide 3: Solution Overview ────────────────────────
{
  const sl = pres.addSlide();
  sl.background = { color: C.navy };

  sl.addText('The Solution', {
    x: 0.5, y: 0.35, w: 9, h: 0.55,
    fontSize: 28, bold: true, color: C.white, fontFace: 'Calibri', margin: 0,
  });

  sl.addText('Claude acts as an intelligent orchestrator. All compliance decisions stay in deterministic MCP servers — never in the LLM.',  {
    x: 0.5, y: 0.92, w: 9, h: 0.45,
    fontSize: 13, color: C.muted, fontFace: 'Calibri', margin: 0,
  });

  // Core principle box
  sl.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.5, w: 9, h: 0.75,
    fill: { color: C.mint }, shadow: shadow() });
  sl.addText('Claude orchestrates. MCP servers decide. Audit trail proves it.', {
    x: 0.5, y: 1.6, w: 9, h: 0.55,
    fontSize: 16, bold: true, color: C.navy, align: 'center', fontFace: 'Calibri', margin: 0,
  });

  const pillars = [
    { icon: '🧠', title: 'Claude Orchestrator', body: 'Guides the customer conversationally. Decides which MCP tool to call next. Never makes PASS/FAIL decisions.' },
    { icon: '⚙️', title: '6 MCP Servers', body: 'Personal Details, KYC, Suitability, Eligibility, Disclosure, Audit. Each owns its rules and data store.' },
    { icon: '📋', title: 'JSON Rules Engine', body: 'All FCA rules encoded in version-controlled JSON. Product journey steps, field requirements, scoring thresholds.' },
    { icon: '🗄️', title: '3 Domain Databases', body: 'Sessions, Audit events, and PII each in isolated PostgreSQL databases. AES-256-GCM field encryption for PII.' },
  ];

  pillars.forEach((p, i) => {
    const x = 0.5 + i * 2.28;
    sl.addShape(pres.shapes.RECTANGLE, { x, y: 2.55, w: 2.1, h: 2.5,
      fill: { color: C.blue }, shadow: shadow() });
    sl.addText(p.icon, { x, y: 2.65, w: 2.1, h: 0.5,
      fontSize: 22, align: 'center', fontFace: 'Calibri', margin: 0 });
    sl.addText(p.title, { x: x + 0.1, y: 3.2, w: 1.9, h: 0.5,
      fontSize: 11, bold: true, color: C.white, align: 'center', fontFace: 'Calibri', margin: 0 });
    sl.addText(p.body, { x: x + 0.1, y: 3.73, w: 1.9, h: 1.45,
      fontSize: 9.5, color: C.muted, fontFace: 'Calibri', wrap: true, margin: 0 });
  });
}

// ─── Slide 4: 3-Step User Flow ─────────────────────────
{
  const sl = pres.addSlide();
  sl.background = { color: C.white };

  sl.addText('Three-Step Onboarding Flow', {
    x: 0.5, y: 0.35, w: 9, h: 0.55,
    fontSize: 26, bold: true, color: C.navy, fontFace: 'Calibri', margin: 0,
  });

  const steps = [
    {
      num: '01',
      title: 'Product Selection',
      color: C.teal,
      items: ['ISA — Stocks & Shares', 'GIA — General Investment', 'CFD — Contracts for Diff.', 'SIPP — Personal Pension', 'OPTIONS — Derivatives'],
      note: 'Journey steps auto-determined\nby eligibility rules JSON',
    },
    {
      num: '02',
      title: 'Personal Details Form',
      color: C.blue,
      items: ['Full name + date of birth', 'NI number + UK address', 'Employment & income', 'PEP / FATCA declarations', 'Conditional fields by product'],
      note: 'AES-256-GCM encrypted\nper-field in onboarding_pii',
    },
    {
      num: '03',
      title: 'AI-Guided Journey',
      color: C.navy,
      items: ['KYC verification', 'Appropriateness test (if req.)', 'FCA disclosure text', 'Risk warnings verbatim', 'Account provisioning'],
      note: 'Claude + MCP tools\nFull audit trail in PostgreSQL',
    },
  ];

  steps.forEach((s, i) => {
    const x = 0.4 + i * 3.1;

    // Number badge
    sl.addShape(pres.shapes.OVAL, { x: x + 0.05, y: 1.0, w: 0.65, h: 0.65,
      fill: { color: s.color } });
    sl.addText(s.num, { x: x + 0.05, y: 1.0, w: 0.65, h: 0.65,
      fontSize: 13, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });

    // Arrow between steps
    if (i < 2) {
      sl.addShape(pres.shapes.RECTANGLE, { x: x + 2.9, y: 1.27, w: 0.25, h: 0.06,
        fill: { color: C.border } });
      sl.addText('▶', { x: x + 2.9, y: 1.17, w: 0.25, h: 0.26,
        fontSize: 10, color: C.muted, align: 'center', fontFace: 'Calibri', margin: 0 });
    }

    sl.addText(s.title, { x, y: 1.75, w: 2.9, h: 0.4,
      fontSize: 14, bold: true, color: s.color, fontFace: 'Calibri', margin: 0 });

    // Card
    sl.addShape(pres.shapes.RECTANGLE, { x, y: 2.2, w: 2.9, h: 2.2,
      fill: { color: C.light }, line: { color: C.border, width: 1 }, shadow: shadow() });
    sl.addShape(pres.shapes.RECTANGLE, { x, y: 2.2, w: 0.08, h: 2.2, fill: { color: s.color } });

    sl.addText(s.items.map(t => ({ text: t, options: { bullet: true, breakLine: true } })).map((o, j, a) =>
      j === a.length - 1 ? { ...o, options: { ...o.options, breakLine: false } } : o
    ), { x: x + 0.18, y: 2.3, w: 2.6, h: 1.85,
      fontSize: 11, color: C.text, fontFace: 'Calibri', margin: 0 });

    // Note box
    sl.addShape(pres.shapes.RECTANGLE, { x, y: 4.5, w: 2.9, h: 0.8,
      fill: { color: s.color } });
    sl.addText(s.note, { x: x + 0.1, y: 4.52, w: 2.7, h: 0.76,
      fontSize: 9.5, color: C.white, fontFace: 'Calibri', align: 'center', valign: 'middle', margin: 0 });
  });
}

// ─── Slide 5: Products ─────────────────────────────────
{
  const sl = pres.addSlide();
  sl.background = { color: C.light };

  sl.addText('5 FCA-Regulated Products', {
    x: 0.5, y: 0.3, w: 9, h: 0.55,
    fontSize: 26, bold: true, color: C.navy, fontFace: 'Calibri', margin: 0,
  });
  sl.addText('Each product has its own compliance journey, rules version, and disclosure requirements.', {
    x: 0.5, y: 0.85, w: 9, h: 0.35,
    fontSize: 12, color: C.gray, fontFace: 'Calibri', margin: 0,
  });

  const products = [
    { code: 'ISA', label: 'Stocks & Shares ISA', badge: 'No test', badgeColor: C.green, journey: 'PD → KYC → Disclosure → Account', fca: '—' },
    { code: 'GIA', label: 'General Investment Account', badge: 'No test', badgeColor: C.green, journey: 'PD → KYC → Disclosure → Account', fca: '—' },
    { code: 'CFD', label: 'Contracts for Difference', badge: 'Appropriateness test', badgeColor: C.amber, journey: 'PD → KYC → Suitability → Disclosure → Risk Warning → Account', fca: 'COBS 10.2 · 1:30 leverage · 70% loss warning' },
    { code: 'SIPP', label: 'Self-Invested Personal Pension', badge: 'Declaration required', badgeColor: C.blue, journey: 'PD → KYC → Suitability → Disclosure → Pension Decl → Account', fca: 'COBS 19' },
    { code: 'OPTIONS', label: 'Options & Derivatives', badge: 'Appropriateness test', badgeColor: C.amber, journey: 'PD → KYC → Suitability → Disclosure → Risk Warning → Account', fca: 'COBS 10.2 · Score ≥ 4/6' },
  ];

  products.forEach((p, i) => {
    const y = 1.1 + i * 0.83;
    sl.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 9, h: 0.77,
      fill: { color: C.white }, line: { color: C.border, width: 1 }, shadow: shadow() });

    // Product code badge
    sl.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 0.75, h: 0.77,
      fill: { color: C.navy } });
    sl.addText(p.code, { x: 0.5, y, w: 0.75, h: 0.77,
      fontSize: 11, bold: true, color: C.mint, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });

    sl.addText(p.label, { x: 1.35, y: y + 0.06, w: 3.0, h: 0.3,
      fontSize: 12, bold: true, color: C.text, fontFace: 'Calibri', margin: 0 });

    // Badge
    sl.addShape(pres.shapes.RECTANGLE, { x: 1.35, y: y + 0.4, w: 1.5, h: 0.24,
      fill: { color: p.badgeColor } });
    sl.addText(p.badge, { x: 1.35, y: y + 0.4, w: 1.5, h: 0.24,
      fontSize: 8.5, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });

    // FCA ref
    if (p.fca !== '—') {
      sl.addText(p.fca, { x: 2.95, y: y + 0.42, w: 2.5, h: 0.22,
        fontSize: 8.5, color: C.gray, fontFace: 'Calibri', margin: 0 });
    }

    sl.addText(p.journey, { x: 5.5, y: y + 0.12, w: 3.85, h: 0.5,
      fontSize: 9, color: C.gray, fontFace: 'Calibri', wrap: true, margin: 0 });
  });
}

// ─── Slide 6: Personal Details Form ────────────────────
{
  const sl = pres.addSlide();
  sl.background = { color: C.white };

  sl.addText('Personal Details Form', {
    x: 0.5, y: 0.3, w: 6, h: 0.55,
    fontSize: 26, bold: true, color: C.navy, fontFace: 'Calibri', margin: 0,
  });

  // Left: form fields preview
  const fields = [
    { label: 'Full legal name', type: 'e.g. John Smith', w: 4.5 },
    { label: 'Date of birth', type: 'YYYY-MM-DD', w: 2.1 },
    { label: 'Nationality', type: 'United Kingdom', w: 2.1 },
    { label: 'National Insurance number', type: 'e.g. AB 12 34 56 C', w: 4.5 },
    { label: 'Address', type: '123 High Street, London, SW1A 1AA', w: 4.5 },
    { label: 'Employment status', type: 'Select...', w: 4.5 },
  ];

  fields.forEach((f, i) => {
    const y = 1.05 + i * 0.63;
    sl.addText(f.label, { x: 0.5, y, w: 4.5, h: 0.2,
      fontSize: 9, bold: true, color: C.gray, fontFace: 'Calibri', margin: 0 });
    sl.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: y + 0.22, w: f.w, h: 0.3,
      fill: { color: C.light }, line: { color: C.border, width: 1 } });
    sl.addText(f.type, { x: 0.55, y: y + 0.22, w: f.w - 0.1, h: 0.3,
      fontSize: 9, color: C.muted, valign: 'middle', fontFace: 'Calibri', margin: 0 });
  });

  // Conditional fields note
  sl.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 4.9, w: 4.5, h: 0.5,
    fill: { color: 'FEF3C7' }, line: { color: C.amber, width: 1 } });
  sl.addText('⚡ Conditional fields auto-shown by product: Income band & Source of wealth (CFD/SIPP/OPTIONS) · Tax residency (SIPP/GIA)', {
    x: 0.6, y: 4.92, w: 4.3, h: 0.46,
    fontSize: 9, color: '92400E', fontFace: 'Calibri', wrap: true, margin: 0,
  });

  // Right panel
  sl.addShape(pres.shapes.RECTANGLE, { x: 5.5, y: 1.0, w: 4.0, h: 4.4,
    fill: { color: C.navy }, shadow: shadow() });

  sl.addText('FCA Compliance Built-in', { x: 5.65, y: 1.15, w: 3.7, h: 0.38,
    fontSize: 14, bold: true, color: C.mint, fontFace: 'Calibri', margin: 0 });

  const points = [
    ['🔐', 'AES-256-GCM', 'Field-level encryption per customer. 12-byte random IV per field. Key never logged.'],
    ['🏦', 'NI Validation', 'UK NI regex enforced client-side and server-side before save.'],
    ['📮', 'Postcode Check', 'UK postcode format validated. Invalid formats blocked.'],
    ['📋', 'PEP / FATCA', 'Explicit declaration checkboxes. PEP flag written to immutable audit trail.'],
    ['🔞', 'Age ≥ 18', 'Date of birth validated server-side. Under-18s blocked at save.'],
  ];

  points.forEach(([icon, title, body], i) => {
    const y = 1.7 + i * 0.72;
    sl.addText(icon, { x: 5.6, y, w: 0.4, h: 0.3, fontSize: 13, fontFace: 'Calibri', margin: 0 });
    sl.addText(title, { x: 6.05, y, w: 3.3, h: 0.25, fontSize: 10, bold: true, color: C.white, fontFace: 'Calibri', margin: 0 });
    sl.addText(body, { x: 6.05, y: y + 0.27, w: 3.3, h: 0.35, fontSize: 9, color: C.muted, fontFace: 'Calibri', wrap: true, margin: 0 });
  });
}

// ─── Slide 7: Architecture ──────────────────────────────
{
  const sl = pres.addSlide();
  sl.background = { color: C.navy };

  sl.addText('System Architecture', {
    x: 0.5, y: 0.3, w: 9, h: 0.55,
    fontSize: 26, bold: true, color: C.white, fontFace: 'Calibri', margin: 0,
  });

  // Layer: Frontend
  sl.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.0, w: 9, h: 0.62,
    fill: { color: C.teal }, shadow: shadow() });
  sl.addText('FRONTEND · Next.js 14 · Chat UI + Audit Panel · Product Selector · Personal Details Form', {
    x: 0.6, y: 1.0, w: 8.8, h: 0.62,
    fontSize: 11, bold: true, color: C.white, valign: 'middle', fontFace: 'Calibri', margin: 0,
  });

  // Arrow down
  sl.addText('▼', { x: 4.7, y: 1.65, w: 0.5, h: 0.3, fontSize: 12, color: C.muted, align: 'center', fontFace: 'Calibri', margin: 0 });
  sl.addText('REST proxy  /api/chat', { x: 3.75, y: 1.65, w: 2.5, h: 0.3, fontSize: 8, color: C.muted, align: 'center', fontFace: 'Calibri', margin: 0 });

  // Layer: Orchestrator
  sl.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 2.0, w: 9, h: 0.65,
    fill: { color: C.blue }, shadow: shadow() });
  sl.addText('CLAUDE ORCHESTRATOR · Express · Agentic Loop · O(1) Map<toolName,Client> dispatch · appendAndSave sessions', {
    x: 0.6, y: 2.0, w: 8.8, h: 0.65,
    fontSize: 11, bold: true, color: C.white, valign: 'middle', fontFace: 'Calibri', margin: 0,
  });

  // Arrow + label
  sl.addText('▼ stdio subprocesses', { x: 3.8, y: 2.7, w: 2.5, h: 0.28,
    fontSize: 8, color: C.muted, align: 'center', fontFace: 'Calibri', margin: 0 });

  // MCP servers row
  const servers = ['PII\nServer', 'KYC\nServer', 'Suitability\nServer', 'Eligibility\nServer', 'Disclosure\nServer', 'Audit\nServer'];
  const serverColors = [C.mint, '3B82F6', '8B5CF6', '06B6D4', 'F59E0B', 'EF4444'];
  servers.forEach((s, i) => {
    const x = 0.5 + i * 1.52;
    sl.addShape(pres.shapes.RECTANGLE, { x, y: 3.05, w: 1.38, h: 0.75,
      fill: { color: serverColors[i] }, shadow: shadow() });
    sl.addText(s, { x, y: 3.05, w: 1.38, h: 0.75,
      fontSize: 9.5, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });
  });

  // Rules + DB row
  sl.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 4.0, w: 4.3, h: 0.75,
    fill: { color: C.teal }, shadow: shadow() });
  sl.addText('📋 JSON Rules Engine\nrules/uk/*.json — eligibility · kyc · suitability · disclosures', {
    x: 0.6, y: 4.0, w: 4.1, h: 0.75,
    fontSize: 9, color: C.white, valign: 'middle', fontFace: 'Calibri', margin: 0,
  });

  sl.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 4.0, w: 4.3, h: 0.75,
    fill: { color: C.blue }, shadow: shadow() });
  sl.addText('🗄️ PostgreSQL · 3 Databases\nonboarding_sessions  ·  onboarding_audit  ·  onboarding_pii', {
    x: 5.3, y: 4.0, w: 4.1, h: 0.75,
    fontSize: 9, color: C.white, valign: 'middle', fontFace: 'Calibri', margin: 0,
  });
}

// ─── Slide 8: Compliance & Audit ───────────────────────
{
  const sl = pres.addSlide();
  sl.background = { color: C.white };

  sl.addText('Compliance & Audit Trail', {
    x: 0.5, y: 0.3, w: 9, h: 0.55,
    fontSize: 26, bold: true, color: C.navy, fontFace: 'Calibri', margin: 0,
  });

  // Left: what Claude never does
  sl.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.0, w: 4.3, h: 0.38,
    fill: { color: C.red } });
  sl.addText('❌ What Claude NEVER Does', { x: 0.5, y: 1.0, w: 4.3, h: 0.38,
    fontSize: 12, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });

  const nevers = [
    'Make a PASS / FAIL compliance decision',
    'Generate disclosure or risk warning text',
    'Reorder FCA-mandated journey steps',
    'Override an appropriateness test FAIL',
    'Store or log the PII encryption key',
  ];
  sl.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.38, w: 4.3, h: 2.6,
    fill: { color: C.light }, line: { color: C.border, width: 1 } });
  sl.addText(nevers.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < nevers.length - 1 } })), {
    x: 0.65, y: 1.5, w: 4.0, h: 2.3,
    fontSize: 11, color: C.text, fontFace: 'Calibri', paraSpaceAfter: 4, margin: 0,
  });

  // Right: what gets audited
  sl.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.0, w: 4.3, h: 0.38,
    fill: { color: C.green } });
  sl.addText('✅ Every Event Audited', { x: 5.2, y: 1.0, w: 4.3, h: 0.38,
    fontSize: 12, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });

  const events = [
    'PERSONAL_DETAILS_COMPLETED',
    'KYC_COMPLETED · SANCTIONS_CHECKED',
    'SUITABILITY_COMPLETED (score + threshold)',
    'PEP_FLAGGED · FATCA_FLAGGED',
    'DISCLOSURE_PRESENTED (text hash)',
  ];
  sl.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.38, w: 4.3, h: 2.6,
    fill: { color: C.light }, line: { color: C.border, width: 1 } });
  sl.addText(events.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < events.length - 1 } })), {
    x: 5.35, y: 1.5, w: 4.0, h: 2.3,
    fontSize: 11, color: C.text, fontFace: 'Calibri', fontFace2: 'Consolas', paraSpaceAfter: 4, margin: 0,
  });

  // JSON example
  sl.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 4.1, w: 9, h: 1.25,
    fill: { color: C.navy } });
  sl.addText(
    '{ "event_type": "SUITABILITY_COMPLETED",  "decision": "FAIL",  "tool_name": "run_appropriateness_test",\n  "input_snapshot": { "product_code": "CFD", "answers": { "q1": "none" } },\n  "output_snapshot": { "score": 3, "pass_threshold": 6 },  "rule_version": "1.0.0" }',
    { x: 0.65, y: 4.12, w: 8.7, h: 1.2,
      fontSize: 9, color: C.mint, fontFace: 'Consolas', valign: 'middle', margin: 0 });
}

// ─── Slide 9: Demo Flow ISA vs CFD ─────────────────────
{
  const sl = pres.addSlide();
  sl.background = { color: C.light };

  sl.addText('Demo: ISA vs CFD Journey Comparison', {
    x: 0.5, y: 0.3, w: 9, h: 0.55,
    fontSize: 24, bold: true, color: C.navy, fontFace: 'Calibri', margin: 0,
  });

  const cols = [
    {
      title: 'ISA  —  Simple Path',
      titleBg: C.green,
      steps: [
        ['1', 'Select ISA', C.green],
        ['2', 'Fill personal details form', C.teal],
        ['3', 'KYC: identity + sanctions', C.blue],
        ['4', 'Receive ISA disclosure text', C.teal],
        ['5', 'Account created ✓', C.green],
      ],
      note: 'No appropriateness test required.\nTypical: 5–7 minutes.',
    },
    {
      title: 'CFD  —  Full Compliance Path',
      titleBg: C.amber,
      steps: [
        ['1', 'Select CFD', C.amber],
        ['2', 'Fill personal details + income + source of wealth', C.teal],
        ['3', 'KYC: identity + sanctions + vulnerability check', C.blue],
        ['4', 'Appropriateness test: 4 questions, score ≥ 6/12', C.amber],
        ['4F', 'FAIL → 30-day retest enforced (Claude cannot override)', C.red],
        ['5', 'FCA disclosure: COBS 10.2 + 70% loss warning', C.navy],
        ['6', 'Account created ✓', C.green],
      ],
      note: 'COBS 10.2 · 1:30 leverage limit.\nFAIL path terminates journey.',
    },
  ];

  cols.forEach((col, ci) => {
    const x = 0.45 + ci * 4.8;

    sl.addShape(pres.shapes.RECTANGLE, { x, y: 1.0, w: 4.4, h: 0.42,
      fill: { color: col.titleBg } });
    sl.addText(col.title, { x, y: 1.0, w: 4.4, h: 0.42,
      fontSize: 12, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });

    col.steps.forEach((step, si) => {
      const [num, label, color] = step;
      const sy = 1.52 + si * 0.46;
      sl.addShape(pres.shapes.OVAL, { x: x + 0.05, y: sy, w: 0.36, h: 0.36, fill: { color } });
      sl.addText(num, { x: x + 0.05, y: sy, w: 0.36, h: 0.36,
        fontSize: 9, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });
      sl.addText(label, { x: x + 0.5, y: sy + 0.04, w: 3.85, h: 0.34,
        fontSize: 9.5, color: num === '4F' ? C.red : C.text, fontFace: 'Calibri',
        bold: num === '4F', margin: 0 });
    });

    const noteY = 1.55 + col.steps.length * 0.46;
    sl.addShape(pres.shapes.RECTANGLE, { x, y: noteY, w: 4.4, h: 0.62,
      fill: { color: col.titleBg } });
    sl.addText(col.note, { x: x + 0.1, y: noteY + 0.04, w: 4.2, h: 0.54,
      fontSize: 9, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });
  });
}

// ─── Slide 10: Tech Stack ──────────────────────────────
{
  const sl = pres.addSlide();
  sl.background = { color: C.white };

  sl.addText('Technology Stack', {
    x: 0.5, y: 0.3, w: 9, h: 0.55,
    fontSize: 26, bold: true, color: C.navy, fontFace: 'Calibri', margin: 0,
  });

  const layers = [
    {
      layer: 'AI & Protocol',
      color: C.navy,
      items: [
        ['Claude Sonnet 4.6', 'Anthropic LLM orchestrator. Agentic loop with tool use.'],
        ['MCP SDK', 'Model Context Protocol — stdio transport, JSON-RPC 2.0.'],
        ['Shared Factory', 'createMcpServer() — one pattern for all 6 servers.'],
      ],
    },
    {
      layer: 'Backend',
      color: C.blue,
      items: [
        ['Express 4', 'Orchestrator HTTP server. /chat, /audit/:id, /sessions.'],
        ['TypeScript 5', 'Strict mode. Zod schemas for all MCP tool inputs.'],
        ['PostgreSQL 16', '3 isolated databases. JSONB messages. pg pool per server.'],
      ],
    },
    {
      layer: 'Frontend',
      color: C.teal,
      items: [
        ['Next.js 14', 'App Router. /api proxy routes. 3-step onboarding flow.'],
        ['React 18', 'Client components. useRef for scroll, useEffect for auto-send.'],
        ['Tailwind CSS 3', 'Utility-first. Conditional field rendering. Responsive layout.'],
      ],
    },
    {
      layer: 'Security',
      color: C.mint,
      items: [
        ['AES-256-GCM', 'Field-level PII encryption. 12-byte IV. Auth tag verified on read.'],
        ['Lazy key init', 'Encryption key resolved at first use, not at module import.'],
        ['Domain isolation', 'Sessions, Audit, PII in separate DBs. Separate connection pools.'],
      ],
    },
  ];

  layers.forEach((layer, li) => {
    const col = li % 2;
    const row = Math.floor(li / 2);
    const x = 0.5 + col * 4.75;
    const y = 1.05 + row * 2.15;

    sl.addShape(pres.shapes.RECTANGLE, { x, y, w: 4.4, h: 0.36,
      fill: { color: layer.color } });
    sl.addText(layer.layer, { x, y, w: 4.4, h: 0.36,
      fontSize: 11, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });

    layer.items.forEach((item, i) => {
      const iy = y + 0.42 + i * 0.54;
      sl.addShape(pres.shapes.RECTANGLE, { x, y: iy, w: 4.4, h: 0.48,
        fill: { color: i % 2 === 0 ? C.light : C.white }, line: { color: C.border, width: 0.5 } });
      sl.addText(item[0], { x: x + 0.12, y: iy + 0.04, w: 1.5, h: 0.22,
        fontSize: 10, bold: true, color: layer.color, fontFace: 'Calibri', margin: 0 });
      sl.addText(item[1], { x: x + 0.12, y: iy + 0.25, w: 4.15, h: 0.2,
        fontSize: 9, color: C.gray, fontFace: 'Calibri', margin: 0 });
    });
  });
}

// ─── Slide 11: Closing ─────────────────────────────────
{
  const sl = pres.addSlide();
  sl.background = { color: C.navy };

  sl.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 5.625, fill: { color: C.mint } });

  sl.addText('Key Differentiators', {
    x: 0.6, y: 0.35, w: 8.8, h: 0.55,
    fontSize: 28, bold: true, color: C.white, fontFace: 'Calibri', margin: 0,
  });

  const diffs = [
    { icon: '🧠', title: 'LLM orchestrates, rules decide', body: 'Claude never makes compliance calls. Every PASS/FAIL comes from deterministic JSON rules. Provable in the audit trail.' },
    { icon: '📜', title: 'Immutable audit trail', body: 'Every tool call writes an event to PostgreSQL. Session ID, customer ID, decision, input snapshot, output snapshot, rule version.' },
    { icon: '🔐', title: 'Field-level encryption', body: 'AES-256-GCM with per-field random IV. PII database is isolated. Key loaded lazily from env, never logged.' },
    { icon: '⚡', title: 'O(1) tool dispatch', body: 'Map<toolName, Client> built at startup. Zero fan-out, zero try/catch probing. Parallel tool calls via Promise.all.' },
    { icon: '🔧', title: 'Rules-as-config', body: 'Add a new product or region by adding a JSON file. No MCP server code changes required. Rules path is env-configurable.' },
    { icon: '🐳', title: 'Docker-first', body: '3 domain databases provisioned by init script. Orchestrator and frontend in the same compose file. One command to run.' },
  ];

  diffs.forEach((d, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.6 + col * 3.1;
    const y = 1.1 + row * 2.0;

    sl.addShape(pres.shapes.RECTANGLE, { x, y, w: 2.85, h: 1.85,
      fill: { color: C.blue }, shadow: shadow() });
    sl.addShape(pres.shapes.RECTANGLE, { x, y, w: 2.85, h: 0.08, fill: { color: C.mint } });

    sl.addText(d.icon + '  ' + d.title, { x: x + 0.12, y: y + 0.15, w: 2.6, h: 0.38,
      fontSize: 11, bold: true, color: C.white, fontFace: 'Calibri', margin: 0 });
    sl.addText(d.body, { x: x + 0.12, y: y + 0.55, w: 2.6, h: 1.15,
      fontSize: 9.5, color: C.muted, fontFace: 'Calibri', wrap: true, margin: 0 });
  });
}

// ─── Write file ────────────────────────────────────────
pres.writeFile({ fileName: 'trading-onboarding-deck.pptx' })
  .then(() => console.log('✅  trading-onboarding-deck.pptx written'))
  .catch(e => { console.error(e); process.exit(1); });
