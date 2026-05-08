import { useState, useEffect, useCallback } from "react";

const API = import.meta.env.VITE_API_URL;
if (!API) {
  throw new Error("VITE_API_URL is required. Add it in frontend environment variables.");
}

const NAVY = "#0a1f5c";
const PEACH = "#fde8d8";

const CRITICAL = [
  { id: "cr1", label: "Accuracy in Representing the Privacy Policy" },
  { id: "cr2", label: "Accurate Financial Information and Obligations" },
  { id: "cr3", label: "Prohibition of Direct Inquiry on Low CSAT Scores" },
  { id: "cr4", label: "Providing wrong information about the system" },
];

const CHAT_CRITERIA = [
  { group: "Communication", id: "cm1", label: "Professionalism in Communication", max: 5 },
  { group: "Communication", id: "cm2", label: "Use of Appropriate and Empathetic Language", max: 5 },
  { group: "Communication", id: "cm3", label: "Language Accuracy (Spelling & Grammar)", max: 5 },
  { group: "Compliance with Scripts", id: "sc1", label: "Use of Prescribed Greeting Script", max: 5 },
  { group: "Compliance with Scripts", id: "sc2", label: "Offering Extra Assistance", max: 5 },
  { group: "Compliance with Scripts", id: "sc3", label: "Commitment to follow up process", max: 5 },
  { group: "Compliance with Scripts", id: "sc4", label: "Use of Prescribed Closing Script", max: 5 },
  { group: "Responsiveness", id: "rs1", label: "Prompt Reply After Initial Response", max: 7.5 },
  { group: "Responsiveness", id: "rs2", label: "Compliance with Hold Time Policy", max: 5 },
  { group: "Diagnostic and Information Accuracy", id: "da1", label: "Complete Diagnosis of Issues and Inquiries", max: 7.5 },
  { group: "Diagnostic and Information Accuracy", id: "da2", label: "Accuracy in Data Entry", max: 5 },
  { group: "Diagnostic and Information Accuracy", id: "da3", label: "Accuracy and Completeness of Information", max: 10 },
];

const CALL_CRITERIA = [
  { group: "Communication", id: "cm1", label: "Clarity & Courtesy in Phone Communication", max: 5 },
  { group: "Communication", id: "cm2", label: "Use of Appropriate and Empathetic Language", max: 5 },
  { group: "Communication", id: "cm3", label: "Demonstrating Patience & Tolerance", max: 5 },
  { group: "Compliance with Scripts", id: "sc1", label: "Use of Prescribed Greeting Script", max: 5 },
  { group: "Compliance with Scripts", id: "sc2", label: "Proactive Support Script", max: 5 },
  { group: "Compliance with Scripts", id: "sc3", label: "Use of Prescribed Closing Script", max: 5 },
  { group: "Responsiveness", id: "rs1", label: "Call Duration Management", max: 5 },
  { group: "Responsiveness", id: "rs2", label: "Effective Active Listening", max: 5 },
  { group: "Responsiveness", id: "rs3", label: "Call Duration & Commitment to Follow-Up", max: 5 },
  { group: "Diagnostic and Information Accuracy", id: "da1", label: "Complete Diagnosis of Issues and Inquiries", max: 5 },
  { group: "Diagnostic and Information Accuracy", id: "da2", label: "Accuracy in Data Entry", max: 5 },
  { group: "Diagnostic and Information Accuracy", id: "da3", label: "Accuracy & Completeness of Information", max: 5 },
];

const TICKET_TYPES = ["Inquiry", "Complaint", "Technical Issue", "Bug Report", "Feature Request", "Other"];
const CHANNELS = ["Live Chat", "Phone Call", "Email"];

function getCriteria(ch) {
  return ch === "Phone Call" ? CALL_CRITERIA : CHAT_CRITERIA;
}

function emptyCard(no, agentName = "", auditor = "") {
  const scores = {};
  const notes = {};
  const criticals = {};
  const criticalNotes = {};
  CHAT_CRITERIA.forEach((c) => {
    scores[c.id] = c.max;
    notes[c.id] = "";
  });
  CRITICAL.forEach((c) => {
    criticals[c.id] = "Pass";
    criticalNotes[c.id] = "";
  });
  return {
    no,
    date: "",
    agentName,
    auditor,
    ticketId: "",
    ticketType: "Inquiry",
    channel: "Live Chat",
    criticals,
    criticalNotes,
    scores,
    notes,
  };
}

function calcPct(card) {
  const cr = getCriteria(card.channel);
  const max = cr.reduce((s, c) => s + c.max, 0);
  const earned = cr.reduce((s, c) => s + (parseFloat(card.scores?.[c.id]) ?? c.max), 0);
  return max > 0 ? Math.round((earned / max) * 100) : 100;
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

function exportToExcel(cards, agentName) {
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="UTF-8">
  <style>
    body{font-family:Calibri,Arial,sans-serif;font-size:11pt}
    td,th{border:1px solid #d1d5db;padding:5px 8px;vertical-align:middle}
    table{border-collapse:collapse;width:780px;margin-bottom:24px}
    .navy{background:#0a1f5c;color:#fff;font-weight:bold}
    .pass{color:#166534;font-weight:bold;text-align:center}
    .fail{color:#991b1b;font-weight:bold;text-align:center}
    .grp{background:#f0f4ff;font-weight:600}
  </style></head><body>`;

  cards.forEach((card) => {
    const cr = getCriteria(card.channel);
    const score = calcPct(card);
    const sc = score >= 90 ? "#166534" : score >= 75 ? "#1e40af" : score >= 60 ? "#92400e" : "#991b1b";
    const groups = [];
    cr.forEach((c) => {
      let g = groups.find((it) => it.name === c.group);
      if (!g) {
        g = { name: c.group, items: [] };
        groups.push(g);
      }
      g.items.push(c);
    });

    html += `<table>
      <tr><td colspan="4" class="navy" style="text-align:center;font-size:13pt">Evaluation Card ${card.no}</td></tr>
      <tr><td class="navy" style="text-align:right">Card No:</td><td colspan="3"><b>${card.no}</b></td></tr>
      <tr><td class="navy" style="text-align:right">Ticket Date:</td><td colspan="3">${card.date || "—"}</td></tr>
      <tr><td class="navy" style="text-align:right">Auditor:</td><td colspan="3"><b>${card.auditor || "—"}</b></td></tr>
      <tr><td class="navy" style="text-align:right">Agent Name:</td><td colspan="3"><b>${card.agentName || "—"}</b></td></tr>
      <tr><td class="navy" style="text-align:right">Ticket ID:</td><td colspan="3">${card.ticketId || "—"}</td></tr>
      <tr><td class="navy" style="text-align:right">Ticket Type:</td><td colspan="3">${card.ticketType}</td></tr>
      <tr><td class="navy" style="text-align:right">Ticket Channel:</td><td colspan="3">${card.channel}</td></tr>
      <tr><th class="navy" colspan="2">Critical Errors</th><th class="navy">Status</th><th class="navy">Note</th></tr>`;

    CRITICAL.forEach((c) => {
      const st = card.criticals?.[c.id] || "Pass";
      html += `<tr style="background:#fff7f7"><td style="color:#991b1b;font-weight:500">Critical Errors</td><td>${c.label}</td>
        <td class="${st === "Pass" ? "pass" : "fail"}">${st}</td><td>${card.criticalNotes?.[c.id] || ""}</td></tr>`;
    });

    html += `<tr><th class="navy">Group</th><th class="navy">Criteria</th><th class="navy">Score</th><th class="navy">Note</th></tr>`;
    groups.forEach((g) =>
      g.items.forEach((c, ci) => {
        const s = parseFloat(card.scores?.[c.id] ?? c.max);
        const ded = s < c.max;
        html += `<tr style="background:${ded ? "#fff7ed" : "#fff"}">
        <td class="grp">${ci === 0 ? g.name : ""}</td><td>${c.label}</td>
        <td style="text-align:center;font-weight:bold;color:${ded ? "#991b1b" : "#166534"}">${s} / ${c.max}</td>
        <td>${card.notes?.[c.id] || ""}</td></tr>`;
      })
    );

    html += `<tr><td colspan="2" style="background:#0a1f5c"></td>
      <td style="background:#0a1f5c;text-align:center;font-weight:bold;font-size:14pt;color:${sc}">${score}%</td>
      <td style="background:#0a1f5c;color:rgba(255,255,255,0.6);font-size:10pt">${score >= 90 ? "Excellent" : score >= 75 ? "Good" : score >= 60 ? "Needs Improvement" : "Poor"}</td></tr>
    </table>`;
  });

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${agentName || "QA"}_${new Date().toISOString().slice(0, 7)}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      localStorage.setItem("qa_token", data.token);
      localStorage.setItem("qa_user", JSON.stringify(data));
      onLogin(data);
    } catch {
      setError("اسم المستخدم أو كلمة المرور غير صحيحة");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: PEACH, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: "2rem", width: 320, border: `2px solid ${NAVY}` }}>
        <div style={{ display: "grid", gap: 10 }}>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Password"
          />
          {error && <p style={{ margin: 0, color: "#991b1b", fontSize: 12, textAlign: "center" }}>{error}</p>}
          <button onClick={handleLogin} disabled={loading}>
            {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("qa_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [tab, setTab] = useState(0);
  const [cards, setCards] = useState(() => Array.from({ length: 10 }, (_, i) => emptyCard(i + 1)));
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [dashData, setDashData] = useState([]);

  const token = localStorage.getItem("qa_token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const logout = useCallback(() => {
    localStorage.removeItem("qa_token");
    localStorage.removeItem("qa_user");
    setUser(null);
  }, []);

  useEffect(() => {
    if (!user) return;
    setAgents(user.agents || []);
    if (user.agents?.length) setSelectedAgent(user.agents[0]);
  }, [user]);

  const loadCards = useCallback(async () => {
    if (!selectedAgent || !currentMonth || !token) return;
    try {
      const data = await apiFetch(`/api/cards/${encodeURIComponent(selectedAgent)}/${currentMonth}`, { headers });
      if (Array.isArray(data) && data.length > 0) {
        const filled = Array.from({ length: 10 }, (_, i) => {
          const found = data.find((c) => c.cardNo === i + 1);
          return found || emptyCard(i + 1, selectedAgent, user?.username);
        });
        setCards(filled);
      } else {
        setCards(Array.from({ length: 10 }, (_, i) => emptyCard(i + 1, selectedAgent, user?.username)));
      }
    } catch {
      logout();
    }
  }, [selectedAgent, currentMonth, token, user?.username, logout]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  useEffect(() => {
    if (tab !== 10 || !currentMonth || !token) return;
    apiFetch(`/api/dashboard/${currentMonth}`, { headers })
      .then(setDashData)
      .catch(() => logout());
  }, [tab, currentMonth, token, logout]);

  const card = cards[tab] || cards[0];
  const criteria = getCriteria(card.channel);

  function updateCard(upd) {
    setCards((prev) => prev.map((c, i) => (i === tab ? { ...c, ...upd } : c)));
  }

  function setScore(id, val) {
    const max = criteria.find((c) => c.id === id)?.max ?? 5;
    updateCard({ scores: { ...card.scores, [id]: Math.min(max, Math.max(0, parseFloat(val) || 0)) } });
  }

  function handleChannelChange(ch) {
    const cr = getCriteria(ch);
    const scores = {};
    const notes = {};
    cr.forEach((c) => {
      scores[c.id] = c.max;
      notes[c.id] = "";
    });
    updateCard({ channel: ch, scores, notes });
  }

  async function saveCard() {
    setSaving(true);
    setSaveMsg("");
    try {
      const payload = {
        ...card,
        agentName: selectedAgent,
        cardNo: card.no,
        month: currentMonth,
        auditor: user?.username,
        scorePercent: calcPct(card),
      };
      await apiFetch("/api/cards", { method: "POST", headers, body: JSON.stringify(payload) });
      setSaveMsg("Saved");
      setTimeout(() => setSaveMsg(""), 2500);
    } catch (e) {
      setSaveMsg(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  const score = calcPct(card);
  const scoreColor = (s) => (s >= 90 ? "#166534" : s >= 75 ? "#1e40af" : s >= 60 ? "#92400e" : "#991b1b");
  const scoreBg = (s) => (s >= 90 ? "#dcfce7" : s >= 75 ? "#dbeafe" : s >= 60 ? "#fef3c7" : "#fee2e2");

  if (!user) return <LoginScreen onLogin={setUser} />;

  return (
    <div style={{ fontFamily: "sans-serif", background: PEACH, minHeight: "100vh" }}>
      <div style={{ background: NAVY, color: "#fff", padding: "10px 16px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Jisr - QA Evaluation Tool</p>
          <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>Quality Assurance Criteria V02 - 2025</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
            {agents.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <input type="month" value={currentMonth} onChange={(e) => setCurrentMonth(e.target.value)} />
          {tab < 10 && <div style={{ background: scoreBg(score), color: scoreColor(score), fontWeight: 700, borderRadius: 6, padding: "3px 12px" }}>{score}%</div>}
          <button onClick={saveCard} disabled={saving}>
            {saving ? "Saving..." : saveMsg || "Save"}
          </button>
          <button onClick={() => exportToExcel(cards, selectedAgent)}>Export XLS</button>
          <button onClick={logout}>Logout</button>
        </div>
      </div>

      <div style={{ background: NAVY, display: "flex", overflowX: "auto" }}>
        {cards.map((c, i) => (
          <button key={i} onClick={() => setTab(i)} style={{ background: tab === i ? PEACH : "transparent", border: "none", padding: "7px 13px" }}>
            Card_{i + 1}
            {c.ticketId && <span style={{ marginLeft: 6, color: "#f97316" }}>•</span>}
          </button>
        ))}
        <button onClick={() => setTab(10)} style={{ background: tab === 10 ? PEACH : "transparent", border: "none", padding: "7px 14px" }}>
          Dashboard
        </button>
      </div>

      {tab === 10 ? (
        <div style={{ padding: "1rem" }}>
          <p style={{ fontWeight: 600, fontSize: 14, color: NAVY, margin: "0 0 12px" }}>Dashboard - {currentMonth}</p>
          <div style={{ background: "#fff", borderRadius: 8, overflow: "hidden", border: `1px solid ${NAVY}22` }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: NAVY, color: "#fff" }}>
                  {["Agent", "Cards Evaluated", "Avg Score"].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 500 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => {
                  const d = dashData.find((x) => x._id === agent);
                  const avg = d ? Math.round(d.avgScore) : null;
                  return (
                    <tr key={agent}>
                      <td style={{ padding: "8px 12px", fontWeight: 500 }}>{agent}</td>
                      <td style={{ padding: "8px 12px" }}>{d ? d.cardCount : "—"} / 10</td>
                      <td style={{ padding: "8px 12px" }}>{avg !== null ? `${avg}%` : "No data"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ padding: "1rem" }}>
          <div style={{ background: "#fff", borderRadius: 8, padding: "1rem", border: `2px solid ${NAVY}` }}>
            <div style={{ display: "grid", gap: 8 }}>
              <input type="date" value={card.date} onChange={(e) => updateCard({ date: e.target.value })} />
              <input value={card.ticketId} onChange={(e) => updateCard({ ticketId: e.target.value })} placeholder="Ticket ID" />
              <select value={card.ticketType} onChange={(e) => updateCard({ ticketType: e.target.value })}>
                {TICKET_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <select value={card.channel} onChange={(e) => handleChannelChange(e.target.value)}>
                {CHANNELS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 12, background: "#fff", borderRadius: 8, padding: "1rem", border: `2px solid ${NAVY}` }}>
            {criteria.map((c) => (
              <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 1fr", gap: 8, marginBottom: 8 }}>
                <span>{c.label}</span>
                <input type="number" min={0} max={c.max} step={0.5} value={card.scores?.[c.id] ?? c.max} onChange={(e) => setScore(c.id, e.target.value)} />
                <input value={card.notes?.[c.id] || ""} onChange={(e) => updateCard({ notes: { ...card.notes, [c.id]: e.target.value } })} placeholder="Note" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
