import { useEffect, useState } from 'react';

// ============================================
// Configuración de módulos con IDs de permisos
// ============================================
const MODULE_CONFIG = {
    'listas-contables': {
        label: 'Listas contables',
        submodules: {
            'listas-contables': {
                label: 'Listas contables',
                permissionIds: { ver: 1, crear: 2, editar: 3, eliminar: 4 }
            }
        }
    },
    'terceros': {
        label: 'Terceros',
        submodules: {
            'terceros': {
                label: 'Terceros',
                permissionIds: { ver: 5, crear: 6, editar: 7, eliminar: 8 }
            }
        }
    },
    'bancos-cajas': {
        label: 'Bancos y cajas',
        submodules: {
            'cuentas-bancarias': {
                label: 'Cuentas bancarias',
                permissionIds: { ver: 9, crear: 10, editar: 11, eliminar: 12 }
            },
            'cajas': {
                label: 'Cajas',
                permissionIds: { ver: 13, crear: 14, editar: 15, eliminar: 16 }
            }
        }
    },
    'cuentas-por-cobrar': {
        label: 'Cuentas por cobrar',
        submodules: {
            'cuentas-por-cobrar': {
                label: 'Cuentas por cobrar',
                permissionIds: { ver: 17, crear: 18, editar: 19, eliminar: 20 }
            }
        }
    },
    'cuentas-por-pagar': {
        label: 'Cuentas por pagar',
        submodules: {
            'cuentas-por-pagar': {
                label: 'Cuentas por pagar',
                permissionIds: { ver: 21, crear: 22, editar: 23, eliminar: 24 }
            }
        }
    },
    'activos': {
        label: 'Activos',
        submodules: {
            'activos': {
                label: 'Activos',
                permissionIds: { ver: 25, crear: 26, editar: 27, eliminar: 28 }
            }
        }
    }
};

const PERMISSION_TYPES = ['ver', 'crear', 'editar', 'eliminar'];

// ============================================
// Helpers
// ============================================
const hasPermission = (permissionIds, permId) => {
    if (!permissionIds || !Array.isArray(permissionIds)) return false;
    return permissionIds.includes(permId);
};

const isModuleEnabled = (permissionIds, config) => {
    return Object.keys(config.submodules).some(subKey => {
        const subConfig = config.submodules[subKey];
        if (!subConfig.permissionIds) return false;
        return PERMISSION_TYPES.some(perm => hasPermission(permissionIds, subConfig.permissionIds[perm]));
    });
};

// ============================================
// Componente principal
// ============================================
const ViewRole = ({ modalRef, role }) => {

    const [expandedModules, setExpandedModules] = useState({});

    const toggleExpand = (moduleKey) => {
        setExpandedModules(prev => ({ ...prev, [moduleKey]: !prev[moduleKey] }));
    };

    useEffect(() => {
        setExpandedModules({});
    }, [role]);

    const permissionIds = role.permissionIds || [];

    const allEnabled = Object.keys(MODULE_CONFIG).every(moduleKey =>
        isModuleEnabled(permissionIds, MODULE_CONFIG[moduleKey])
    );

    return (
        <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
                <div className="modal-content">

                    {/* Header con Rol + ID */}
                    <div className="modal-header">
                        <div className="d-flex align-items-start gap-5">
                            <div>
                                <span className="text-muted" style={{ fontSize: '0.8125rem' }}>Rol</span>
                                <h5 className="fw-bold mb-0">{role.name || '—'}</h5>
                            </div>
                            <div>
                                <span className="text-muted" style={{ fontSize: '0.8125rem' }}>ID</span>
                                <h5 className="fw-bold mb-0">{role.id || '—'}</h5>
                            </div>
                        </div>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>

                    {/* Body */}
                    <div className="modal-body">
                        <div style={{ maxHeight: '450px', overflowY: 'auto' }}>

                            {/* Todos los permisos */}
                            <div className="d-flex align-items-center justify-content-between py-3 border-bottom">
                                <span className="fw-bold">Todos los permisos</span>
                                <div className="form-check form-switch mb-0">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={allEnabled}
                                        disabled
                                    />
                                </div>
                            </div>

                            {/* Módulos */}
                            {Object.keys(MODULE_CONFIG).map(moduleKey => {
                                const config = MODULE_CONFIG[moduleKey];
                                const moduleEnabled = isModuleEnabled(permissionIds, config);
                                const expanded = expandedModules[moduleKey] || false;
                                const subKeys = Object.keys(config.submodules);
                                const hasMultipleSubs = subKeys.length > 1;

                                return (
                                    <div key={moduleKey} className="border-bottom">
                                        {/* Header del módulo */}
                                        <div className="d-flex align-items-center justify-content-between py-3">
                                            <div
                                                className="d-flex align-items-center"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => toggleExpand(moduleKey)}
                                            >
                                                <i
                                                    className={`ri-arrow-${expanded ? 'down' : 'right'}-s-line me-2`}
                                                    style={{ fontSize: '1.1rem', color: '#6c757d' }}
                                                ></i>
                                                <span className="fw-semibold">{config.label}</span>
                                            </div>
                                            <div className="form-check form-switch mb-0">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    checked={moduleEnabled}
                                                    disabled
                                                />
                                            </div>
                                        </div>

                                        {/* Subpermisos expandidos */}
                                        {expanded && (
                                            <div className="ps-4 pb-3">
                                                {subKeys.map(subKey => {
                                                    const subConfig = config.submodules[subKey];

                                                    return (
                                                        <div key={subKey} className={`d-flex align-items-center ${hasMultipleSubs ? 'mb-2' : ''}`}>
                                                            {hasMultipleSubs && (
                                                                <span className="text-muted me-auto" style={{ fontSize: '0.875rem', minWidth: '140px' }}>
                                                                    {subConfig.label}
                                                                </span>
                                                            )}
                                                            <div className={`d-flex align-items-center ${!hasMultipleSubs ? 'ms-auto' : ''}`} style={{ gap: '1rem' }}>
                                                                {PERMISSION_TYPES.map(perm => (
                                                                    <div key={perm} className="form-check form-switch mb-0 d-flex align-items-center" style={{ gap: '0.25rem' }}>
                                                                        <input
                                                                            className="form-check-input"
                                                                            type="checkbox"
                                                                            checked={hasPermission(permissionIds, subConfig.permissionIds[perm])}
                                                                            disabled
                                                                        />
                                                                        <label className="form-check-label text-muted" style={{ fontSize: '0.8125rem' }}>
                                                                            {perm.charAt(0).toUpperCase() + perm.slice(1)}
                                                                        </label>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="modal-footer justify-content-start">
                        <button type="button" className="btn btn-danger ms-auto" data-bs-dismiss="modal">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewRole;