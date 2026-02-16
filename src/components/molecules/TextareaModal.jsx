const TextareaModal = ({ id, label, value, onChange, error, placeholder, required = false }) => {
    return (
        <div className="col mb-6 mt-2">
            <label htmlFor={id} className="form-label">{label} {required && <span className="text-danger">*</span>}</label>
            <textarea id={id} className="form-control" value={value} onChange={onChange} placeholder={placeholder} />
            {error && <small className="text-danger">{error}</small>}
        </div>
    )
}

export default TextareaModal;