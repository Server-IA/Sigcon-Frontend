const TextareaModal = ({ id, label, value, onChange, error, placeholder, required = false, disabled = false }) => {
    return (
        <div className="col mb-6 mt-2">
            <label htmlFor={id} className="form-label">{label} {required && <span className="text-danger">*</span>}</label>
            {/* QA Bloque BNK (2026-06-03) Bug A: honrar `disabled`. Antes el textarea
                ignoraba la prop y la Descripcion quedaba editable en el modal "Ver Caja". */}
            <textarea id={id} className="form-control" value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} />
            {error && <small className="text-danger">{error}</small>}
        </div>
    )
}

export default TextareaModal;