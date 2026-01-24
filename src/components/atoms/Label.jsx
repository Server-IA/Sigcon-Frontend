const Label = ({ children, htmlFor, required = false }) => {
  return (
    <label htmlFor={htmlFor} className="label">
      {children}
      {required && <span className="label-required">*</span>}
    </label>
  );
};

export default Label;