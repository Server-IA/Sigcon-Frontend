/**
 * Modal de alta atómica empresa + primer admin (HU-PLAT-02).
 *
 * Envía un solo POST a `/api/platform/companies/with-admin` con el payload:
 * ```
 * {
 *   company: { nit, dv, businessName, legalRepresentative, email, phone, address },
 *   adminFirstName, adminLastName, adminEmail, adminUsername, adminPassword
 * }
 * ```
 * El backend (CompanyService.createWithAdmin) ejecuta en UNA transacción:
 * 1. Valida NIT único entre empresas activas.
 * 2. Valida email y username únicos entre usuarios.
 * 3. Crea la Company (con auto-provision de periodos + mapeos + CC).
 * 4. Crea el User con role=ADMIN, company_id=empresa_nueva, platform_role=null.
 * Si cualquier paso falla, rollback total — no deja empresa huérfana.
 *
 * Tras éxito, el componente padre cierra el modal y recarga el listado.
 */
import { useState } from 'react';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

const emptyForm = {
    company: { nit: '', dv: '', businessName: '', legalRepresentative: '', email: '', phone: '', address: '' },
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminUsername: '',
    adminPassword: '',
};

const CreateCompanyModal = ({ onClose, onCreated }) => {
    const [form, setForm] = useState(emptyForm);
    const [err, setErr] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const setCompanyField = (field) => (e) => setForm(f => ({
        ...f, company: { ...f.company, [field]: e.target.value }
    }));
    const setAdminField = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setErr(null);
        // Pendientes PA 2026-05-30 (PA-RF-PLAT-01): razon social <=200 chars y
        // caracteres permitidos = letras, numeros, espacios y los simbolos & . ( ) /.
        const razon = (form.company.businessName || '').trim();
        if (razon.length > 200) {
            setErr('La razón social no puede superar 200 caracteres.');
            return;
        }
        if (razon && !/^[\p{L}\p{N} &.()/]+$/u.test(razon)) {
            setErr('La razón social solo admite letras, números, espacios y los símbolos & . ( ) /');
            return;
        }
        setSubmitting(true);
        try {
            await fetchHelper.post(
                base_url(['api', 'platform', 'companies', 'with-admin']),
                form,
                {},
                1000,
            );
            onCreated();
        } catch (e2) {
            setErr(e2?.msg || 'Error creando empresa + admin');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <form onSubmit={submit}>
                        <div className="modal-header">
                            <h5 className="modal-title">Crear empresa + primer admin</h5>
                            <button type="button" className="btn-close" onClick={onClose} disabled={submitting} />
                        </div>
                        <div className="modal-body">
                            {err && <div className="alert alert-danger py-2">{err}</div>}

                            <h6 className="text-muted mb-3">Datos de la empresa</h6>
                            <div className="row g-2 mb-3">
                                <div className="col-md-4">
                                    <label className="form-label">NIT *</label>
                                    <input type="text" className="form-control" required
                                           value={form.company.nit} onChange={setCompanyField('nit')} />
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label">DV</label>
                                    <input type="text" maxLength={1} className="form-control"
                                           value={form.company.dv} onChange={setCompanyField('dv')} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Razón social *</label>
                                    <input type="text" className="form-control" required maxLength={200}
                                           value={form.company.businessName} onChange={setCompanyField('businessName')} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Representante legal</label>
                                    <input type="text" className="form-control"
                                           value={form.company.legalRepresentative} onChange={setCompanyField('legalRepresentative')} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Correo corporativo *</label>
                                    <input type="email" className="form-control" required
                                           value={form.company.email} onChange={setCompanyField('email')} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Teléfono principal *</label>
                                    <input type="text" className="form-control" required
                                           value={form.company.phone} onChange={setCompanyField('phone')} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Dirección principal *</label>
                                    <input type="text" className="form-control" required
                                           value={form.company.address} onChange={setCompanyField('address')} />
                                </div>
                            </div>

                            <h6 className="text-muted mb-3">Primer administrador de la empresa</h6>
                            <div className="row g-2">
                                <div className="col-md-6">
                                    <label className="form-label">Nombre *</label>
                                    <input type="text" className="form-control" required
                                           value={form.adminFirstName} onChange={setAdminField('adminFirstName')} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Apellido *</label>
                                    <input type="text" className="form-control" required
                                           value={form.adminLastName} onChange={setAdminField('adminLastName')} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Email *</label>
                                    <input type="email" className="form-control" required
                                           value={form.adminEmail} onChange={setAdminField('adminEmail')} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Username *</label>
                                    <input type="text" className="form-control" required minLength={3}
                                           value={form.adminUsername} onChange={setAdminField('adminUsername')} />
                                </div>
                                <div className="col-md-12">
                                    <label className="form-label">Password *</label>
                                    <input type="password" className="form-control" required minLength={8}
                                           value={form.adminPassword} onChange={setAdminField('adminPassword')} />
                                    <small className="text-muted">
                                        Mínimo 8 caracteres, con al menos una mayúscula, un número y un símbolo
                                        (PA-RF-01). El admin podrá cambiarla tras el primer login.
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={submitting}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting ? 'Creando...' : 'Crear empresa + admin'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateCompanyModal;
