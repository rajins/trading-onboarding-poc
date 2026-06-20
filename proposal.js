const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3" x 7.5"
pres.title = "AI-Powered Onboarding Proposal";

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  navy:    "0F172A",
  teal:    "0D9488",
  tealLt:  "14B8A6",
  tealXLt: "CCFBF1",
  white:   "FFFFFF",
  offWhite:"F8FAFC",
  textDark:"1E293B",
  textMid: "475569",
  textMuted:"94A3B8",
  red:     "EF4444",
  amber:   "F59E0B",
  green:   "10B981",
};

const makeShadow = () => ({ type: "outer", blur: 12, offset: 3, angle: 135, color: "000000", opacity: 0.08 });

// ── Helpers ───────────────────────────────────────────────────────────────────
function dot(slide, x, y, color, size = 0.12) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: size, h: size, fill: { color }, line: { color, width: 0 } });
}

function pill(slide, x, y, w, h, color, text, textColor = "FFFFFF") {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color }, line: { color, width: 0 }, rectRadius: 0.12 });
  slide.addText(text, { x, y, w, h, fontSize: 9, bold: true, color: textColor, align: "center", valign: "middle", margin: 0 });
}

function card(slide, x, y, w, h) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h, fill: { color: C.white }, line: { color: "E2E8F0", width: 0.5 }, shadow: makeShadow(),
  });
}

function tealAccent(slide, x, y, h) {
  slide.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.06, h, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
}

function sectionLabel(slide, label) {
  slide.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 0.28, w: 1.4, h: 0.28, fill: { color: C.tealXLt }, line: { color: C.tealXLt, width: 0 } });
  slide.addText(label.toUpperCase(), { x: 0.5, y: 0.28, w: 1.4, h: 0.28, fontSize: 7.5, bold: true, color: C.teal, align: "center", valign: "middle", charSpacing: 2, margin: 0 });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Title
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.navy };

  // Large teal circle decoration (top-right)
  s.addShape(pres.shapes.OVAL, { x: 9.8, y: -1.2, w: 4.5, h: 4.5, fill: { color: C.teal, transparency: 80 }, line: { color: C.teal, width: 0 } });
  s.addShape(pres.shapes.OVAL, { x: 10.6, y: -0.5, w: 2.8, h: 2.8, fill: { color: C.teal, transparency: 65 }, line: { color: C.teal, width: 0 } });

  // Bottom-left small dots
  for (let i = 0; i < 6; i++) dot(s, 0.4 + i * 0.28, 6.9, C.teal, 0.08);

  // Tag
  s.addShape(pres.shapes.RECTANGLE, { x: 0.55, y: 1.4, w: 1.8, h: 0.32, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
  s.addText("POC PROPOSAL", { x: 0.55, y: 1.4, w: 1.8, h: 0.32, fontSize: 8.5, bold: true, color: C.white, align: "center", valign: "middle", charSpacing: 2, margin: 0 });

  // Title
  s.addText("AI-Powered Account\nOnboarding Platform", {
    x: 0.55, y: 1.95, w: 8.5, h: 2.2,
    fontSize: 46, bold: true, color: C.white, align: "left", valign: "top",
  });

  // Sub
  s.addText("Replacing 40+ legacy Spring services with Claude + MCP —\na dynamic, auditable, FCA-compliant onboarding engine.", {
    x: 0.55, y: 4.25, w: 8.0, h: 0.9,
    fontSize: 15, color: C.textMuted, align: "left",
  });

  // Bottom bar info
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 6.9, w: 13.3, h: 0.6, fill: { color: C.teal, transparency: 90 }, line: { color: C.teal, width: 0 } });
  s.addText("UK Retail Trading · FCA-Regulated · Demo Accounts POC · 8-Week Delivery", {
    x: 0.5, y: 6.92, w: 12, h: 0.56, fontSize: 10, color: C.tealLt, align: "left", valign: "middle",
  });
  s.addText("2026", { x: 11.8, y: 6.92, w: 1, h: 0.56, fontSize: 10, color: C.tealLt, align: "right", valign: "middle" });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — The Problem
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionLabel(s, "The Problem");

  s.addText("40+ Services.\nZero Agility.", {
    x: 0.5, y: 0.65, w: 6, h: 1.9, fontSize: 38, bold: true, color: C.textDark,
  });
  s.addText("Our legacy onboarding stack has become the biggest obstacle to growth.", {
    x: 0.5, y: 2.65, w: 5.8, h: 0.5, fontSize: 13.5, color: C.textMid,
  });

  // 4 pain cards
  const pains = [
    { icon: "6–18 mo", label: "Time to launch\na new product", color: C.red },
    { icon: "40+", label: "Spring Boot services\nto maintain", color: C.amber },
    { icon: "Implicit", label: "Routing logic hidden\nacross frontends", color: C.navy },
    { icon: "Manual", label: "Compliance updates\nrequire archaeology", color: C.teal },
  ];

  pains.forEach((p, i) => {
    const x = 0.5 + i * 3.15;
    card(s, x, 3.4, 2.85, 2.8);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 3.4, w: 2.85, h: 0.06, fill: { color: p.color }, line: { color: p.color, width: 0 } });
    s.addText(p.icon, { x, y: 3.55, w: 2.85, h: 0.95, fontSize: 28, bold: true, color: p.color, align: "center", valign: "middle" });
    s.addText(p.label, { x, y: 4.6, w: 2.85, h: 0.9, fontSize: 12, color: C.textMid, align: "center", valign: "top" });
  });

  // Right illustration — stylized tangled stack
  for (let i = 0; i < 7; i++) {
    const colors = [C.teal, C.navy, C.textMuted, C.tealLt, C.textDark, C.teal, C.navy];
    s.addShape(pres.shapes.RECTANGLE, {
      x: 10.0 + (i % 3) * 0.72, y: 0.8 + i * 0.6, w: 2.6, h: 0.42,
      fill: { color: colors[i], transparency: i * 8 }, line: { color: colors[i], width: 0 },
    });
    s.addText(`service-${String(i + 1).padStart(2, '0')}`, {
      x: 10.0 + (i % 3) * 0.72, y: 0.8 + i * 0.6, w: 2.6, h: 0.42,
      fontSize: 9, color: C.white, align: "center", valign: "middle", margin: 0,
    });
  }
  s.addText("…and 33 more", { x: 10.2, y: 5.1, w: 2.6, h: 0.3, fontSize: 9, color: C.textMuted, align: "center" });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — The Vision
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.navy };

  // Large teal geometric accent
  s.addShape(pres.shapes.RECTANGLE, { x: 7.0, y: 0, w: 6.3, h: 7.5, fill: { color: C.teal, transparency: 88 }, line: { color: C.teal, width: 0 } });
  s.addShape(pres.shapes.RECTANGLE, { x: 8.5, y: 0, w: 4.8, h: 7.5, fill: { color: C.teal, transparency: 80 }, line: { color: C.teal, width: 0 } });

  s.addText("VISION", { x: 0.55, y: 0.5, w: 2, h: 0.3, fontSize: 8.5, bold: true, color: C.teal, charSpacing: 3 });

  s.addText("One Intelligent\nOrchestrator.\nFive Clean Services.", {
    x: 0.55, y: 0.95, w: 7.5, h: 2.8, fontSize: 40, bold: true, color: C.white,
  });

  s.addText("Replace 40+ Java services with 5 focused MCP servers\nguided by a Claude AI orchestrator — deterministic compliance,\ndynamic UX, full audit trail.", {
    x: 0.55, y: 3.9, w: 6.5, h: 1.0, fontSize: 14, color: C.textMuted,
  });

  const pillars = ["Deterministic Rules", "AI Orchestration", "Full Audit Trail", "Dynamic UX"];
  pillars.forEach((p, i) => {
    s.addShape(pres.shapes.OVAL, { x: 0.55 + i * 3.1, y: 5.3, w: 0.22, h: 0.22, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
    s.addText(p, { x: 0.85 + i * 3.1, y: 5.3, w: 2.5, h: 0.22, fontSize: 12, bold: true, color: C.white, valign: "middle", margin: 0 });
  });

  // Right side — "before → after" mini viz
  s.addText("BEFORE", { x: 8.8, y: 1.2, w: 3.5, h: 0.3, fontSize: 9, bold: true, color: C.textMuted, align: "center", charSpacing: 2 });
  for (let i = 0; i < 5; i++) {
    s.addShape(pres.shapes.RECTANGLE, { x: 8.8 + (i % 2) * 1.8, y: 1.6 + i * 0.44, w: 3.4, h: 0.36, fill: { color: C.textMuted, transparency: 60 }, line: { color: C.textMuted, width: 0 } });
  }
  s.addText("✕ 40 more…", { x: 8.8, y: 3.9, w: 3.4, h: 0.3, fontSize: 9, color: C.textMuted, align: "center" });

  s.addShape(pres.shapes.RECTANGLE, { x: 9.4, y: 4.3, w: 0.04, h: 0.5, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
  s.addShape(pres.shapes.OVAL, { x: 9.3, y: 4.72, w: 0.24, h: 0.24, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });

  s.addText("AFTER", { x: 8.8, y: 5.1, w: 3.5, h: 0.3, fontSize: 9, bold: true, color: C.teal, align: "center", charSpacing: 2 });
  const servers = ["KYC", "Suitability", "Eligibility", "Disclosures", "Audit"];
  servers.forEach((sv, i) => {
    const col = i < 3 ? 0 : 1;
    const row = i < 3 ? i : i - 3;
    s.addShape(pres.shapes.RECTANGLE, { x: 8.8 + col * 1.85, y: 5.5 + row * 0.42, w: 1.65, h: 0.34, fill: { color: C.teal, transparency: 50 }, line: { color: C.teal, width: 0 } });
    s.addText(sv, { x: 8.8 + col * 1.85, y: 5.5 + row * 0.42, w: 1.65, h: 0.34, fontSize: 9, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — Architecture
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionLabel(s, "Architecture");

  s.addText("How It All Fits Together", {
    x: 0.5, y: 0.65, w: 8, h: 0.7, fontSize: 28, bold: true, color: C.textDark,
  });

  // Layer 1 — Frontend
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 1.6, w: 12.5, h: 0.9, fill: { color: C.navy, transparency: 5 }, line: { color: C.navy, width: 0 } });
  s.addText("FRONTEND  ·  Next.js 14  ·  Chat UI + Dynamic Form Renderer + Audit Panel", {
    x: 0.4, y: 1.6, w: 12.5, h: 0.9, fontSize: 12, bold: true, color: C.white, align: "center", valign: "middle",
  });

  // Arrow down
  s.addShape(pres.shapes.RECTANGLE, { x: 6.55, y: 2.5, w: 0.2, h: 0.3, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
  s.addText("Claude API", { x: 5.5, y: 2.5, w: 2.3, h: 0.3, fontSize: 8.5, color: C.teal, align: "center", bold: true });

  // Layer 2 — Orchestrator
  s.addShape(pres.shapes.RECTANGLE, { x: 3.5, y: 2.85, w: 6.3, h: 0.85, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
  s.addText("CLAUDE ORCHESTRATOR  ·  Agentic Loop  ·  Routes. Never decides.", {
    x: 3.5, y: 2.85, w: 6.3, h: 0.85, fontSize: 12, bold: true, color: C.white, align: "center", valign: "middle",
  });

  // Arrows down to MCP servers
  const mcpX = [0.5, 2.9, 5.3, 7.7, 10.1];
  mcpX.forEach(x => {
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.9, y: 3.75, w: 0.12, h: 0.35, fill: { color: C.textMuted }, line: { color: C.textMuted, width: 0 } });
  });

  // Layer 3 — MCP Servers
  const mcpServers = [
    { name: "KYC", sub: "verify_identity\ncheck_sanctions\nassess_vulnerability", color: C.navy },
    { name: "Suitability", sub: "appropriateness_test\nevaluate_experience\ncheck_retest_period", color: "1D4ED8" },
    { name: "Eligibility", sub: "get_eligible_products\nget_journey_steps", color: "7C3AED" },
    { name: "Disclosure", sub: "required_disclosures\nrisk_warnings\nconsumer_duty_content", color: "0F766E" },
    { name: "Audit ★", sub: "write_audit_event\nget_audit_trail\nsnapshot_decision", color: C.teal },
  ];

  mcpServers.forEach((mc, i) => {
    const x = mcpX[i];
    s.addShape(pres.shapes.RECTANGLE, { x, y: 4.15, w: 2.35, h: 1.7, fill: { color: mc.color }, line: { color: mc.color, width: 0 }, shadow: makeShadow() });
    s.addText(mc.name, { x, y: 4.2, w: 2.35, h: 0.42, fontSize: 12, bold: true, color: C.white, align: "center", valign: "middle" });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 4.65, w: 2.35, h: 0.02, fill: { color: C.white, transparency: 70 }, line: { color: C.white, width: 0 } });
    s.addText(mc.sub, { x, y: 4.7, w: 2.35, h: 1.05, fontSize: 8.5, color: C.white, align: "center", transparency: 20 });
  });

  // Arrow down to rules
  s.addShape(pres.shapes.RECTANGLE, { x: 6.55, y: 5.9, w: 0.2, h: 0.25, fill: { color: C.textMuted }, line: { color: C.textMuted, width: 0 } });

  // Layer 4 — Rules
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 6.2, w: 12.5, h: 0.9, fill: { color: C.tealXLt }, line: { color: C.tealLt, width: 1 } });
  s.addText("JSON RULES ENGINE  ·  rules/uk/eligibility.json  ·  suitability/{product}.json  ·  disclosures/{product}.json  ·  kyc.json", {
    x: 0.4, y: 6.2, w: 12.5, h: 0.9, fontSize: 10.5, bold: true, color: C.teal, align: "center", valign: "middle",
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — The Journey (How it works)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionLabel(s, "User Journey");

  s.addText("From 'I want an account' to 'You're live'\nin one intelligent conversation.", {
    x: 0.5, y: 0.65, w: 9, h: 1.1, fontSize: 24, bold: true, color: C.textDark,
  });

  const steps = [
    { n: "01", title: "Product Intent", desc: "Customer states product interest. Claude calls get_eligible_products + get_required_journey_steps.", color: C.navy },
    { n: "02", title: "KYC", desc: "Identity, sanctions, vulnerability checks — all deterministic. PASS/FAIL logged to audit.", color: "1D4ED8" },
    { n: "03", title: "Suitability", desc: "For CFD/Options: appropriateness test with FCA-compliant scoring. FAIL stops journey immediately.", color: "7C3AED" },
    { n: "04", title: "Disclosures", desc: "Pre-approved FCA text fetched verbatim from disclosure-server. Never AI-generated.", color: "0F766E" },
    { n: "05", title: "Account Setup", desc: "Preferences confirmed. Journey completed. Full audit trail written.", color: C.teal },
  ];

  steps.forEach((st, i) => {
    const x = 0.45 + i * 2.57;
    // Card
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.0, w: 2.35, h: 3.8, fill: { color: C.white }, line: { color: "E2E8F0", width: 0.5 }, shadow: makeShadow() });
    // Top color bar
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.0, w: 2.35, h: 0.5, fill: { color: st.color }, line: { color: st.color, width: 0 } });
    s.addText(st.n, { x, y: 2.0, w: 2.35, h: 0.5, fontSize: 14, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(st.title, { x: x + 0.12, y: 2.62, w: 2.1, h: 0.55, fontSize: 13, bold: true, color: C.textDark });
    s.addText(st.desc, { x: x + 0.12, y: 3.22, w: 2.1, h: 2.2, fontSize: 10.5, color: C.textMid });
    // Connector arrow
    if (i < 4) {
      s.addShape(pres.shapes.RECTANGLE, { x: x + 2.35, y: 3.85, w: 0.22, h: 0.05, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
    }
  });

  // Bottom note
  s.addShape(pres.shapes.RECTANGLE, { x: 0.45, y: 6.1, w: 12.4, h: 0.65, fill: { color: C.tealXLt }, line: { color: C.tealLt, width: 0.5 } });
  s.addText("★  Every tool call writes to the Audit MCP Server — input snapshot, decision, rule version, timestamp. Immutable. Deterministic.", {
    x: 0.7, y: 6.1, w: 12.1, h: 0.65, fontSize: 10.5, color: C.teal, valign: "middle", bold: true,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Compliance by Design
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionLabel(s, "Compliance");

  s.addText("Compliance is an\narchitectural property.", {
    x: 0.5, y: 0.65, w: 6.5, h: 1.55, fontSize: 30, bold: true, color: C.textDark,
  });

  // Left: 3 compliance principles
  const principles = [
    { title: "AI Never Decides", body: "Claude routes between MCP tools and communicates results. All PASS/FAIL decisions come from deterministic JSON rules.", icon: "✕" },
    { title: "Disclosures Are Fixed", body: "FCA-mandated disclosure text lives in versioned JSON files. Claude fetches and presents verbatim — never paraphrases.", icon: "📋" },
    { title: "Everything Is Audited", body: "Every tool call snapshot is written to an append-only SQLite audit log with rule version, input, output, and timestamp.", icon: "🔒" },
  ];

  principles.forEach((p, i) => {
    const y = 2.3 + i * 1.45;
    card(s, 0.5, y, 6.2, 1.28);
    tealAccent(s, 0.5, y, 1.28);
    s.addText(p.title, { x: 0.75, y: y + 0.12, w: 5.7, h: 0.38, fontSize: 13.5, bold: true, color: C.textDark });
    s.addText(p.body, { x: 0.75, y: y + 0.52, w: 5.7, h: 0.65, fontSize: 10.5, color: C.textMid });
  });

  // Right: Audit trail example
  card(s, 7.1, 1.4, 5.8, 5.75);
  s.addShape(pres.shapes.RECTANGLE, { x: 7.1, y: 1.4, w: 5.8, h: 0.5, fill: { color: C.navy }, line: { color: C.navy, width: 0 } });
  s.addText("SAMPLE AUDIT TRAIL — CFD Journey", { x: 7.1, y: 1.4, w: 5.8, h: 0.5, fontSize: 9, bold: true, color: C.white, align: "center", valign: "middle", charSpacing: 1, margin: 0 });

  const events = [
    { type: "JOURNEY_STARTED", tool: "—", decision: "—", color: C.textMuted },
    { type: "KYC_COMPLETED", tool: "verify_identity", decision: "PASS", color: C.green },
    { type: "RULE_EVALUATED", tool: "check_sanctions", decision: "PASS", color: C.green },
    { type: "SUITABILITY_INITIATED", tool: "get_appropriateness_questions", decision: "—", color: C.textMuted },
    { type: "SUITABILITY_COMPLETED", tool: "run_appropriateness_test", decision: "FAIL", color: C.red },
    { type: "JOURNEY_ABANDONED", tool: "—", decision: "—", color: C.textMuted },
  ];

  events.forEach((ev, i) => {
    const y = 2.08 + i * 0.82;
    s.addShape(pres.shapes.RECTANGLE, { x: 7.25, y, w: 5.5, h: 0.7, fill: { color: i % 2 === 0 ? "F8FAFC" : C.white }, line: { color: "F1F5F9", width: 0.3 } });
    s.addText(ev.type, { x: 7.32, y: y + 0.06, w: 3.2, h: 0.28, fontSize: 8.5, bold: true, color: C.textDark });
    s.addText(ev.tool, { x: 7.32, y: y + 0.35, w: 3.5, h: 0.24, fontSize: 8, color: C.textMuted });
    if (ev.decision !== "—") {
      const dc = ev.decision === "PASS" ? C.green : C.red;
      s.addShape(pres.shapes.RECTANGLE, { x: 10.8, y: y + 0.17, w: 0.85, h: 0.32, fill: { color: dc, transparency: 85 }, line: { color: dc, width: 0 } });
      s.addText(ev.decision, { x: 10.8, y: y + 0.17, w: 0.85, h: 0.32, fontSize: 8, bold: true, color: dc, align: "center", valign: "middle", margin: 0 });
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — Three Demo Scenarios
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionLabel(s, "Demo Scenarios");

  s.addText("Three Journeys. One Architecture.", {
    x: 0.5, y: 0.65, w: 12, h: 0.7, fontSize: 28, bold: true, color: C.textDark,
  });

  const scenarios = [
    {
      title: "ISA — Simple Path",
      badge: "HAPPY PATH",
      badgeColor: C.green,
      steps: ["Product selected: ISA", "KYC → PASS", "Disclosure presented", "Account created"],
      note: "3 steps. No appropriateness test required under FCA rules.",
      color: C.green,
    },
    {
      title: "CFD — Full Journey",
      badge: "COMPLEX PATH",
      badgeColor: C.teal,
      steps: ["Product selected: CFD", "KYC → PASS", "Appropriateness test (4 Qs) → PASS", "FCA 74% loss warning presented", "Account created"],
      note: "5 steps. COBS 10.2 appropriateness test with scoring.",
      color: C.teal,
    },
    {
      title: "CFD — Blocked",
      badge: "FAIL PATH",
      badgeColor: C.red,
      steps: ["Product selected: CFD", "KYC → PASS", "Appropriateness test → FAIL (score < 6)", "Journey stopped", "30-day retest window enforced"],
      note: "Claude cannot override. Deterministic rule. Audit logged.",
      color: C.red,
    },
  ];

  scenarios.forEach((sc, i) => {
    const x = 0.45 + i * 4.3;
    card(s, x, 1.6, 4.05, 5.55);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.6, w: 4.05, h: 0.06, fill: { color: sc.color }, line: { color: sc.color, width: 0 } });

    // Badge
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.15, y: 1.8, w: 1.5, h: 0.28, fill: { color: sc.badgeColor, transparency: 85 }, line: { color: sc.badgeColor, width: 0 } });
    s.addText(sc.badge, { x: x + 0.15, y: 1.8, w: 1.5, h: 0.28, fontSize: 7.5, bold: true, color: sc.badgeColor, align: "center", valign: "middle", margin: 0 });

    s.addText(sc.title, { x: x + 0.15, y: 2.2, w: 3.75, h: 0.55, fontSize: 15, bold: true, color: C.textDark });

    sc.steps.forEach((step, si) => {
      const sy = 2.9 + si * 0.58;
      s.addShape(pres.shapes.OVAL, { x: x + 0.15, y: sy + 0.06, w: 0.22, h: 0.22, fill: { color: sc.color, transparency: 80 }, line: { color: sc.color, width: 0 } });
      s.addText(`${si + 1}`, { x: x + 0.15, y: sy + 0.06, w: 0.22, h: 0.22, fontSize: 8, bold: true, color: sc.color, align: "center", valign: "middle", margin: 0 });
      s.addText(step, { x: x + 0.45, y: sy, w: 3.45, h: 0.38, fontSize: 10.5, color: C.textDark, valign: "middle" });
    });

    s.addShape(pres.shapes.RECTANGLE, { x, y: 6.72, w: 4.05, h: 0.38, fill: { color: sc.color, transparency: 90 }, line: { color: sc.color, width: 0 } });
    s.addText(sc.note, { x: x + 0.12, y: 6.72, w: 3.82, h: 0.38, fontSize: 8.5, color: sc.color, valign: "middle", italic: true });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — 8-Week Delivery Plan
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionLabel(s, "Delivery Plan");

  s.addText("8-Week POC Roadmap", {
    x: 0.5, y: 0.65, w: 10, h: 0.7, fontSize: 28, bold: true, color: C.textDark,
  });

  const phases = [
    {
      phase: "Phase 1", weeks: "Weeks 1–2", title: "Foundation",
      items: ["Audit MCP Server (builds first)", "JSON rules all products", "Product eligibility server", "KYC + Sanctions server"],
      color: C.navy, w: 3.8,
    },
    {
      phase: "Phase 2", weeks: "Weeks 3–4", title: "Core Journey",
      items: ["Suitability + Disclosure servers", "Claude orchestrator + MCP client", "Chat UI + audit panel", "ISA + GIA end-to-end"],
      color: C.teal, w: 3.8,
    },
    {
      phase: "Phase 3", weeks: "Weeks 5–8", title: "Full Demo",
      items: ["CFD appropriateness test (PASS + FAIL)", "SIPP pension declaration", "All 5 products wired", "Compliance dashboard + demo script"],
      color: "7C3AED", w: 4.4,
    },
  ];

  let cx = 0.45;
  phases.forEach((ph) => {
    card(s, cx, 1.65, ph.w, 5.35);
    s.addShape(pres.shapes.RECTANGLE, { x: cx, y: 1.65, w: ph.w, h: 0.7, fill: { color: ph.color }, line: { color: ph.color, width: 0 } });
    s.addText(ph.phase, { x: cx, y: 1.65, w: ph.w, h: 0.38, fontSize: 11, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(ph.weeks, { x: cx, y: 2.02, w: ph.w, h: 0.32, fontSize: 9, color: C.white, align: "center", valign: "middle", transparency: 20, margin: 0 });
    s.addText(ph.title, { x: cx + 0.18, y: 2.5, w: ph.w - 0.3, h: 0.5, fontSize: 15, bold: true, color: C.textDark });

    ph.items.forEach((item, ii) => {
      const iy = 3.15 + ii * 0.68;
      s.addShape(pres.shapes.OVAL, { x: cx + 0.18, y: iy + 0.08, w: 0.18, h: 0.18, fill: { color: ph.color }, line: { color: ph.color, width: 0 } });
      s.addText(item, { x: cx + 0.44, y: iy, w: ph.w - 0.6, h: 0.38, fontSize: 11, color: C.textMid, valign: "middle" });
    });

    cx += ph.w + 0.2;
  });

  // Week bar below
  s.addShape(pres.shapes.RECTANGLE, { x: 0.45, y: 7.08, w: 12.4, h: 0.18, fill: { color: "E2E8F0" }, line: { color: "E2E8F0", width: 0 } });
  for (let w = 1; w <= 8; w++) {
    const wx = 0.45 + (w - 1) * 1.55;
    const isPhase1 = w <= 2, isPhase2 = w <= 4;
    const wc = isPhase1 ? C.navy : isPhase2 ? C.teal : "7C3AED";
    s.addShape(pres.shapes.RECTANGLE, { x: wx, y: 7.08, w: 1.45, h: 0.18, fill: { color: wc, transparency: w % 2 === 0 ? 20 : 0 }, line: { color: wc, width: 0 } });
    s.addText(`W${w}`, { x: wx, y: 7.1, w: 1.45, h: 0.14, fontSize: 7.5, bold: true, color: C.white, align: "center", margin: 0 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — Why This. Why Now.
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.offWhite };
  sectionLabel(s, "The Case");

  s.addText("Why This. Why Now.", {
    x: 0.5, y: 0.65, w: 8, h: 0.7, fontSize: 28, bold: true, color: C.textDark,
  });

  const args = [
    { stat: "40+", label: "services consolidated\ninto 5 MCP servers", color: C.navy },
    { stat: "8 wks", label: "from zero to full\ndemo POC", color: C.teal },
    { stat: "100%", label: "deterministic compliance\ndecisions", color: C.green },
    { stat: "0", label: "code changes needed\nto add a new region", color: "7C3AED" },
  ];

  args.forEach((a, i) => {
    const x = 0.45 + i * 3.15;
    card(s, x, 1.65, 2.9, 2.5);
    s.addText(a.stat, { x, y: 1.75, w: 2.9, h: 1.0, fontSize: 44, bold: true, color: a.color, align: "center", valign: "middle" });
    s.addText(a.label, { x, y: 2.85, w: 2.9, h: 0.85, fontSize: 11, color: C.textMid, align: "center" });
  });

  // Why MCP specifically
  s.addText("Why MCP (Model Context Protocol)?", { x: 0.5, y: 4.4, w: 12, h: 0.45, fontSize: 14, bold: true, color: C.textDark });

  const mcpArgs = [
    { title: "Independently deployable", body: "Each compliance domain is its own service. Test, update, and version rules without touching others." },
    { title: "Tool-calling is auditable", body: "Every Claude → MCP interaction is a discrete, loggable event. Built-in auditability." },
    { title: "Swap orchestrators freely", body: "MCP is model-agnostic. Today Claude. Tomorrow any LLM. Rules stay stable." },
    { title: "Region = a prompt", body: "Adding UK → SG onboarding means a new system prompt + new rules JSON. No new services." },
  ];

  mcpArgs.forEach((m, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.45 + col * 6.3, y = 5.0 + row * 1.0;
    tealAccent(s, x, y, 0.78);
    s.addText(m.title, { x: x + 0.2, y: y + 0.02, w: 5.8, h: 0.35, fontSize: 12, bold: true, color: C.textDark });
    s.addText(m.body, { x: x + 0.2, y: y + 0.38, w: 5.8, h: 0.38, fontSize: 10.5, color: C.textMid });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — Next Steps / CTA
// ═══════════════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  s.background = { color: C.navy };

  // Teal geometric
  s.addShape(pres.shapes.OVAL, { x: -1.5, y: 3.5, w: 5, h: 5, fill: { color: C.teal, transparency: 88 }, line: { color: C.teal, width: 0 } });
  s.addShape(pres.shapes.OVAL, { x: -0.8, y: 4.2, w: 3, h: 3, fill: { color: C.teal, transparency: 75 }, line: { color: C.teal, width: 0 } });

  s.addText("NEXT STEPS", { x: 0.6, y: 0.55, w: 3, h: 0.3, fontSize: 8.5, bold: true, color: C.teal, charSpacing: 3 });

  s.addText("Ready to demo\nin 8 weeks.", {
    x: 0.6, y: 0.95, w: 9, h: 1.9, fontSize: 44, bold: true, color: C.white,
  });

  s.addText("The POC is scaffolded and running locally. Here's what we need to proceed:", {
    x: 0.6, y: 2.9, w: 8.5, h: 0.45, fontSize: 13, color: C.textMuted,
  });

  const nexts = [
    { n: "1", text: "Assign a Compliance SME to map Consumer Duty obligations to the 5 UK products" },
    { n: "2", text: "Confirm ANTHROPIC_API_KEY access and hosting environment (local Docker or cloud)" },
    { n: "3", text: "Sign off on the 3 demo scenarios: ISA happy path, CFD PASS, CFD FAIL" },
    { n: "4", text: "Schedule Week 1 kick-off — audit server is already built and verified" },
  ];

  nexts.forEach((n, i) => {
    const y = 3.5 + i * 0.82;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.6, y, w: 0.42, h: 0.42, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
    s.addText(n.n, { x: 0.6, y, w: 0.42, h: 0.42, fontSize: 13, bold: true, color: C.white, align: "center", valign: "middle", margin: 0 });
    s.addText(n.text, { x: 1.15, y: y + 0.04, w: 7.6, h: 0.38, fontSize: 12, color: C.white, valign: "middle" });
  });

  // Bottom
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 6.9, w: 13.3, h: 0.6, fill: { color: C.teal }, line: { color: C.teal, width: 0 } });
  s.addText("trading-onboarding-poc · Claude + MCP · FCA-Regulated UK Retail · 8-Week Delivery", {
    x: 0.5, y: 6.92, w: 10, h: 0.56, fontSize: 10.5, color: C.white, valign: "middle",
  });
  s.addText("2026", { x: 11.8, y: 6.92, w: 1, h: 0.56, fontSize: 10.5, color: C.white, align: "right", valign: "middle" });

  // Right: tech stack mini
  s.addText("TECH STACK", { x: 9.5, y: 1.0, w: 3.3, h: 0.28, fontSize: 8, bold: true, color: C.teal, charSpacing: 2, align: "center" });
  const stack = ["Claude Sonnet 4.6", "@modelcontextprotocol/sdk", "Next.js 14 · Tailwind", "better-sqlite3 · Zod", "Docker Compose"];
  stack.forEach((item, i) => {
    s.addShape(pres.shapes.RECTANGLE, { x: 9.5, y: 1.38 + i * 0.52, w: 3.3, h: 0.4, fill: { color: C.teal, transparency: 80 }, line: { color: C.teal, transparency: 60, width: 0.5 } });
    s.addText(item, { x: 9.5, y: 1.38 + i * 0.52, w: 3.3, h: 0.4, fontSize: 10, color: C.white, align: "center", valign: "middle", margin: 0 });
  });
}

// ── Write ─────────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: "trading-onboarding-proposal.pptx" })
  .then(() => console.log("✓ trading-onboarding-proposal.pptx written"))
  .catch(err => { console.error(err); process.exit(1); });
