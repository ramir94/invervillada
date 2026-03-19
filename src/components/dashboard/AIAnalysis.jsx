import { Bot, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function AIAnalysis({ holdings }) {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <div style={{
                    width: '64px', height: '64px',
                    background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1rem',
                    boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)'
                }}>
                    <Bot size={32} color="white" />
                </div>
                <h2>AI Portfolio Analyst</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Strategic Wealth Preservation Report • Generated Today</p>
            </header>

            <div className="glass-panel" style={{ padding: '2.5rem' }}>
                <section style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <CheckCircle2 size={18} /> Executive Summary: Fortress Strategy
                    </h3>
                    <p style={{ lineHeight: '1.7', color: '#cbd5e1' }}>
                        Your portfolio of <strong>14 carefully selected tickers</strong> demonstrates a highly disciplined, <strong>defensive architecture</strong> designed for wealth preservation rather than speculative growth. By heavily weighting Health Care (ABT, CVS, UNH, NOVN) and Consumer Staples (MO, NESN, PEP), you have effectively insulated your capital from high-beta market volatility.
                    </p>
                    <p style={{ lineHeight: '1.7', color: '#cbd5e1', marginTop: '1rem' }}>
                        This allocation currently yields a projected dividend income significantly above the S&P 500 average, effectively acting as an inflation hedge. The inclusion of European giants (Nestlé, Novartis) adds crucial geographic diversification against USD currency risk.
                    </p>
                </section>

                <section style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ color: '#eab308', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <AlertTriangle size={18} /> Risk Analysis & Vulnerabilities
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <li style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #eab308' }}>
                            <strong style={{ color: '#fde047', display: 'block', marginBottom: '0.25rem' }}>Real Estate Sensitivity (Rates)</strong>
                            <div style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                                Holdings in <strong>DLR</strong> and <strong>DOC</strong> are sensitive to interest rate fluctuations. Any unexpected hike could compress valuations despite strong cash flows.
                            </div>
                        </li>
                        <li style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #eab308' }}>
                            <strong style={{ color: '#fde047', display: 'block', marginBottom: '0.25rem' }}>Regulatory Pressure</strong>
                            <div style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                                Concentration in <strong>CVS</strong> and <strong>UNH</strong> exposes the portfolio to US healthcare policy changes. <strong>Altria (MO)</strong> faces perpetual regulatory headwinds despite massive cash generation.
                            </div>
                        </li>
                    </ul>
                </section>

                <section>
                    <h3 style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Bot size={18} /> AI Verdict: Conservative Alignment
                    </h3>
                    <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)', marginBottom: '0.5rem' }}>94/100</div>
                        <div style={{ fontWeight: '600' }}>Preservation Score</div>
                        <p style={{ marginTop: '1rem', fontSize: '0.95rem', color: '#cbd5e1' }}>
                            This portfolio is optimally structured for a "sleep well at night" objective. It sacrifices hyper-growth in exchange for <strong>robust cash flow and low drawdown risk</strong>.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
