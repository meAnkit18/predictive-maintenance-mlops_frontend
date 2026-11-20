import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Check, CheckCircle2,
  ChevronDown, CircleHelp, Cpu, Gauge, Github, Info, LoaderCircle, RefreshCw,
  ShieldCheck, Thermometer, Wrench, Zap
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://16.178.24.87:8000").replace(/\/$/, "");

const initialForm = {
  machine_type: "M",
  air_temperature: "298.1",
  process_temperature: "308.6",
  rotational_speed: "1551",
  torque: "42.8",
  tool_wear: "108",
};

const sensors = [
  { key: "air_temperature", label: "Air temperature", unit: "K", icon: Thermometer, min: 250, max: 350, step: "0.1", hint: "Ambient temperature around the machine" },
  { key: "process_temperature", label: "Process temperature", unit: "K", icon: Thermometer, min: 250, max: 400, step: "0.1", hint: "Temperature during machine operation" },
  { key: "rotational_speed", label: "Rotational speed", unit: "rpm", icon: RefreshCw, min: 1, max: 5000, step: "1", hint: "Machine shaft rotation per minute" },
  { key: "torque", label: "Torque", unit: "Nm", icon: Gauge, min: 0, max: 100, step: "0.1", hint: "Rotational force applied to the shaft" },
  { key: "tool_wear", label: "Tool wear", unit: "min", icon: Wrench, min: 0, max: 300, step: "1", hint: "Accumulated tool usage time" },
];

function formatPercent(value) {
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function App() {
  const [form, setForm] = useState(initialForm);
  const [health, setHealth] = useState({ state: "checking", detail: "Connecting to inference API…" });
  const [lastChecked, setLastChecked] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const checkHealth = useCallback(async () => {
    setHealth((current) => ({ ...current, state: current.state === "online" ? "online" : "checking" }));
    try {
      const response = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`Health endpoint returned HTTP ${response.status}`);
      const data = await response.json();
      const ok = data.api_status === "healthy" && data.model_status === "loaded";
      setHealth({
        state: ok ? "online" : "degraded",
        detail: ok ? "API and model are ready" : "API responded, but model health needs attention",
      });
    } catch (err) {
      setHealth({ state: "offline", detail: err.name === "TimeoutError" ? "Health check timed out" : "API is unreachable — check EC2 and port 8000" });
    } finally {
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const timer = setInterval(checkHealth, 30000);
    return () => clearInterval(timer);
  }, [checkHealth]);

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submitPrediction = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setPrediction(null);
    try {
      const payload = {
        machine_type: form.machine_type,
        air_temperature: Number(form.air_temperature),
        process_temperature: Number(form.process_temperature),
        rotational_speed: Number(form.rotational_speed),
        torque: Number(form.torque),
        tool_wear: Number(form.tool_wear),
      };
      const response = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = Array.isArray(body.detail) ? body.detail.map((item) => item.msg).join(", ") : body.detail;
        throw new Error(detail || `Prediction failed with HTTP ${response.status}`);
      }
      setPrediction(body);
      setHistory((current) => [{ ...body, id: Date.now(), machine: form.machine_type, probability: body.failure_probability }, ...current].slice(0, 5));
    } catch (err) {
      setError(err.name === "TimeoutError" ? "The model did not respond in time. Check that the EC2 API is running." : `${err.message}. Confirm the backend is reachable and CORS permits this website.`);
    } finally {
      setLoading(false);
      checkHealth();
    }
  };

  const machineLabel = useMemo(() => ({ L: "Low", M: "Medium", H: "High" }[form.machine_type]), [form.machine_type]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="ForgeSense home">
          <span className="brand-mark"><Activity size={21} strokeWidth={2.5} /></span>
          <span><strong>ForgeSense</strong><small>INDUSTRIAL INTELLIGENCE</small></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <a className="nav-item active" href="#overview"><Gauge size={17} /> Overview <span className="nav-dot" /></a>
        <a className="nav-item" href="#prediction"><Activity size={17} /> Live prediction</a>
        <a className="nav-item" href="#history"><RefreshCw size={17} /> Prediction history</a>
        <div className="sidebar-bottom">
          <div className="sidebar-card">
            <div className="mini-icon"><ShieldCheck size={17}/></div>
            <strong>Model serving</strong>
            <p>Random Forest classifier running through FastAPI.</p>
            <span className={`mini-status ${health.state}`}><i />{health.state === "online" ? "Operational" : health.state === "checking" ? "Checking" : health.state === "degraded" ? "Degraded" : "Offline"}</span>
          </div>
          <a className="github-link" href="https://github.com/meAnkit18/predictive-maintenance-mlops" target="_blank" rel="noreferrer"><Github size={16}/> Backend repository <ArrowUpRight size={14}/></a>
          <div className="sidebar-foot">PREDICTIVE MAINTENANCE <span>v1.0.0</span></div>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div>
          <div className="top-actions">
            <span className="environment"><span /> LIVE ENVIRONMENT</span>
            <div className="avatar">FS</div>
          </div>
        </header>

        <div className="page-wrap">
          <section className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> MACHINE LEARNING / INFERENCE</div>
              <h1>Predictive maintenance<span>.</span></h1>
              <p>Monitor machine health and detect potential failures before they happen.</p>
            </div>
            <button className="outline-button" onClick={checkHealth} disabled={health.state === "checking"}><RefreshCw size={15} className={health.state === "checking" ? "spin" : ""}/> Refresh status</button>
          </section>

          <section className="status-grid">
            <div className="status-card api-card">
              <div className="status-card-top"><span className="card-icon green"><Activity size={18}/></span><span className="card-kicker">INFERENCE API</span><span className={`live-pill ${health.state}`}><i />{health.state === "online" ? "ONLINE" : health.state === "checking" ? "CHECKING" : health.state === "degraded" ? "DEGRADED" : "OFFLINE"}</span></div>
              <div className="status-value">{health.state === "online" ? "Connected" : health.state === "checking" ? "Connecting…" : health.state === "degraded" ? "Needs attention" : "Unreachable"}</div>
              <p>{health.detail}</p>
              <div className="status-foot"><span>FastAPI</span><span>·</span><span>EC2 instance</span></div>
            </div>
            <div className="status-card">
              <div className="status-card-top"><span className="card-icon purple"><Cpu size={18}/></span><span className="card-kicker">MODEL</span></div>
              <div className="status-value">Random Forest</div>
              <p>Supervised binary classifier</p>
              <div className="status-foot"><span>Scikit-learn</span><span>·</span><span>Joblib artifact</span></div>
            </div>
            <div className="status-card">
              <div className="status-card-top"><span className="card-icon amber"><Zap size={18}/></span><span className="card-kicker">PREDICTIONS THIS SESSION</span></div>
              <div className="status-value">{history.length.toString().padStart(2, "0")}</div>
              <p>Predictions made in this browser session</p>
              <div className="status-foot"><span>Live session</span><span>·</span><span>Not persisted</span></div>
            </div>
          </section>

          <div className="section-title" id="prediction"><div><span className="section-index">01</span><h2>Run a prediction</h2></div><span className="section-note">ENTER MACHINE SENSOR DATA</span></div>
          <section className="work-grid">
            <form className="panel prediction-panel" onSubmit={submitPrediction}>
              <div className="panel-heading">
                <div><h3>Machine parameters</h3><p>Configure the sensor readings for the machine.</p></div>
                <span className="required-label">6 INPUT FEATURES</span>
              </div>

              <div className="machine-type-block">
                <div className="field-label">Machine type <span className="field-muted">· Product quality</span></div>
                <div className="type-selector">
                  {["L", "M", "H"].map((type) => <button type="button" key={type} onClick={() => setField("machine_type", type)} className={form.machine_type === type ? "type-option selected" : "type-option"}><b>{type}</b><span>{({L:"Low",M:"Medium",H:"High"})[type]}</span>{form.machine_type === type && <Check size={14}/>}</button>)}
                </div>
                <p className="field-hint">Selected: {machineLabel} quality product ({form.machine_type})</p>
              </div>

              <div className="input-grid">
                {sensors.map(({ key, label, unit, icon: Icon, min, max, step, hint }) => (
                  <label className="input-field" key={key}>
                    <span className="field-label"><span className="field-icon"><Icon size={15}/></span>{label}<span className="unit-label">{unit}</span></span>
                    <span className="input-wrap"><input type="number" required min={min} max={max} step={step} value={form[key]} onChange={(e) => setField(key, e.target.value)} /><span>{unit}</span></span>
                    <span className="field-hint">{hint}</span>
                  </label>
                ))}
              </div>
              <div className="form-bottom">
                <button className="text-button" type="button" onClick={() => {setForm(initialForm);setPrediction(null);setError("");}}>Reset values</button>
                <button className="primary-button" type="submit" disabled={loading || health.state !== "online"}>{loading ? <><LoaderCircle size={16} className="spin"/> Analyzing…</> : <><Activity size={16}/> Analyze machine <ArrowUpRight size={15}/></>}</button>
              </div>
              {health.state !== "online" && <div className="inline-warning"><Info size={15}/> Prediction is disabled until the API health check passes.</div>}
            </form>

            <div className="panel result-panel">
              <div className="panel-heading result-heading"><div><h3>Analysis result</h3><p>Model output for the selected readings.</p></div><span className="result-tag">LIVE OUTPUT</span></div>
              {!prediction && !loading && !error && <div className="empty-result"><div className="empty-orbit"><div><Activity size={27}/></div></div><strong>Waiting for sensor data</strong><p>Submit the machine parameters to see the model’s prediction and estimated failure probability.</p><span className="empty-foot"><CircleHelp size={13}/> Predictions are generated by your deployed model</span></div>}
              {loading && <div className="empty-result"><div className="loading-orbit"><LoaderCircle size={34}/></div><strong>Analyzing sensor readings</strong><p>Sending data to the FastAPI inference service…</p><div className="loading-track"><span/></div></div>}
              {error && <div className="error-result"><span><AlertTriangle size={22}/></span><strong>Prediction failed</strong><p>{error}</p><button className="outline-button" onClick={() => setError("")}>Dismiss</button></div>}
              {prediction && <div className="prediction-output">
                <div className={prediction.machine_failure === 1 ? "result-symbol danger" : "result-symbol success"}>{prediction.machine_failure === 1 ? <AlertTriangle size={27}/> : <CheckCircle2 size={27}/>}</div>
                <div className="result-kicker">MODEL CLASSIFICATION</div>
                <h2 className={prediction.machine_failure === 1 ? "danger-text" : "success-text"}>{prediction.machine_failure === 1 ? "Failure detected" : "No failure detected"}</h2>
                <p className="result-description">{prediction.machine_failure === 1 ? "The model has identified a possible machine failure. Inspect the machine and schedule maintenance." : "The model did not identify a machine failure from the provided sensor readings."}</p>
                <div className="probability-block"><div className="probability-head"><span>Failure probability</span><strong>{formatPercent(prediction.failure_probability)}</strong></div><div className="probability-track"><span style={{width: formatPercent(prediction.failure_probability)}} className={prediction.machine_failure === 1 ? "danger-fill" : ""}/></div><div className="probability-foot"><span>0% probability</span><span>100% probability</span></div></div>
                <div className="output-meta"><span>Prediction class</span><strong>{prediction.machine_failure}</strong><span>Machine type</span><strong>{form.machine_type}</strong></div>
                <div className="disclaimer"><Info size={14}/> Model output is an estimate, not a guarantee. Use qualified maintenance judgment.</div>
              </div>}
              <div className="result-bottom"><span><span className={`tiny-dot ${health.state}`}/> {health.state === "online" ? "Inference service ready" : "Service connection pending"}</span><a href={`${API_BASE}/docs`} target="_blank" rel="noreferrer">API documentation <ArrowUpRight size={12}/></a></div>
            </div>
          </section>

          <div className="section-title history-title" id="history"><div><span className="section-index">02</span><h2>Recent predictions</h2></div><span className="section-note">CURRENT BROWSER SESSION</span></div>
          <section className="panel history-panel">
            {history.length === 0 ? <div className="history-empty"><span><Activity size={17}/></span><div><strong>No predictions yet</strong><p>Your latest model outputs will appear here after the first analysis.</p></div></div> : <div className="history-list">
              {history.map((item) => <div className="history-row" key={item.id}><span className={item.machine_failure === 1 ? "history-icon danger-bg" : "history-icon success-bg"}>{item.machine_failure === 1 ? <AlertTriangle size={16}/> : <Check size={16}/>}</span><div className="history-main"><strong>{item.prediction}</strong><span>Machine type {item.machine} · {new Date(item.id).toLocaleTimeString()}</span></div><div className="history-prob"><span>Failure probability</span><strong>{formatPercent(item.probability)}</strong></div><span className={item.machine_failure === 1 ? "outcome-badge danger-badge" : "outcome-badge success-badge"}>{item.machine_failure === 1 ? "ATTENTION" : "NORMAL"}</span></div>)}
            </div>}
          </section>

          <footer className="page-footer"><span>FORGESENSE <b>·</b> PREDICTIVE MAINTENANCE</span><span>Powered by FastAPI + Scikit-learn <b>·</b> <a href="https://github.com/meAnkit18/predictive-maintenance-mlops_frontend" target="_blank" rel="noreferrer">Source code <ArrowUpRight size={11}/></a></span></footer>
        </div>
      </main>
    </div>
  );
}

export default App;
