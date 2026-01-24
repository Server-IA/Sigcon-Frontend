const Checkbox = ({ 
  id, 
  label, 
  checked, 
  onChange,
  name 
}) => {
  return (
    <label className="checkbox-container">
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        onChange={onChange}
        className="checkbox-input"
      />
      <span className="checkbox-label">{label}</span>
    </label>
  );
};

export default Checkbox;