import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

/**
 * Dashboard principal con mosaico de modulos habilitados segun permisos del usuario.
 * RF-03: Visualizar dinamicamente el panel de inicio con los modulos habilitados.
 * En esta vista el sidebar esta oculto; al hacer click en un modulo se navega
 * al primer submenu y el sidebar aparece normalmente.
 */
const Home = () => {
    const user = useSelector(state => state.user)?.user;
    const allModules = useSelector(state => state.modules)?.modules || [];
    const modules = allModules.filter(mod => mod.id !== 0);
    const navigate = useNavigate();

    /**
     * Navega al primer submenu visible del modulo.
     * Busca el primer menu padre que tenga hijos visibles, y usa el path del primer hijo.
     * Si no encuentra hijos, usa el path del menu padre directamente.
     */
    const handleModuleClick = (mod) => {
        const menus = mod.menus || [];
        for (const menu of menus) {
            // Buscar primer hijo visible
            const visibleChildren = (menu.childrens || []).filter(c => c.visible !== false);
            if (visibleChildren.length > 0) {
                navigate(`/${mod.url}/${visibleChildren[0].path}`);
                return;
            }
            // Si el menu padre tiene path y es visible
            if (menu.path && menu.visible !== false) {
                navigate(`/${mod.url}/${menu.path}`);
                return;
            }
        }
        if (mod.url) {
            navigate(`/${mod.url}`);
        }
    };

    // Titulo principal del dashboard:
    //  - PLATFORM_ADMIN: muestra "SIGCON" con inicial "S" (marca del sistema)
    //  - Usuario tenant: muestra el nombre de la empresa con su inicial
    const isPlatformAdmin = user?.isPlatformAdmin === true;
    const companyName = user?.companyName || '';
    const brandTitle = isPlatformAdmin ? 'SIGCON' : (companyName || 'SIGCON');
    const brandInitial = (brandTitle.trim()[0] || 'S').toUpperCase();
    const brandSubtitle = isPlatformAdmin
        ? 'Administración de la plataforma'
        : (companyName ? 'SIGCON · Sistema de Gestión Contable' : '');

    return (
        <div className="d-flex flex-column align-items-center w-100" style={{ paddingTop: '1.5rem' }}>
            <div className="text-center mb-5 w-100" style={{ maxWidth: '600px' }}>
                <div className="mb-3 d-flex justify-content-center">
                    <div
                        className="rounded-circle flex-shrink-0"
                        style={{
                            width: '90px',
                            height: '90px',
                            minWidth: '90px',
                            minHeight: '90px',
                            backgroundColor: 'var(--bs-primary)',
                            color: '#fff',
                            fontSize: '2.6rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'visible',
                        }}
                    >
                        <span style={{ lineHeight: 1, display: 'inline-block' }}>{brandInitial}</span>
                    </div>
                </div>
                <h2
                    className="fw-bold mb-1"
                    style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                    title={brandTitle}
                >
                    {brandTitle}
                </h2>
                {brandSubtitle && (
                    <p className="text-muted small mb-2">{brandSubtitle}</p>
                )}
                <h5 className="fw-normal text-muted">
                    Bienvenido, {user?.name ?? ''} {user?.last_name ?? ''}
                </h5>
                <p className="text-muted">Seleccione un modulo para comenzar</p>
            </div>

            {(!modules || modules.length === 0) ? (
                <div className="text-center py-5">
                    <i className="ri-folder-open-line" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                    <p className="mt-3 text-muted">No tiene modulos asignados</p>
                </div>
            ) : (
                // Grid responsivo con ancho minimo fijo por tarjeta para evitar
                // que un solo modulo (p.ej. PLATFORM_ADMIN) quede con texto partido.
                // Cada tarjeta reserva 220px y el contenedor se adapta con flex-wrap.
                <div className="d-flex flex-wrap justify-content-center gap-4" style={{ maxWidth: '1000px' }}>
                    {modules.map((mod) => (
                        <div
                            key={mod.id}
                            className="card shadow-sm border-0"
                            style={{
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                width: '220px',
                                minHeight: '200px',
                            }}
                            onClick={() => handleModuleClick(mod)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-5px)';
                                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '';
                            }}
                        >
                            <div className="card-body text-center py-4 px-3 d-flex flex-column align-items-center">
                                <div
                                    className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                                    style={{
                                        width: '56px',
                                        height: '56px',
                                        backgroundColor: '#e8f0fe',
                                        color: '#1a73e8',
                                    }}
                                >
                                    <i className={mod.icon || 'ri-grid-line'} style={{ fontSize: '1.4rem' }}></i>
                                </div>
                                <h6
                                    className="card-title fw-semibold mb-2"
                                    style={{ fontSize: '0.95rem', wordBreak: 'normal', overflowWrap: 'break-word' }}
                                >
                                    {mod.name}
                                </h6>
                                {mod.description && (
                                    <p
                                        className="card-text text-muted mb-0 text-center"
                                        style={{ fontSize: '0.78rem', lineHeight: 1.3 }}
                                    >
                                        {mod.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Home;
