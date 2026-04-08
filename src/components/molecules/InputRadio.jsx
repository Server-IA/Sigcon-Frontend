const InputRadio = ({
    id,
    label,
    name,
    value,
    checked = false,
    onChange,
}) => {
    const stringValue =
        typeof value === "boolean" ? String(value) : value ?? "";

    return (
        <div className="form-check form-check-inline mt-4">
            <input
                className="form-check-input"
                type="radio"
                name={name}
                id={id}
                value={stringValue}
                checked={checked}
                onChange={onChange}
            />
            <label className="form-check-label" htmlFor={id}>
                {label}
            </label>
        </div>
    );
};

export default InputRadio;
