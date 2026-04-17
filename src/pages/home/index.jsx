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

    return (
        <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
            <div className="text-center mb-5">
                <div className="mb-3">
                    <div
                        className="d-inline-flex align-items-center justify-content-center rounded-circle"
                        style={{ width: '70px', height: '70px', backgroundColor: 'var(--bs-primary)', color: '#fff', fontSize: '1.8rem', fontWeight: 'bold' }}
                    >
                        S
                    </div>
                </div>
                <h2 className="fw-bold mb-1">SIGCON</h2>
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
                <div className="row g-4 justify-content-center" style={{ maxWidth: '900px' }}>
                    {modules.map((mod) => (
                        <div className="col-6 col-md-4" key={mod.id}>
                            <div
                                className="card h-100 shadow-sm border-0"
                                style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
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
                                <div className="card-body text-center py-4">
                                    <div
                                        className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                                        style={{
                                            width: '56px',
                                            height: '56px',
                                            backgroundColor: '#e8f0fe',
                                            color: '#1a73e8'
                                        }}
                                    >
                                        <i className={mod.icon || 'ri-grid-line'} style={{ fontSize: '1.4rem' }}></i>
                                    </div>
                                    <h6 className="card-title fw-semibold mb-1" style={{ fontSize: '0.95rem' }}>
                                        {mod.name}
                                    </h6>
                                    {mod.description && (
                                        <p className="card-text text-muted mb-0" style={{ fontSize: '0.78rem' }}>
                                            {mod.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Home;
