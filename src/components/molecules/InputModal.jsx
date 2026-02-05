const InputModal = ({ type, id, label, value, onChange, error, placeholder }) => {

    return (
        <div className="form-floating form-floating-outline">
            <input
                type={type}
                id={id}
                className={`form-control ${error ? 'is-invalid' : ''}`}
                placeholder={placeholder}
                value={value ?? ''}
                onChange={onChange}
            />
            <label htmlFor={id}>{label}</label>
            {error && <div className="invalid-feedback">{error}</div>}
        </div>
    )
}

export default InputModal;