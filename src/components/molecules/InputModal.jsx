const InputModal = ({ type, id, label, value, onChange, error, placeholder, disabled = false, required = false, readOnly = false, maxLength, inputMode, pattern}) => {

    return (
        <div className="form-floating form-floating-outline">
            <input
                type={type}
                id={id}
                className={`form-control ${error ? 'is-invalid' : ''} ${required ? 'required' : ''}`}
                placeholder={placeholder}
                value={value ?? ''}
                onChange={onChange}
                disabled={disabled}
                readOnly={readOnly}
                {...(maxLength ? { maxLength } : {})}
                {...(inputMode ? { inputMode } : {})}
                {...(pattern ? { pattern } : {})}
            />
            <label htmlFor={id}>{label} {required && <span className="text-danger">*</span>}</label>
            {error && <div className="invalid-feedback">{error}</div>}
        </div>
    )
}

export default InputModal;