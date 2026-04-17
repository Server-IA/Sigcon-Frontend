import { useEffect, useState } from 'react';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';

/**
 * Pagina de Libro Mayor (CG).
 * Muestra saldos acumulados por cuenta PUC para un periodo dado.
 * Permite filtrar opcionalmente por una cuenta especifica.
 * Llama a GET /api/v1/cg/books/mayor?year=&month=&accountId=
 */

/** Formatea valores monetarios en formato colombiano. */
const formatCurrency = (val) => {
    if (val === null || val === undefined || val === 0) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

/** Genera opciones de anios (ultimos 5 anios + 1 futuro). */
const getYearOptions = () => {
    const current = new Date().getFullYear();
    const years = [];
    for (let y = current + 1; y >= current - 5; y--) {
        years.push(y);
    }
    return years;
};

/** Retorna nombre del mes capitalizado en espanol. */
const getMonthLabel = (m) => {
    const name = new Date(2000, m - 1).toLocaleString('es-CO', { month: 'long' });
    return name.charAt(0).toUpperCase() + name.slice(1);
};

const CgLibroMayor = () => {
    const [year, setYear]               = useState(new Date().getFullYear());
    const [month, setMonth]             = useState(new Date().getMonth() + 1);
    const [accountId, setAccountId]     = useState('');
    const [accountsCatalog, setAccountsCatalog] = useState([]);
    const [accounts, setAccounts]       = useState([]);
    const [loading, setLoading]         = useState(false);
    const [generated, setGenerated]     = useState(false);
    const [message, setMessage]         = useState({ message: '', type: '', show: false });

    /** Carga el catalogo de cuentas contables una sola vez para el filtro. */
    useEffect(() => {
        (async () => {
            try {
                const resp = await fetchHelper.post(
                    base_url(['api', 'v1', 'accounting-accounts']),
                    { start: 0, length: -1, draw: 1 },
                    {}, 1000, true
                );
                const payload = resp?.data || resp;
                const list = (payload?.data || payload || []).map(a => {
                    const pucCode = a.pucAccount?.code || a.pucCode || a.code || '';
                    const label   = a.customName || a.pucAccount?.name || a.name || 'Sin nombre';
                    return {
                        id: a.id,
                        label: pucCode ? `${pucCode} - ${label}` : label,
                    };
                });
                setAccountsCatalog(list);
            } catch (e) {
                setAccountsCatalog([]);
            }
        })();
    }, []);

    /** Consulta los datos del libro mayor al backend. */
    const handleGenerate = async () => {
        setLoading(true);
        setGenerated(false);
        setAccounts([]);
        try {
            let url = base_url(['api', 'v1', 'cg', 'books', 'mayor']) + `?year=${year}&month=${month}`;
            if (accountId) url += `&accountId=${accountId}`;
            const { data, error } = await fetchHelper.get(url, {}, 0);
            if (!error) {
                const items = Array.isArray(data) ? data : (data?.data || []);
                setAccounts(items);
                setGenerated(true);
                if (items.length === 0) {
                    setMessage({ type: 'warning', show: true, message: 'No se encontraron registros para el periodo seleccionado.' });
                }
            } else {
                setMessage({ type: 'danger', show: true, message: 'Error al consultar el libro mayor.' });
            }
        } catch (err) {
            setMessage({ type: 'danger', show: true, message: err?.msg || 'Error al consultar el libro mayor.' });
        } finally {
            setLoading(false);
        }
    };

    /** Calcula totales. */
    const totalDebits  = accounts.reduce((sum, a) => sum + (Number(a.totalDebits) || 0), 0);
    const totalCredits = accounts.reduce((sum, a) => sum + (Number(a.totalCredits) || 0), 0);
    const totalBalance = accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

    return (
        <div className="card">
            <h5 className="card-header text-md-start text-center">Libro Mayor</h5>

            <AlertPage
                type={message.type}
                message={message.message}
                show={message.show}
                onChange={() => setMessage({ message: '', type: '', show: false })}
            />

            <div className="card-body">
                {/* Filtros compactos */}
                <div className="row mb-4">
                    <div className="col-md-2 mb-2">
                        <label className="form-label">Año</label>
                        <select className="form-select" value={year} onChange={e => setYear(Number(e.target.value))}>
                            {getYearOptions().map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-2 mb-2">
                        <label className="form-label">Mes</label>
                        <select className="form-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                                <option key={m} value={m}>{getMonthLabel(m)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-4 mb-2">
                        <label className="form-label">Cuenta</label>
                        <select
                            className="form-select"
                            value={accountId}
                            onChange={e => setAccountId(e.target.value)}
                        >
                            <option value="">Todas las cuentas</option>
                            {accountsCatalog.map(a => (
                                <option key={a.id} value={a.id}>{a.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3 mb-2 d-flex align-items-end gap-2">
                        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
                            {loading ? (
                                <><span className="spinner-border spinner-border-sm me-2" />Generando...</>
                            ) : (
                                <><i className="ri-search-line me-1" />Generar</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Resultados */}
                {generated && accounts.length > 0 && (
                    <>
                        {/* Badges de resumen */}
                        <div className="mb-3 d-flex gap-2 flex-wrap">
                            <span className="badge bg-label-primary">Cuentas: {accounts.length}</span>
                            <span className="badge bg-label-success">Debito: {formatCurrency(totalDebits)}</span>
                            <span className="badge bg-label-info">Credito: {formatCurrency(totalCredits)}</span>
                            <span className={`badge ${totalDebits === totalCredits ? 'bg-label-success' : 'bg-label-danger'}`}>
                                {totalDebits === totalCredits ? 'Cuadrado' : 'Descuadrado'}
                            </span>
                        </div>

                        <div className="table-responsive">
                            <table className="table table-bordered table-striped table-hover">
                                <thead className="table-light">
                                    <tr>
                                        <th>Cuenta PUC</th>
                                        <th>Nombre Cuenta</th>
                                        <th className="text-end">Total Debitos</th>
                                        <th className="text-end">Total Creditos</th>
                                        <th className="text-end">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.map((a, idx) => (
                                        <tr key={idx}>
                                            <td>{a.accountCode || a.pucCode || '-'}</td>
                                            <td>{a.accountName || a.pucName || '-'}</td>
                                            <td className="text-end">{formatCurrency(a.totalDebits)}</td>
                                            <td className="text-end">{formatCurrency(a.totalCredits)}</td>
                                            <td className="text-end fw-bold">{formatCurrency(a.balance)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="table-light fw-bold">
                                    <tr>
                                        <td colSpan="2" className="text-end">TOTALES:</td>
                                        <td className="text-end">{formatCurrency(totalDebits)}</td>
                                        <td className="text-end">{formatCurrency(totalCredits)}</td>
                                        <td className="text-end">{formatCurrency(totalBalance)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </>
                )}

                {generated && accounts.length === 0 && (
                    <div className="text-center py-4 text-muted">
                        <i className="ri-file-search-line ri-2x mb-2 d-block" />
                        No se encontraron registros para el periodo seleccionado.
                    </div>
                )}
            </div>
        </div>
    );
};

export default CgLibroMayor;
