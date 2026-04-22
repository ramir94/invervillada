import { useEffect } from 'react'
import { X, LogOut, AlertTriangle } from 'lucide-react'

// Drawer / overlay a pantalla completa para la pestaña "Más" del bottom nav móvil.
// Lista los items filtrados del sidebar, la info de sesión y el botón cerrar sesión.
export default function MobileMoreDrawer({
    open,
    onClose,
    items,
    activeTab,
    onSelect,
    userEmail,
    onSignOut,
    holdingsCount = 0,
    healthScore = null,
    totalAlertCount = 0,
    highAlertCount = 0,
}) {
    // Bloquear scroll del body cuando el drawer está abierto
    useEffect(() => {
        if (!open) return
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = previousOverflow }
    }, [open])

    // Cerrar con tecla Escape
    useEffect(() => {
        if (!open) return
        const handler = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [open, onClose])

    if (!open) return null

    const scoreColor = healthScore != null
        ? healthScore >= 70 ? 'var(--success)' : healthScore >= 50 ? '#eab308' : 'var(--danger)'
        : 'var(--text-secondary)'

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.78)',
                backdropFilter: 'blur(8px)',
                zIndex: 200,
                display: 'flex',
                alignItems: 'flex-end',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxHeight: '92vh',
                    overflowY: 'auto',
                    background: 'rgba(15, 23, 42, 0.98)',
                    backdropFilter: 'blur(16px)',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    borderTopLeftRadius: '16px',
                    borderTopRightRadius: '16px',
                    padding: '1.25rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom))',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    animation: 'drawerSlideUp 0.25s ease-out',
                }}
            >
                {/* Cabecera */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        Más opciones
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Cerrar"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '8px',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Grid de items */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                    {items.map(item => {
                        const isActive = activeTab === item.id
                        return (
                            <button
                                key={item.id}
                                onClick={() => { onSelect(item.id); onClose() }}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    padding: '1rem 0.5rem',
                                    minHeight: '80px',
                                    background: isActive ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.04)',
                                    border: isActive ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '10px',
                                    color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '0.82rem',
                                    fontWeight: isActive ? '600' : '500',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <item.icon size={22} />
                                <span>{item.label}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Resumen de cartera */}
                <div style={{
                    padding: '0.85rem 1rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                }}>
                    {healthScore != null && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                                <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Health Score</small>
                                <span style={{ color: scoreColor, fontWeight: '700', fontSize: '0.85rem' }}>{healthScore}/100</span>
                            </div>
                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${healthScore}%`,
                                    background: scoreColor,
                                    borderRadius: '3px',
                                    transition: 'width 0.5s',
                                }} />
                            </div>
                            {totalAlertCount > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.45rem', fontSize: '0.75rem', color: highAlertCount > 0 ? 'var(--danger)' : '#eab308' }}>
                                    <AlertTriangle size={11} />
                                    {totalAlertCount} alerta{totalAlertCount > 1 ? 's' : ''} activa{totalAlertCount > 1 ? 's' : ''}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Posiciones activas</small>
                        <span style={{ color: 'var(--accent-color)', fontWeight: '600', fontSize: '0.85rem' }}>
                            {holdingsCount} holdings
                        </span>
                    </div>
                </div>

                {/* Sesión */}
                <div style={{
                    padding: '0.85rem 1rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                }}>
                    {userEmail && (
                        <small style={{
                            color: 'var(--text-secondary)',
                            display: 'block',
                            marginBottom: '0.6rem',
                            fontSize: '0.78rem',
                            wordBreak: 'break-all',
                        }}>
                            {userEmail}
                        </small>
                    )}
                    <button
                        onClick={onSignOut}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            width: '100%',
                            minHeight: '44px',
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: '8px',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            padding: '0.6rem 1rem',
                        }}
                    >
                        <LogOut size={16} />
                        Cerrar sesión
                    </button>
                </div>
            </div>

            {/* Animación de entrada — se inyecta inline para evitar un CSS nuevo */}
            <style>{`
                @keyframes drawerSlideUp {
                    from { transform: translateY(100%); opacity: 0.3; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    )
}
